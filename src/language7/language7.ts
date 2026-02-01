import { PositionC, PositionManager } from "../distill/hopefox_c"
import { PositionMaterializer } from "../language6/engine6"
import { Engine7, InputSlice, Invariant, InvariantResult, ReadContext, Resolver, ResolverOutput, Row, Transaction } from "./engine7"

export function Language7(m: PositionManager, pos: PositionC) {

    let mz = new PositionMaterializer(m, pos)

    let engine = new Engine7()

    // forced_seen: root world
    engine.registerRelation('forced_seen')
    // worlds: root parent world
    engine.registerRelation('worlds')

    // forced_frontier: root world
    engine.registerRelation('forced_frontier')

    // forced_defender_reply: root parent reply
    engine.registerRelation('forced_defender_reply')

    // forced_attacker_move: root parent next
    engine.registerRelation('forced_attacker_move')

    // forced_reachable: root world
    engine.registerRelation('forced_reachable')

    engine.registerResolver(new HypothesisRoot(mz))
    engine.registerResolver(new ForcedReachable(mz))
    engine.registerResolver(new ForcedFrontier(mz))
    engine.registerResolver(new ForcedDefenderReply(mz))
    engine.registerResolver(new ForcedAttackerMove(mz))
    engine.registerResolver(new ForcedReachable(mz))

    engine.registerResolver(new ExpandWorldsResolver(mz))

    engine.registerInvariant(new MateInevitable(mz))



    const bootstrapTx: Transaction = {
        source: 'bootstrap',
        reads: [],
        writes: [{
                relation: 'forced_reachable',
                rows: [
                    {
                        root: 0,
                        world: 0
                    }
                ]
            }
        ]
    }

    const committed = engine.commit(bootstrapTx)
    engine.scheduleDownstream(committed)



    engine.run()

    return engine.query_invariants()
}


class HypothesisRoot implements  Resolver {
    id: 'hypothesis_root'

    inputRelations = ['candidate_attack_move']

    constructor(private mz: PositionMaterializer) {}

    resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null {
        const output: Row[] = []

        for (let c of input.rows) {
            let root = this.mz.add_move(c.parent, c.move)

            output.push({
                root
            })
        }

        return { hypothesis_root: output }
    }

}

class ForcedReachable implements  Resolver {
    id: 'forced_reachable'

    inputRelations = ['forced_reachable']

    constructor(private mz: PositionMaterializer) {}

    resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null {
        const output: Row[] = []

        for (let c of input.rows) {
            if (!this.mz.is_defender(c.world)) {
                continue
            }

            let wPrimes = this.mz.generate_legal_moves(c.world)

            for (let wPrime of wPrimes) {
                let replies = ctx.get('forced_defender_reply')
                    .filter(_ => _.root === c.root && _.parent === c.world && _.reply === wPrime)
                
                for (let reply of replies) {
                    output.push({
                        root: c.root,
                        world: wPrime
                    })
                }
            }
        }



        for (let c of input.rows) {
            if (!this.mz.is_attacker(c.world)) {
                continue
            }

            let wPrimes = this.mz.generate_legal_moves(c.world)

            for (let wPrime of wPrimes) {
                let replies = ctx.get('forcing_attacker_move')
                    .filter(_ => _.root === c.root && _.parent === c.world && _.next === wPrime)
                
                for (let reply of replies) {
                    output.push({
                        root: c.root,
                        world: wPrime
                    })
                }
            }
        }


        return { forced_reachable: output }
    }
}

class ForcedFrontier implements  Resolver {
    id: 'forced_frontier'

    inputRelations = ['forced_reachable']

    constructor(private mz: PositionMaterializer) {}

    resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null {
        const output: Row[] = []

        for (let c of input.rows) {
            let seen = ctx.get('forced_seen')
                .filter(_ => _.root === c.root && _.world === c.world)

            if (seen.length === 0) {
                output.push({
                    root: c.root,
                    world: c.world
                })
            }
        }

        return { forced_frontier: output }
    }
}

class ForcedDefenderReply implements  Resolver {
    id: 'forced_defender_reply'

    inputRelations = ['forced_reachable']

    constructor(private mz: PositionMaterializer) {}

    resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null {
        const output: Row[] = []

        for (let c of input.rows) {

            if (!this.mz.is_defender(c.world)) {
                continue
            }

            if (!this.mz.m.is_check(c.world)) {
                continue
            }

            let wPrimes = ctx.get('worlds')
                .filter(_ => _.root === c.root && _.parent === c.world)

            for (let wPrime of wPrimes) {
                if (this.mz.m.is_check(wPrime.world)) {
                    continue
                }

                output.push({
                    root: c.root,
                    parent: wPrime.parent,
                    reply: wPrime.world
                })
            }
        }

        return { forced_defender_reply: output }
    }
}


// root parent next
class ForcedAttackerMove implements  Resolver {
    id: 'forced_attacker_move'

    inputRelations = ['forced_reachable']

    constructor(private mz: PositionMaterializer) {}

    resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null {
        const output: Row[] = []

        for (let c of input.rows) {

            if (!this.mz.is_attacker(c.world)) {
                continue
            }

            let wPrimes = ctx.get('worlds')
                .filter(_ => _.root === c.root && _.parent === c.world)

            for (let wPrime of wPrimes) {
                if (!this.mz.m.is_check(wPrime.world) || !this.mz.m.is_checkmate(wPrime.world)) {
                    continue
                }

                output.push({
                    root: c.root,
                    parent: wPrime.parent,
                    next: wPrime.world
                })
            }
        }

        return { forced_attacker_move: output }
    }
}




class MateInevitable implements Invariant {
    id = 'mate_inevitable'

    constructor(private mz: PositionMaterializer) {}

    evaluate(ctx: ReadContext): InvariantResult {

        let reachable = ctx.get('forced_reachable')

        let witnesses = []
        let holds = true
        for (let r of reachable) {
            if (!this.mz.m.is_checkmate(r.world)) {
                holds = false
                witnesses = []
                break
            }
            witnesses.push(r.world)
        }


        return {
            holds,
            witnesses
        }
    }

}

class ExpandWorldsResolver implements Resolver {
    id = 'expand_worlds'

    inputRelations = ['forced_frontier']

    constructor(private mz: PositionMaterializer) {}

    resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null {
        const output: Row[] = []

        for (let c of input.rows) {
            let legals = this.mz.generate_legal_moves(c.world)


            for (let legal of legals) {
                let world = this.mz.add_move(c.root, legal)
                output.push({
                    root: c.root,
                    parent: c.world,
                    world
                })
            }

        }

        return { worlds: output }
    }

}
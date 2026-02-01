import { PositionMaterializer } from "../language6/engine6"
import { Engine7, InputSlice, Invariant, InvariantResult, Judgement, ReadContext, Resolver, ResolverOutput, Row, Transaction } from "./engine7"

export function Language7(mz: PositionMaterializer) {


    let engine = new Engine7()

    // forced_seen: root world
    engine.registerRelation('forced_seen')
    // worlds: root parent world
    engine.registerRelation('worlds')

    // forced_frontier: root world
    engine.registerRelation('forced_frontier')

    // forced_defender_reply: root parent reply
    engine.registerRelation('forced_defender_reply')

    // forcing_attacker_move: root parent next
    engine.registerRelation('forcing_attacker_move')

    // forced_reachable: root world
    engine.registerRelation('forced_reachable')

    // candidate_attack_move: parent move
    engine.registerRelation('candidate_attack_move')

    // hypothesis_root: root world
    engine.registerRelation('hypothesis_root')


    // terminal_forced: root world
    engine.registerRelation('terminal_forced')

    engine.registerResolver(new ExpandWorldsResolver(mz))

    engine.registerResolver(new HypothesisRoot(mz))
    engine.registerResolver(new ForcedReachable(mz))
    engine.registerResolver(new ForcedFrontier(mz))
    engine.registerResolver(new ForcedDefenderReply(mz))
    engine.registerResolver(new ForcingAttackerMove(mz))
    engine.registerResolver(new ForcedReachable(mz))

    engine.registerJudgement(new TerminalForced(mz))

    engine.registerInvariant(new MateInevitable(mz))


    const candidate_attack_move: Row[] = candidate_attack_moves(mz)

    const bootstrapTx: Transaction = {
        source: 'bootstrap',
        reads: [],
        writes: [{
                relation: 'candidate_attack_move',
                rows: candidate_attack_move
            }
        ]
    }

    const committed = engine.commit(bootstrapTx)
    engine.scheduleDownstream(committed)

    engine.run()

    //console.log(engine.relations.get('forced_reachable')!.rows)

    return engine.query_invariants()
}

function candidate_attack_moves(mz: PositionMaterializer) {
    let output = []

    let parent = 0

    let moves = mz.generate_legal_moves(parent)

    for (let move of moves) {
        if (!mz.is_check(mz.add_move(parent, move))) {

            continue
        }

        output.push({
            parent,
            move
        })
    }

    return output
}

class HypothesisRoot implements  Resolver {
    id = 'hypothesis_root'

    inputRelations = ['candidate_attack_move']

    constructor(private mz: PositionMaterializer) {}

    resolve(input: InputSlice, ctx: ReadContext): ResolverOutput | null {
        const output: Row[] = []
        const forced_reachable: Row[] = []

        for (let c of input.rows) {
            let root = this.mz.add_move(c.parent, c.move)

            output.push({
                root
            })

            forced_reachable.push({
                root,
                world: root
            })
        }

        return { hypothesis_root: output, forced_reachable }
    }
}

class ForcedReachable implements  Resolver {
    id = 'forced_reachable'

    inputRelations = ['forced_reachable', 'forced_defender_reply', 'forcing_attacker_move']

    constructor(private mz: PositionMaterializer) {}

    resolve(input: InputSlice, ctx: ReadContext): ResolverOutput | null {
        const output: Row[] = []

        let forced_reachable: Row[],
            forced_defender_reply: Row[],
            forcing_attacker_move: Row[]

        if (input.relation === 'forced_reachable') {
            forced_reachable = input.rows
            forced_defender_reply = ctx.get('forced_defender_reply')
            forcing_attacker_move = ctx.get('forcing_attacker_move')
        } else if (input.relation === 'forced_defender_reply') {
            forced_defender_reply = input.rows
            forced_reachable = ctx.get('forced_reachable')!
            forcing_attacker_move = ctx.get('forcing_attacker_move')
        } else if (input.relation === 'forcing_attacker_move') {
            forcing_attacker_move = input.rows
            forced_reachable = ctx.get('forced_reachable')!
            forced_defender_reply = ctx.get('forced_defender_reply')
        } else {
            throw 'Unreachable'
        }

        for (let c of forced_reachable) {
            if (!this.mz.is_defender(c.world)) {
                continue
            }

            let wPrimes = this.mz.generate_legal_worlds(c.world)

            for (let wPrime of wPrimes) {
                let replies = forced_defender_reply
                    .filter(_ => _.root === c.root && _.parent === c.world && _.reply === wPrime)
                
                for (let reply of replies) {
                    output.push({
                        root: c.root,
                        world: wPrime
                    })
                }
            }
        }



        for (let c of forced_reachable) {
            if (!this.mz.is_attacker(c.world)) {
                continue
            }

            let wPrimes = this.mz.generate_legal_worlds(c.world)

            for (let wPrime of wPrimes) {
                let replies = forcing_attacker_move
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
    id = 'forced_frontier'

    inputRelations = ['forced_reachable']

    constructor(private mz: PositionMaterializer) {}

    resolve(input: InputSlice, ctx: ReadContext): ResolverOutput | null {
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
    id = 'forced_defender_reply'

    inputRelations = ['forced_reachable', 'worlds']

    constructor(private mz: PositionMaterializer) {}

    resolve(input: InputSlice, ctx: ReadContext): ResolverOutput | null {
        const output: Row[] = []

        let forced_reachable: Row[], worlds: Row[]
        if (input.relation === 'worlds') {
            forced_reachable = ctx.get('forced_reachable')!
            worlds = input.rows
        } else if (input.relation === 'forced_reachable') {
            worlds = ctx.get('worlds')!
            forced_reachable = input.rows
        } else {
            throw 'Unreachable'
        }


        for (let c of forced_reachable) {

            if (!this.mz.is_defender(c.world)) {
                continue
            }

            if (!this.mz.is_check(c.world)) {
                continue
            }

            let wPrimes = worlds
                .filter(_ => _.root === c.root && _.parent === c.world)

            for (let wPrime of wPrimes) {
                if (this.mz.is_check(wPrime.world)) {
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
class ForcingAttackerMove implements  Resolver {
    id = 'forcing_attacker_move'

    inputRelations = ['forced_reachable', 'worlds']

    constructor(private mz: PositionMaterializer) {}

    resolve(input: InputSlice, ctx: ReadContext): ResolverOutput | null {
        const output: Row[] = []


        let forced_reachable: Row[], worlds: Row[]
        if (input.relation === 'worlds') {
            forced_reachable = ctx.get('forced_reachable')!
            worlds = input.rows
        } else if (input.relation === 'forced_reachable') {
            worlds = ctx.get('worlds')!
            forced_reachable = input.rows
        } else {
            throw 'Unreachable'
        }



        for (let c of forced_reachable) {

            if (!this.mz.is_attacker(c.world)) {
                continue
            }

            let wPrimes = worlds
                .filter(_ => _.root === c.root && _.parent === c.world)

            for (let wPrime of wPrimes) {
                if (!this.mz.is_check(wPrime.world) || !this.mz.is_checkmate(wPrime.world)) {
                    continue
                }

                output.push({
                    root: c.root,
                    parent: wPrime.parent,
                    next: wPrime.world
                })
            }
        }

        return { forcing_attacker_move: output }
    }
}




class MateInevitable implements Invariant {
    id = 'mate_inevitable'

    constructor(private mz: PositionMaterializer) {}

    evaluate(ctx: ReadContext): InvariantResult {

        let terminals = ctx.get('terminal_forced')

        let witnesses = []
        let holds = false
        for (let r of terminals) {
            if (!this.mz.is_checkmate(r.world)) {
                holds = false
                witnesses = []
                break
            }
            witnesses.push(r.world)
            holds = true
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

    resolve(input: InputSlice, ctx: ReadContext): ResolverOutput | null {
        const output: Row[] = []

        for (let c of input.rows) {
            let legal_worlds = this.mz.generate_legal_worlds(c.world)


            for (let world of legal_worlds) {
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



class TerminalForced implements Judgement {
    id = 'terminal_forced'

    inputRelations = ['forced_reachable', 'forced_defender_reply', 'forcing_attacker_move']

    constructor(private mz: PositionMaterializer) {}

    judge(ctx: ReadContext): ResolverOutput | null {
        const output: Row[] = []

        let forced_reachable = ctx.get('forced_reachable')
        let forced_defender_reply = ctx.get('forced_defender_reply')
        let forcing_attacker_move = ctx.get('forcing_attacker_move')

        for (let c of forced_reachable) {
            if (!this.mz.is_defender(c.world)) {
                continue
            }

            let replies = forced_defender_reply
                .filter(_ => _.root === c.root && _.parent === c.world)

            if (replies.length === 0) {
                output.push({
                    root: c.root,
                    world: c.world
                })
            }
        }

        for (let c of forced_reachable) {
            if (!this.mz.is_attacker(c.world)) {
                continue
            }

            let moves = forcing_attacker_move
                .filter(_ => _.root === c.root && _.parent === c.world)


            if (moves.length === 0) {
                output.push({
                    root: c.root,
                    world: c.world
                })
            }
        }

        return { terminal_forced: output }
    }

}
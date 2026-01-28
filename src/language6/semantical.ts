import { MoveC, PositionC, PositionManager } from "../distill/hopefox_c";
import { CoreProgram, lowerCoreToEngine } from "./core";
import { analyseProgram } from "./diagnostics";
import { InputSlice, makeRelation, MyEngine, PositionMaterializer, ReadContext, Resolver, ResolverOutput, Row, Transaction } from "./engine6";

export function Semantical7(m: PositionManager, pos: PositionC) {

    let { node }  = analyseProgram(`
idea "Knight Fork"
  move knight from e5 to f7
`)

    let mz = new PositionMaterializer(m, pos)

    let graph = lowerCoreToEngine(node!)
    let engine = new MyEngine(graph)


    engine.relations.set('worlds', makeRelation('worlds', []))
    engine.relations.set('in_check', makeRelation('in_check', []))


    engine.relations.set('forced_replies', makeRelation('forces_replies', []))
    engine.relations.set('checkmate', makeRelation('checkmate', []))
    engine.relations.set('only_reply', makeRelation('only_reply', []))
    engine.relations.set('forced_step', makeRelation('forced_step', []))
    engine.relations.set('forced_reachable', makeRelation('forced_reachable', []))
    engine.relations.set('mate_inevitable', makeRelation('mate_inevitable', []))

    engine.registerResolver(new InCheck(mz))

    engine.registerResolver(new ForcedReplies(mz))
    engine.registerResolver(new Checkmate())
    engine.registerResolver(new OnlyReply())
    engine.registerResolver(new ForcedStep(mz))
    engine.registerResolver(new ForcedReachable())

    engine.registerResolver(new MateInevitable(mz))

    engine.registerResolver(new ExpandForcedWorlds(mz))

    const bootstrapTx: Transaction = {
        world_id: 0,
        source: 'bootstrap',
        reads: [],
        writes: [{
                relation: 'worlds',
                rows: [
                    {
                        world_id: 0,
                        depth: 0
                    }
                ]
            }
        ]
    }

    const committed = engine.commit(bootstrapTx)
    engine.scheduleDownstream(committed)

    engine.run()

    let rows = engine.relations.get('worlds')!.rows
    //rows = engine.relations.get('checkmate')!.rows
    rows = engine.relations.get('mate_inevitable')!.rows


    return rows.map(_ => mz.nodes.history_moves(_.world_id))
}


class InCheck implements Resolver {
    id = 'in_check'

    inputRelations = ['worlds']

    constructor(private mz: PositionMaterializer) {}

    resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null {
        const output: Row[] = []

        for (const w of input.rows) {
            this.mz.make_to_world(w.world_id)

            if (this.mz.m.pos_in_check(this.mz.pos)) {
                output.push({
                    world_id: w.world_id
                })
            }

            this.mz.unmake_world(w.world_id)
        }
        return { in_check: output }
    }


}

class ForcedReplies implements Resolver {
    id = 'forced_replies'

    inputRelations = ['worlds']

    constructor(private mz: PositionMaterializer) {}

    resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null {

        const output: Row[] = []

        for (let w of input.rows) {
            this.mz.make_to_world(w.world_id)
            const replies = this.mz.m.get_legal_moves(this.mz.pos)
            this.mz.unmake_world(w.world_id)


            const filtered = replies.filter(m => {
                const w2 = this.mz.add_move(w.world_id, m)

                /*
                const in_check = ctx.get('in_check', w2).length > 0

                if (in_check) {
                    return true
                }
                    */

                this.mz.make_to_world(w2)
                const in_check = this.mz.m.pos_in_check(this.mz.pos)
                this.mz.unmake_world(w2)

                if (in_check) {
                    return true
                }

                // later add forcedness relations

                return false
            })

            output.push(...filtered.map(_ => ({
                world_id: w.world_id,
                move: _
            })))

        }
        return { forced_replies: output }
    }

}


class Checkmate implements Resolver {
    id = 'checkmate'

    inputRelations = ['in_check']


    resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null {
        const output = []

        for (const w of input.rows) {
            if (ctx.get('forced_replies', w.world_id).length === 0) {
                output.push({
                    world_id: w.world_id
                })
            }
        }

        return { checkmate: output }
    }

}


class OnlyReply implements Resolver {
    id = 'only_reply'

    inputRelations = ['forced_replies']


    resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null {

        const replies = input.rows

        if (replies.length === 1) {
            return { only_reply: replies }
        }

        return null
    }

}

interface OnlyReplyRow extends Row {
    move: MoveC
}


class ExpandForcedWorlds implements Resolver {
    id = 'expand_forced_worlds'

    inputRelations = ['only_reply']

    constructor(private mz: PositionMaterializer) {}

    resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null {
        const output = []

        for (const w of input.rows) {
            output.push({
                world_id: w.world_id
            })
        }
        return { worlds: output }
    }

}

class ForcedStep implements Resolver {
    id = 'forced_step'

    inputRelations = ['worlds']

    constructor(private mz: PositionMaterializer) {}

    resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null {
        const output = []

        for (const w of input.rows) {
            const m = ctx.get<OnlyReplyRow>('only_reply', w.world_id)?.[0]
            if (!m) {
                return null
            }

            let next_world_id = this.mz.add_move(m.world_id, m.move)

            output.push({
                world_id: next_world_id
            })
        }

        return { 
            forced_step: output,
            worlds: output
        }
    }
 
}


class ForcedReachable implements Resolver {
    id = 'forced_reachable'

    inputRelations = ['worlds']


    resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null {
        let seen: Set<WorldId> = new Set()
        let frontier = input.rows.map(_ => _.world_id)

        for (let d = 0; d < 8; d++) {
            const next: WorldId[] = []

            for (const w of frontier) {
                if (seen.has(w)) continue
                seen.add(w)

                const forced = ctx.get('forced_step', w).map(_ => _.world_id)

                next.push(...forced)
            }

            if (next.length === 0) break

            frontier = next
        }

        let output = [...seen].map(_ => ({
            world_id: _
        }))

        return { forced_reachable: output }
    }
}


class MateInevitable implements Resolver {
    id = 'mate_inevitable'

    inputRelations = ['forced_reachable']

    constructor(private mz: PositionMaterializer) {}

    resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null {
        const output: Row[] = []


        let forced = input.rows

        for (const w of forced) {

            let mate_found = false

            /*
            for (let next_w of this.mz.children_ids(w.world_id)) {
                if (ctx.get('checkmate', next_w).length > 0) {
                    mate_found = true
                    break
                }
            }
                */
            if (ctx.get('checkmate', w.world_id).length > 0) {
                mate_found = true
            }

            if (!mate_found) {
                return null
            }
            output.push({
                world_id: w.world_id
            })
        }

        return { mate_inevitable: output }
    }
}
import { PositionMaterializer } from "../language6/engine6"
import { Engine7, InputSlice, Invariant, InvariantResult, Judgement, ReadContext, Resolver, ResolverOutput, Row, Transaction } from "./engine7"
import { candidate_attack_moves, CreatesThreat, HypothesisRoot, MateInevitable, RookGainInevitable, TerminalForced } from "./language7"


export function Language8(mz: PositionMaterializer) {
    let engine = new Engine7()


    // candidate_attack_move: parent move
    engine.registerRelation('candidate_attack_move')
    // hypothesis_root: root world
    engine.registerRelation('hypothesis_root')
    // terminal_forced: root world
    engine.registerRelation('terminal_forced')
    // creates_threat: root parent child t:threat
    engine.registerRelation('creates_threat')

    // forced_reachable: root world
    engine.registerRelation('forced_reachable')
    // worlds: root parent world
    engine.registerRelation('worlds')
    // threatens: root world t:threat
    engine.registerRelation('threatens')
    // forced_reachable: root parent
    engine.registerRelation('expand_ready')

    // forced_defender_reply: root parent reply
    engine.registerRelation('forced_defender_reply')
    engine.registerRelation('forcing_attacker_move')


    engine.registerResolver(new CreatesThreat(mz))
    engine.registerResolver(new HypothesisRoot(mz))

    engine.registerJudgement(new TerminalForced(mz))

    engine.registerInvariant(new MateInevitable(mz))
    engine.registerInvariant(new RookGainInevitable(mz))

    engine.registerResolver(new ExpandWorldsResolver())

    engine.registerResolver(new ForcedDefenderReply())

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

    let rows = (engine.relations.get('forcing_attacker_move')!.rows)
    console.log(rows)

    return engine.query_invariants()

}



class ExpandWorldsResolver implements Resolver {

    id = 'expands_worlds'

    inputRelations = ['forced_reachable']

    resolve(input: InputSlice, ctx: ReadContext): ResolverOutput | null {

        const forced_reachable = input.rows

        /// these are supposed to be derived somehow ?? (and emitted) or are these read from somewhere
        const worlds: Row[] = []
        const threatens: Row[] = []
        const forcing_attacker_move: Row[] = []


        // this it emitted
        const expand_ready: Row[] = []


        return { worlds, threatens, forcing_attacker_move, expand_ready }
    }
}


class ForcedDefenderReply implements Resolver {

    id = 'forced_defender_reply'

    inputRelations = ['expand_ready']

    resolve(input: InputSlice, ctx: ReadContext): ResolverOutput | null {

        const expand_ready = input.rows

        const output: Row[] = []
        const forced_reachable: Row[] = []

        const worlds = ctx.get('worlds')
        const threatens = ctx.get('threatens')


        // derive output and forced_reachable


        return { forced_defender_reply: output, forced_reachable }
    }
}

// so forced_reachable doesn't have an explicit resolver that derives itself recursively
// forcing_attacker_move worlds  threatens doesn't have explicit resolvers but derived from ExpandWorldsResolver
// forced_defender_reply derives forced_defender_reply relation and also emits into forced_reachable
// ExpandWorldsResolver emits expand_ready signal which forced_defender_reply waits solely upon for derivation.

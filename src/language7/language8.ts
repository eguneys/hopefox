import { PieceTypeC } from "../distill/hopefox_c"
import { PositionMaterializer, WorldId } from "../language6/engine6"
import { Engine7, InputSlice, Invariant, InvariantResult, Judgement, ReadContext, Resolver, ResolverOutput, Row, Transaction } from "./engine7"
import { candidate_attack_moves, CreatesThreat, HypothesisRoot, MateInevitable, RookGainInevitable, TerminalForced, Threatens } from "./language7"


export function Language8(mz: PositionMaterializer) {
    let engine = new Engine7()


    // candidate_attack_move: parent move
    engine.registerRelation('candidate_attack_move')
    // hypothesis_root: root world
    engine.registerRelation('hypothesis_root')
    // terminal_forced: root world
    engine.registerRelation('terminal_forced')
    // creates_threat: root parent child t:threat
    //engine.registerRelation('creates_threat')

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

    engine.registerRelation('forcing_idea_classes')

    engine.registerResolver(new HypothesisRoot(mz))
    engine.registerJudgement(new TerminalForced(mz))


    engine.registerResolver(new ExpandWorldsResolver(mz))
    engine.registerResolver(new ForcedDefenderReply(mz))
    engine.registerResolver(new ForcingAttackerMove(mz))

    engine.registerJudgement(new ForcingIdeaClasses(mz))

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

    let rows = (engine.relations.get('forcing_idea_classes')!.rows)
    //console.log(rows)
    //return engine.query_invariants()

    return rows
}



class ExpandWorldsResolver implements Resolver {

    id = 'expands_worlds'

    inputRelations = ['forced_reachable']

    constructor(private mz: PositionMaterializer) {}

    resolve(input: InputSlice, ctx: ReadContext): ResolverOutput | null {
        //console.log(input)

        const forced_reachable = input.rows

        const worlds: Row[] = []
        const threatens: Row[] = []
        const forcing_attacker_move: Row[] = []

        const expand_ready: Row[] = []


        /*
        forced_reachable(root, parent)

        worlds(root, parent, child)
        threatens(root, child, t)
        forcing_attacker_move(root, parent, child)

        expand_ready(root, parent)
        */


        for (let fr of forced_reachable) {
            const { root, world: parent } = fr

            let legal_worlds = this.mz.generate_legal_worlds(parent)


            // what happens when legal worlds is empty?, possibly attacker has checkmated or something
            // Answer: expand_ready must still be emitted
            expand_ready.push({
                root,
                parent
            })



            for (let world of legal_worlds) {
                worlds.push({
                    root,
                    parent,
                    world
                })
            }


            if (!this.mz.is_attacker(parent)) {
                continue
            }

            for (let world of legal_worlds) {

                let creates_threat_t = build_creates_threat_t(this.mz, world)

                if (creates_threat_t !== undefined) {
                    threatens.push({
                        root,
                        world,
                        t: creates_threat_t
                    })
                }

                let existing_threats = ctx.get('threatens')
                    .filter(_ => _.root === root && _.world === parent)

                for (let threat of existing_threats) {
                    threatens.push({
                        root: root,
                        world,
                        t: threat.t
                    })
                }



                let is_forcing_attacker_move =
                    this.mz.is_capture(world)
                    || this.mz.is_check(world)
                    || this.mz.is_checkmate(world)


                if (!is_forcing_attacker_move) {
                    continue
                }

                forcing_attacker_move.push({
                    root,
                    parent,
                    next: world
                })
            }
        }

        return { worlds, threatens, forcing_attacker_move, expand_ready }
    }
}

const build_creates_threat_t = (mz: PositionMaterializer, world: WorldId): Threatens | undefined => {
    if (mz.is_check(world)) {
        return Threatens.Checkmate
    }
    if (mz.is_capture(world)) {
        return Threatens.MaterialLoss
    }
}


class ForcingAttackerMove implements Resolver {

    id = 'forcing_attacker_move'

    inputRelations = ['expand_ready']

    constructor(private mz: PositionMaterializer) {}

    resolve(input: InputSlice, ctx: ReadContext): ResolverOutput | null {

        const expand_ready = input.rows

        const output: Row[] = []
        const forced_reachable: Row[] = []

        const worlds = ctx.get('worlds')

        for (let er of expand_ready) {

            const { root, parent } = er;

            if (!this.mz.is_attacker(parent)) continue;



            const replies = worlds
                .filter(w => w.root === root && w.parent === parent)
                .map(w => w.world);

            for (const reply of replies) {
                //if (!this.mz.is_legal(reply)) continue;
                if (!(this.mz.is_capture(reply) || this.mz.is_check(reply) || this.mz.is_checkmate(reply))) {
                    continue
                }

                forced_reachable.push({
                    root,
                    world: reply
                })
            }
        }

        return { forced_reachable }
    }
}


class ForcedDefenderReply implements Resolver {

    id = 'forced_defender_reply'

    inputRelations = ['expand_ready']

    constructor(private mz: PositionMaterializer) {}

    resolve(input: InputSlice, ctx: ReadContext): ResolverOutput | null {

        const expand_ready = input.rows

        const output: Row[] = []
        const forced_reachable: Row[] = []

        const worlds = ctx.get('worlds')
        const threatens = ctx.get('threatens')

        for (let er of expand_ready) {

            const { root, parent } = er;

            if (!this.mz.is_defender(parent)) continue;

            const threats = threatens
                .filter(t => t.root === root && t.world === parent);

            const replies = worlds
                .filter(w => w.root === root && w.parent === parent)
                .map(w => w.world);

            for (const reply of replies) {
                //if (!this.mz.is_legal(reply)) continue;

                const ok = threats.every(t =>
                    this.mz.__resolves(reply, t.t)
                );
            
            
                if (ok) {
                    output.push({
                        root,
                        parent,
                        reply
                    });

                    forced_reachable.push({
                        root,
                        world: reply
                    })
                }
            }
        }

        return { forced_defender_reply: output, forced_reachable }
    }
}


class ForcingIdeaClasses implements Judgement {
    id = 'ForcingIdeaClasses'

    constructor(private mz: PositionMaterializer) {}

    judge(ctx: ReadContext): ResolverOutput {
        let terminal_forced = ctx.get('terminal_forced')

        const output: Row[] = []
        let multiset = new Map<Outcome, Row[]>()

        for (let r of terminal_forced) {
            let c = classify(this.mz ,r.root, r.world)

            if (multiset.get(c) === undefined) {
                multiset.set(c, [r])
            } else {
                multiset.get(c)!.push(r)
            }
        }
        for (let [key, value] of multiset) {
            value.forEach(value => {
                output.push({
                    root: value.root,
                    world: value.world,
                    outcome: key.value
                })
            })
        }

        return { forcing_idea_classes: output }
    }

}



const classify = (mz: PositionMaterializer, root: WorldId, world: WorldId) => {
    if (mz.is_checkmate(world)) {
        return { value: OutcomeValue.Checkmate }
    }
    return { value: OutcomeValue.Neutral }
}


enum OutcomeValue {
    Checkmate,
    MaterialGain,
    MaterialLoss,
    Neutral
}

interface Outcome {
    value: OutcomeValue
}

export const name_outcome = (value: OutcomeValue) => {
    switch (value) {
        case OutcomeValue.Checkmate:
            return 'Checkmate'
        case OutcomeValue.MaterialGain:
            return 'MaterialGain'
        case OutcomeValue.MaterialLoss:
            return 'MaterialLoss'
        case OutcomeValue.Neutral:
            return 'Neutral'
    }
}
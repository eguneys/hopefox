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


    //engine.registerResolver(new CreatesThreat(mz))
    engine.registerResolver(new HypothesisRoot(mz))

    engine.registerJudgement(new TerminalForced(mz))

    engine.registerInvariant(new MateInevitable(mz))
    engine.registerInvariant(new RookGainInevitable(mz))

    engine.registerResolver(new ExpandWorldsResolver(mz))

    engine.registerResolver(new ForcedDefenderReply(mz))

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
    //console.log(rows)

    return engine.query_invariants()

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

            for (let world of legal_worlds) {
                worlds.push({
                    root,
                    parent,
                    world
                })


                expand_ready.push({
                    root,
                    parent
                })

            }


            if (!this.mz.is_attacker(parent)) {
                continue
            }

            for (let world of legal_worlds) {

                let creates_threat_t = build_creates_threat_t(this.mz, world)
                //console.log(this.mz.sans(world), creates_threat_t)

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
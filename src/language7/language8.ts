import { color_c_opposite, PieceTypeC, QUEEN } from "../distill/hopefox_c"
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

    // open_obligation: root world reply
    engine.registerRelation('open_obligation')

    // obligation_closed: root world reply
    engine.registerRelation('obligation_closed')

    // attacker_moves_enumerated: root world
    engine.registerRelation('attacker_moves_enumerated')

    // defender_to_move: root world
    engine.registerRelation('defender_to_move')
    // attacker_to_move: root world
    engine.registerRelation('attacker_to_move')

    // forced_reachable: root world
    engine.registerRelation('forced_reachable')
    // worlds: root parent world
    engine.registerRelation('worlds')
    // threatens: root world t:threat
    engine.registerRelation('threatens')
    // forced_reachable: root parent
    engine.registerRelation('expand_ready')


    // defender_replies_enumerated: root world
    engine.registerRelation('defender_replies_enumerated')

    // puzzle_solved: root
    engine.registerRelation('puzzle_solved')
    
    // invariant: root world
    engine.registerRelation('invariant')

    // world_classified: root world
    engine.registerRelation('world_classified')

    // forced_defender_reply: root parent reply
    engine.registerRelation('forced_defender_reply')
    engine.registerRelation('forcing_attacker_move')

    engine.registerRelation('forcing_idea_classes')

    engine.registerResolver(new HypothesisRoot(mz))
    engine.registerJudgement(new TerminalForced(mz))


    engine.registerResolver(new DefenderToMove(mz))
    engine.registerResolver(new AttackerToMove(mz))


    engine.registerResolver(new CloseObligationRefuted())
    engine.registerResolver(new DeriveTerminalRefuted())
    engine.registerResolver(new DeriveTerminalDefender())
    engine.registerResolver(new DeriveTerminalAttacker())
    engine.registerResolver(new MaterializeDefenderWorld(mz))


    engine.registerResolver(new ExpandWorldsResolver(mz))
    engine.registerResolver(new ForcedDefenderReply(mz))
    engine.registerResolver(new ForcingAttackerMove(mz))


    engine.registerResolver(new PuzzleSolved())
    engine.registerResolver(new ClassifyAsInvariant(mz))

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
    let rows2 = (engine.relations.get('terminal_forced')!.rows)
    //console.log(rows2.map(_ => mz.sans(_.world)))
    //console.log(rows2[0]?.world !== undefined && mz.sans(rows2[0].world))
    //console.log(rows2[0]?.reply !== undefined && mz.sans(rows2[0].reply))
    //return engine.query_invariants()

    //return []
    return rows
}



class ExpandWorldsResolver implements Resolver {

    id = 'expands_worlds'

    inputRelations = ['forced_reachable']

    constructor(private mz: PositionMaterializer) {}

    resolve(input: InputSlice, ctx: ReadContext): ResolverOutput | null {
        const forced_reachable = input.rows

        const worlds: Row[] = []
        const threatens: Row[] = []
        const forcing_attacker_move: Row[] = []

        const expand_ready: Row[] = []

        const attacker_moves_enumerated: Row[] = []

        const terminal_forced = ctx.get('terminal_forced')

        const puzzle_solved = ctx.get('puzzle_solved')

        if (puzzle_solved.length > 0) {
            return null
        }

        let ss = forced_reachable.map(_ => this.mz.sans(_.world))

        for (let fr of forced_reachable) {


            const { root, world: parent } = fr

            if (terminal_forced.find(_ => _.root === root && _.world === parent)) {
                continue
            }

            let legal_worlds = this.mz.generate_legal_worlds(parent)


            // what happens when legal worlds is empty?, possibly attacker has checkmated or something
            // Answer: expand_ready must still be emitted
            expand_ready.push({
                root,
                parent
            })


            attacker_moves_enumerated.push({
                root,
                world: parent
            })

            for (let world of legal_worlds) {
                worlds.push({
                    root,
                    parent,
                    world
                })
            }


            //console.log('yayy', this.mz.sans(parent))
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

        //console.log(forcing_attacker_move, expand_ready)
        return { worlds, threatens, forcing_attacker_move, expand_ready, attacker_moves_enumerated }
    }
}

class AttackerToMove implements Resolver {
    id = 'attacker_to_move'

    inputRelations = ['worlds']

    constructor(private mz: PositionMaterializer) {}

    resolve(input: InputSlice, ctx: ReadContext): ResolverOutput | null {
        const output: Row[] = []

        const worlds = input.rows

        for (let w of worlds) {
            if (this.mz.is_attacker(w.world)) {
                output.push({
                    root: w.root,
                    world: w.world
                })
            }
        }

        return { attacker_to_move: output }
    }

}



class DefenderToMove implements Resolver {
    id = 'defender_to_move'

    inputRelations = ['worlds']

    constructor(private mz: PositionMaterializer) {}

    resolve(input: InputSlice, ctx: ReadContext): ResolverOutput | null {
        const output: Row[] = []

        const worlds = input.rows

        for (let w of worlds) {
            if (this.mz.is_defender(w.world)) {
                output.push({
                    root: w.root,
                    world: w.world
                })
            }
        }

        return { defender_to_move: output }
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

            const terminal_forced = ctx.get('terminal_forced')

            if (terminal_forced.find(_ => _.root === root && _.world === parent)) {
                continue
            }


            const replies = worlds
                .filter(w => w.root === root && w.parent === parent)
                .map(w => w.world);

            for (const reply of replies) {
                //if (!this.mz.is_legal(reply)) continue;
                if (this.mz.nodes.history_moves(reply).length > 4) {
                    //continue
                }
                if (!(this.mz.is_capture(reply) || this.mz.is_check(reply) || this.mz.is_checkmate(reply))) {
                    continue
                }

                if (can_expand(this.mz, root)) {
                    forced_reachable.push({
                        root,
                        world: reply
                    })
                }
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
        const open_obligation: Row[] = []

        const defender_replies_enumerated: Row[] = []

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

                    open_obligation.push({
                        root,
                        world: parent,
                        reply
                    })

                    defender_replies_enumerated.push({
                        root,
                        world: parent
                    })
                }
            }
        }

        let SS
        if (output.length > 0) {
            SS = this.mz.sans(output[0].parent)
        }
        return { forced_defender_reply: output, open_obligation, defender_replies_enumerated }
    }
}

class CloseObligationRefuted implements Resolver {
    id = 'close_obligation_refuted'

    inputRelations = ['open_obligation']

    resolve(input: InputSlice, ctx: ReadContext): ResolverOutput | null {
        const open_obligation = input.rows

        const output: Row[] = []

        for (let r of open_obligation) {
            const { root, world, reply} = r

            // discharges//

            const refuted = ctx.get('refuted')
            if (!refuted.find(_ => _.root === root && _.world === reply)) {
                continue
            }

            output.push({
                root,
                world,
                reply
            })
        }

        for (let r of open_obligation) {
            const { root, world, reply} = r

            // discharges//

            const terminal_forced = ctx.get('terminal_forced')
            if (!terminal_forced.find(_ => _.root === root && _.world === reply)) {
                continue
            }

            output.push({
                root,
                world,
                reply
            })
        }



        return { obligation_closed: output }
    }

}

/*

close_obligation_dominated:
  reads:
    open_obligation(root, parent, w1)
    open_obligation(root, parent, w2)
    dominates(w1, w2)
  emits:
    obligation_closed(root, parent, w2)
    refuted(root, w2)

*/




class DeriveTerminalAttacker implements Resolver {
    id = 'terminal_attacker'

    inputRelations = ['attacker_moves_enumerated']

    resolve(input: InputSlice, ctx: ReadContext): ResolverOutput | null {
        const attacker_moves_enumerated = input.rows

        const output: Row[] = []

        for (let d of attacker_moves_enumerated) {
            let { root, world } = d


            if (!ctx.get('attacker_to_move').find(_ => _.root === root && _.world === world)) {
                continue
            }

            const forcing_attacker_move = ctx.get('forcing_attacker_move')

            //console.log(d, forcing_attacker_move)
            if (forcing_attacker_move.find(_ => _.root === root && _.world === world)) {
                continue
            }

            output.push({
                root,
                world,
            })
        }

        return { terminal_forced: output }
    }
}


class DeriveTerminalDefender implements Resolver {
    id = 'terminal_defender'

    inputRelations = ['defender_replies_enumerated']

    resolve(input: InputSlice, ctx: ReadContext): ResolverOutput | null {
        const defender_replies_enumerated = input.rows

        const defender_to_move = ctx.get('defender_to_move')

        const output: Row[] = []

        const open_obligation = ctx.get('open_obligation')

        for (let d of defender_replies_enumerated) {
            let { root, world } = d


            if (open_obligation.find(_ => _.root === root && _.world === world)) {
                continue
            }

            output.push({
                root,
                world,
            })
        }

        //console.log('Reached terminal forced', output.length)
        return { terminal_forced: output }
    }
}


class DeriveTerminalRefuted implements Resolver {
    id = 'terminal_refuted'

    inputRelations = ['refuted']

    resolve(input: InputSlice, ctx: ReadContext): ResolverOutput | null {
        const refuted = input.rows

        const output: Row[] = []

        for (let r of refuted) {
            let { root, world } = r

            output.push({
                root,
                world,
            })
        }

        return { terminal_forced: output }
    }
}



class MaterializeDefenderWorld implements Resolver {
    id = 'materialize_defender_world'

    inputRelations = ['open_obligation']

    constructor(private mz: PositionMaterializer) {}

    resolve(input: InputSlice, ctx: ReadContext): ResolverOutput | null {
        const output: Row[] = []
        const open_obligation = input.rows

        for (let r of open_obligation) {
            const { root, world, reply} = r

            const terminal_forced = ctx.get('terminal_forced')


            if (terminal_forced.find(_ => _.root === root && _.world === reply)) {
                continue
            }


            // if budget_allows

            if (can_expand(this.mz, root)) {
                output.push({
                    root,
                    world: reply
                })
            }
        }

        return { forced_reachable: output}
    }

}

const can_expand = (mz: PositionMaterializer, world: WorldId) => {
    if (mz.nodes.nb_child(world) > 200) {
        return false
    }
    return true
}

class PuzzleSolved implements Resolver {
    id = 'puzzle_solved'
    inputRelations = ['world_classified']

    resolve(input: InputSlice, ctx: ReadContext): ResolverOutput | null {
        let terminal_forced = input.rows

        const output: Row[] = []


        for (let r of terminal_forced) {

            //console.log('gone', r.world)
            let i = ctx.get('invariant')
            .find(_ => _.root === r.root && _.world === r.world)

            if (i !== undefined) {
                output.push({
                    root: r.root
                })
            }
        }

        return { puzzle_solved: output }
    }

}


class ClassifyAsInvariant implements Resolver {
    id = 'classify_as_invariant'

    inputRelations = ['forced_reachable']

    constructor(private mz: PositionMaterializer) {}

    resolve(input: InputSlice, ctx: ReadContext): ResolverOutput | null {
        const output: Row[] = []
        const invariant: Row[] = []

        let world_classified = ctx.get('world_classified')

        for (let t of input.rows) {

            if (world_classified.find(_ => _.root === t.root && _.world === t.world)) {
                continue
            }
            output.push({
                root: t.root,
                world: t.world
            })

            let res = classify(this.mz, t.root, t.world)

            let yes = false
            if (res.value === OutcomeValue.MaterialGain) {
                yes = true
            }
            if (res.value === OutcomeValue.Checkmate) {
                yes = true
            }

            if (yes) {
                invariant.push({
                    root: t.root,
                    world: t.world
                })
            }
        }

        return { invariant, world_classified: output }
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
    mz.make_to_world(root)
    let defender = mz.m.pos_turn(mz.pos)
    let attacker = color_c_opposite(defender)
    let qq_root =  mz.m.get_pieces_bb(mz.pos, [QUEEN])
    let cc_root = mz.m.get_pieces_color_bb(mz.pos, defender)
    let q_root = qq_root.intersect(cc_root)
    mz.unmake_world(root)
    mz.make_to_world(world)
    let qq_world =  mz.m.get_pieces_bb(mz.pos, [QUEEN])
    let cc_world = mz.m.get_pieces_color_bb(mz.pos, defender)
    let q_world = qq_world.intersect(cc_world)
    mz.unmake_world(world)

    if (q_root.size() > q_world.size()) {
        return { value: OutcomeValue.MaterialGain }
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
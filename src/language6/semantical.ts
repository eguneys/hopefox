import { KING, make_move_from_to, move_c_to_Move, MoveC, piece_c_color_of, piece_c_type_of, PositionC, PositionManager, QUEEN, static_piece_value } from "../distill/hopefox_c";
import { CoreProgram, lowerCoreToEngine } from "./core";
import { analyseProgram } from "./diagnostics";
import { InputSlice, Invariant, InvariantResult, makeRelation, MyEngine, PositionMaterializer, ReadContext, Resolver, ResolverOutput, Row, Transaction, WorldId } from "./engine6";

export function Semantical7(m: PositionManager, pos: PositionC) {

    let { node }  = analyseProgram(`
idea "Knight Fork"
  move knight from e5 to f7
`)

    let mz = new PositionMaterializer(m, pos)

    let graph = lowerCoreToEngine(node!)
    let engine = new MyEngine(graph)


    engine.registerRelation(makeRelation('worlds', []))
    engine.registerRelation(makeRelation('in_check', []))


    engine.registerRelation(makeRelation('legal_moves', []))
    engine.registerRelation(makeRelation('occupies', []))
    engine.registerRelation(makeRelation('attacks', []))
    engine.registerRelation(makeRelation('attacks2', []))
    engine.registerRelation(makeRelation('captures', []))
    engine.registerRelation(makeRelation('checks', []))

    engine.registerRelation(makeRelation('queen_attacked', []))

    engine.registerRelation(makeRelation('queen_capturable', []))

    engine.registerRelation(makeRelation('material_delta', []))

    engine.registerRelation(makeRelation('forced_defender_reply', []))
    engine.registerRelation(makeRelation('forcing_attacker_move', []))
    engine.registerRelation(makeRelation('forced_reachable', []))

    engine.registerRelation(makeRelation('candidate_attack_move', []))

    engine.registerRelation(makeRelation('forced_frontier', []))
    engine.registerRelation(makeRelation('forced_seen', []))


    engine.registerResolver(new OccupiesResolver(mz))
    engine.registerResolver(new AttacksResolver(mz))
    engine.registerResolver(new Attacks2Resolver(mz))
    engine.registerResolver(new CapturesResolver(mz))
    engine.registerResolver(new ChecksResolver(mz))
    engine.registerResolver(new LegalMovesResolver(mz))


    engine.registerResolver(new QueenAttackedResolver(mz))
    engine.registerResolver(new QueenCapturableResolver(mz))
    engine.registerResolver(new MaterialDeltaResolver(mz))

    engine.registerResolver(new InCheck(mz))

    engine.registerResolver(new ForcingAttackerMove(mz))
    engine.registerResolver(new ForcedDefenderReply(mz))
    engine.registerResolver(new ForcedReachable(mz))

    engine.registerResolver(new CandidateAttackMoves(mz))

    engine.registerResolver(new ExpandDefenderMoves(mz))
    engine.registerResolver(new ExpandAttackerMoves(mz))

    engine.registerResolver(new ForcedFrontier())
    engine.registerResolver(new SeedForcedReachable())



    engine.registerInvariant(new MateInevitable(mz))
    //engine.registerInvariant(new QueenCaptureInevitable(mz))
    engine.registerInvariant(new RookGainInevitable(mz))

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
    rows = engine.relations.get('forced_reachable')!.rows

    //console.log(rows)
    console.log(rows.map(_ => mz.sans(_.world_id)))
    //console.log(engine.relations.get('candidate_attack_move')!.rows.map(_ => mz.sans(_.world_id)))

    let res = engine.query_invariants()

    return [...res.entries()].map(([k, v]) =>
        [k, v.map(_ => mz.nodes.history_moves(_))]
    )
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

class ForcedReachable implements Resolver {
  id = 'forced_reachable'

  inputRelations = [
    'forced_reachable',        // self-recursive (fixed point)
    //'forced_defender_reply',
    //'forcing_attacker_move',
    //'side_to_move'
  ]

  constructor(private mz: PositionMaterializer) {}

  resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null {
    const out: Row[] = []

    for (const r of input.rows) {
      const root = r.root
      const w = r.world_id

      const stm_is_attacker = this.mz.is_attacker(w)

      if (!stm_is_attacker) {
        // ∀ forced defender replies
        const replies = ctx.get('forced_defender_reply', w)

        for (const rr of replies) {
          out.push({
            root,
            world_id: rr.reply_world_id
          })
        }
      } else {
        // ∃ attacker forcing continuations (unioned)
        const conts = ctx.get('forcing_attacker_move', w)

        for (const rr of conts) {
          out.push({
            root,
            world_id: rr.next_world_id
          })
        }
      }
    }

    return out.length
      ? { forced_reachable: out }
      : null
  }
}


class CandidateAttackMoves implements Resolver {
  id = 'candidate_attack_moves'
  inputRelations = ['captures', 'checks']

  constructor(private mz: PositionMaterializer) {}

  resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null {
    const output: Row[] = []


    if (input.relation === 'checks') {

        for (const c of input.rows) {
            if (!this.mz.is_attacker(c.world_id)) { continue }
            if (this.mz.nodes.depth_of(c.world_id) > 1) { continue }

            let legals = ctx.get('legal_moves', c.world_id)

            let move = make_move_from_to(c.from, c.to)
            if (legals.findIndex(_ => _.move === move) === -1) { continue }

            output.push({
                world_id: c.world_id,
                move
            })
        }
    }

    if (input.relation === 'captures') {

        for (const c of input.rows) {
            if (!this.mz.is_attacker(c.world_id)) { continue }

            let legals = ctx.get('legal_moves', c.world_id)

            let move = make_move_from_to(c.from, c.to)
            if (legals.findIndex(_ => _.move === move) === -1) { continue }

            output.push({
                world_id: c.world_id,
                move
            })
        }
    }

    return output.length ? { candidate_attack_move: output } : null
  }
}


class ChecksResolver implements Resolver {
    id = 'checks'

    inputRelations = ['attacks2']

    constructor(private mz: PositionMaterializer) {}

    resolve(
        input: InputSlice<Row>,
        ctx: ReadContext
    ): ResolverOutput | null {
        const output: Row[] = []

        for (const a of input.rows) {

            let world_id = a.world_id

            if (a.to2 === a.from) {
                continue
            }

            let occupies = ctx.get<Row>('occupies', world_id)


            let king = occupies.find(_ => _.on === a.to2)
            if (!king || king.role !== KING) {
                continue
            }

            output.push({
                world_id,
                from: a.from,
                to: a.to,
                king: a.to2
            })
        }

        if (output.length === 0) return null

        return {
            'checks': output
        }
    }
}




class CapturesResolver implements Resolver {
    id = 'captures'

    inputRelations = ['worlds']

    constructor(private mz: PositionMaterializer) {}

    resolve(
        input: InputSlice<Row>,
        ctx: ReadContext
    ): ResolverOutput | null {
        const output: Row[] = []

        for (const { world_id } of input.rows) {

            let occupies = ctx.get<Row>('occupies', world_id)

            this.mz.make_to_world(world_id)

            let occ = this.mz.m.pos_occupied(this.mz.pos)

            for (let on of occ) {
                let attacker_piece = occupies.find(occ => occ.on === on)!


                let aa = this.mz.m.pos_attacks(this.mz.pos, on)

                for (let a of aa) {

                    let captured_piece = occupies.find(occ => occ.on === a)

                    if (!captured_piece) {
                        continue
                    }

                    output.push({
                        world_id,
                        from: on,
                        to: a,
                        attacker: attacker_piece.role,
                        captured: captured_piece.role,
                        captured_value: captured_piece.value,
                        captured_color: captured_piece.color
                    })
                }
            }

            this.mz.unmake_world(world_id)
        }

        if (output.length === 0) return null

        return {
            'captures': output
        }
    }
}


class OccupiesResolver implements Resolver {
    id = 'occupies'

    inputRelations = ['worlds']

    constructor(private mz: PositionMaterializer) {}

    resolve(
        input: InputSlice<Row>,
        ctx: ReadContext
    ): ResolverOutput | null {
        const output: Row[] = []

        for (const { world_id } of input.rows) {


            this.mz.make_to_world(world_id)

            let occ = this.mz.m.pos_occupied(this.mz.pos)

            for (let on of occ) {
                let piece = this.mz.m.get_at(this.mz.pos, on)!
                let role = piece_c_type_of(piece)
                let color = piece_c_color_of(piece)

                let value = static_piece_value(role)

                output.push({
                    world_id,
                    on,
                    piece,
                    role,
                    color,
                    value
                })
            }

            this.mz.unmake_world(world_id)
        }

        if (output.length === 0) return null

        return {
            'occupies': output
        }
    }
}


class Attacks2Resolver implements Resolver {
    id = 'attacks2'

    inputRelations = ['worlds']

    constructor(private mz: PositionMaterializer) {}

    resolve(
        input: InputSlice<Row>,
        ctx: ReadContext
    ): ResolverOutput | null {
        const output: Row[] = []

        for (const { world_id } of input.rows) {

            this.mz.make_to_world(world_id)

            let occ = this.mz.m.pos_occupied(this.mz.pos)

            for (let on of occ) {
                let piece = this.mz.m.get_at(this.mz.pos, on)!

                let aa = this.mz.m.pos_attacks(this.mz.pos, on)

                for (let a of aa) {

                    let aa2 = this.mz.m.attacks(piece, a, occ.without(on))

                    for (let a2 of aa2) {
                        output.push({
                            world_id,
                            from: on,
                            to: a,
                            to2: a2
                        })
                    }
                }
            }

            this.mz.unmake_world(world_id)
        }

        if (output.length === 0) return null

        return {
            'attacks2': output
        }
    }
}



class AttacksResolver implements Resolver {
    id = 'attacks'

    inputRelations = ['worlds']

    constructor(private mz: PositionMaterializer) {}

    resolve(
        input: InputSlice<Row>,
        ctx: ReadContext
    ): ResolverOutput | null {
        const output: Row[] = []

        for (const { world_id } of input.rows) {

            this.mz.make_to_world(world_id)

            let occ = this.mz.m.pos_occupied(this.mz.pos)

            for (let on of occ) {

                let aa = this.mz.m.pos_attacks(this.mz.pos, on)

                for (let a of aa) {

                    output.push({
                        world_id,
                        from: on,
                        to: a
                    })
                }
            }

            this.mz.unmake_world(world_id)
        }

        if (output.length === 0) return null

        return {
            'attacks': output
        }
    }
}


class QueenAttackedResolver implements Resolver {
    id = 'queen_attacked'

    inputRelations = ['attacks']

    constructor(private mz: PositionMaterializer) {}

    resolve(
        input: InputSlice<Row>,
        ctx: ReadContext
    ): ResolverOutput | null {
        const output: Row[] = []


        for (const attack of input.rows) {

            const occupies = ctx.get<Row>('occupies', attack.world_id)

            let attacker = occupies.find(occ => occ.on === attack.from)!

            let queen = occupies.find(occ => occ.role === QUEEN && occ.color !== attacker.color)

            if (!queen) {
                continue
            }


            output.push({
                world_id: attack.world_id,
                from: attack.from,
                to: attack.to,
            })
        }

        if (output.length === 0) return null

        return {
            'attacks': output
        }
    }
}




class LegalMovesResolver implements Resolver {
    id = 'legal_moves'

    inputRelations = ['worlds']

    constructor(private mz: PositionMaterializer) { }

    resolve(
        input: InputSlice<Row>,
        ctx: ReadContext
    ): ResolverOutput | null {
        const output: Row[] = []

        for (const { world_id, depth } of input.rows) {

            this.mz.make_to_world(world_id)

            for (let move of this.mz.m.get_legal_moves(this.mz.pos)) {
                output.push({
                    world_id,
                    move,
                })
            }

            this.mz.unmake_world(world_id)
        }

        if (output.length === 0) return null

        return {
            'legal_moves': output
        }
    }
}



class MaterialDeltaResolver implements Resolver {
    id = 'material_delta'

    inputRelations = ['captures']

    constructor(private mz: PositionMaterializer) {}

    resolve(
        input: InputSlice<Row>,
        ctx: ReadContext
    ): ResolverOutput | null {
        const output: Row[] = []

        for (const c of input.rows) {

            let { world_id, captured_value, captured_color } = c

            let move = make_move_from_to(c.from, c.to)

            let legals = ctx.get('legal_moves', world_id)
            if (legals.findIndex(_ => _.move === move) === -1) { continue }

            let next_world_id = this.mz.add_move(world_id, move)

            let previous_delta = ctx.get('material_delta', this.mz.parent_world_id(world_id))?.[0]


            let value = captured_color === this.mz.attacker_turn ? -captured_value  : captured_value

            if (previous_delta !== undefined) {
                value += previous_delta.value
            }

            output.push({
                world_id: next_world_id,
                value
            })
        }

        if (output.length === 0) return null

        return {
            'material_delta': output
        }
    }
}



class QueenCapturableResolver implements Resolver {
    id = 'queen_capturable'

    inputRelations = ['legal_moves']

    constructor(private mz: PositionMaterializer) {}

    resolve(
        input: InputSlice<Row>,
        ctx: ReadContext
    ): ResolverOutput | null {
        const output: Row[] = []

        for (const { world_id, move } of input.rows) {

            let captures = ctx.get<Row>('captures', world_id)

            let { from, to } = move_c_to_Move(move)
            
            let yes = captures.find(_ => 
                _.captured === QUEEN &&
                _.from === from &&
                _.to === to)


            if (yes) {
                output.push({
                    world_id,
                    move
                })

            }

        }

        if (output.length === 0) return null

        return {
            'queen_capturable': output
        }
    }
}



class QueenCaptureInevitable implements Invariant {
    id = 'queen_capture_inevitable'

    constructor(private mz: PositionMaterializer) {}

    evaluate(ctx: ReadContext) {
        const witnesses = []

        for (const h of ctx.get('candidate_attack_move')) {
            const hWorld = h.child_world_id   // already expanded

            const forcedWorlds =
                ctx.get('forced_reachable')
                    .filter(r => r.root_world_id === hWorld)
                    .map(r => r.world_id)

            let inevitable = true

            for (const w of forcedWorlds) {
                if (!queen_loss_unavoidable(w, ctx)) {
                    inevitable = false
                    break
                }
            }

            if (inevitable) {
                witnesses.push(hWorld)
            }
        }

        return {
            holds: witnesses.length > 0,
            witnesses
        }
    }

}



class RookGainInevitable implements Invariant {
    id = 'rook_gain_inevitable'

    constructor(private mz: PositionMaterializer) {}

    evaluate(ctx: ReadContext): InvariantResult {
        const output: Row[] = []

        let hs = ctx.get('candidate_attack_move')

        for (const h of hs) {

            let hWorld = this.mz.add_move(h.world_id, h.move)

            const forcedWorlds = ctx.get('forced_reachable', hWorld)
                .map(_ => _.world_id)

            for (let next_w of forcedWorlds) {

                let material_delta = ctx.get<Row>('material_delta', next_w)

                if (material_delta.length === 1 && material_delta[0].value === 500) {
                    output.push({
                        world_id: hWorld
                    })
                    break
                }
            }
        }

        return {
            holds: output.length > 0,
            witnesses: output.map(_ => _.world_id)
        }
    }
}


class MateInevitable implements Invariant {
  id = 'mate_inevitable'

  constructor(private mz: PositionMaterializer) {}

  evaluate(ctx: ReadContext): InvariantResult {
    const witnesses: WorldId[] = []

    // iterate over all hypothesis roots
    //const roots = ctx.get('hypothesis_root')  // or however you store them
    const roots = ctx.get('candidate_attack_move')  // or however you store them

    for (const r of roots) {
      const root = r.world_id

      const forced = ctx
        .get('forced_reachable')
        .filter(x => x.root === root)
        .map(x => x.world_id)

      if (forced.length === 0) continue // defensive; should never happen

      let inevitable = true

      for (const w of forced) {

        //console.log(root, w, this.mz.sans(root), this.mz.sans(w))

        this.mz.make_to_world(w)

        const isMate = this.mz.m.is_checkmate(this.mz.pos)

        this.mz.unmake_world(w)

        if (!isMate) {
          inevitable = false
          break
        }
      }

      if (inevitable) {
        witnesses.push(root)
      }
    }

    return {
      holds: witnesses.length > 0,
      witnesses
    }
  }
}



class ForcingAttackerMove implements Resolver {
  id = 'forcing_attacker_move'

  inputRelations = [
    'forced_reachable',
    //'worlds',
    //'side_to_move'
  ]

  constructor(private mz: PositionMaterializer) {}

  resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null {
    const out: Row[] = []

    for (const fr of input.rows) {
      const root = fr.root
      const w = fr.world_id

      const stm_is_attacker = this.mz.is_attacker(w)
      if (!stm_is_attacker) continue

      // iterate expanded children
      const children = ctx.get('worlds')
        .filter(r => r.parent === w)

      for (const ch of children) {
        const w2 = ch.world_id

        this.mz.make_to_world(w2)

        const givesCheck =
          this.mz.m.is_check(this.mz.pos) ||
          this.mz.m.is_checkmate(this.mz.pos)


        this.mz.unmake_world(w2)

        if (!givesCheck) continue

        out.push({
          world_id: root,
          root,
          parent: w,
          next: w2
        })
      }
    }

    return out.length
      ? { forcing_attacker_move: out }
      : null
  }
}



class ForcedDefenderReply implements Resolver {
  id = 'forced_defender_reply'

  inputRelations = [
    'forced_reachable',
    //'worlds',          // parent → child expansion
    //'side_to_move'
  ]

  constructor(private mz: PositionMaterializer) {}

  resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null {
    const out: Row[] = []

    for (const fr of input.rows) {
      const root = fr.root
      const w = fr.world_id

      const stm_is_attacker = this.mz.is_attacker(w)
      //if (stm !== 'defender') continue
      if (stm_is_attacker) continue

      // materialize parent world
      this.mz.make_to_world(w)

      // defender replies are forced ONLY if in check
      if (!this.mz.m.is_check(this.mz.pos)) {
        this.mz.unmake_world(w)
        continue
      }
      this.mz.unmake_world(w)

      // iterate already-expanded children
      const children = ctx.get('worlds', w)  // rows with { parent, world }

      for (const ch of children) {
        const w2 = ch.world

        this.mz.make_to_world(w2)

        const escaped = !this.mz.m.is_check(this.mz.pos)

        this.mz.unmake_world(w2)

        if (!escaped) continue

        out.push({
          world_id: root,
          root,
          parent: w,
          reply_world_id: w2
        })
      }

      this.mz.unmake_world(w)
    }

    return out.length
      ? { forced_defender_reply: out }
      : null
  }
}

class ExpandDefenderMoves implements Resolver {
  id = 'expand_defender_moves'

  inputRelations = [
    'forced_frontier',
  ]

  constructor(private mz: PositionMaterializer) {}

  resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null {
    const out: Row[] = []

    for (const fr of input.rows) {
      const root = fr.root
      const w = fr.world_id

      const stm_is_attacker = this.mz.is_attacker(w)
      if (stm_is_attacker) continue

      this.mz.make_to_world(w)

      const moves = this.mz.m.get_legal_moves(this.mz.pos)

      for (const move of moves) {
        const w2 = this.mz.add_move(w, move)

        out.push({
          root,
          parent: w,
          world_id: w2
        })
      }

      this.mz.unmake_world(w)
    }

    return out.length ? { worlds: out, forced_seen: out } : null
  }
}

class ExpandAttackerMoves implements Resolver {
  id = 'expand_attacker_moves'

  inputRelations = [
    'forced_frontier',
  ]

  constructor(private mz: PositionMaterializer) {}

  resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null {
    const out: Row[] = []

    for (const fr of input.rows) {
      const root = fr.root
      const w = fr.world_id

      const stm_is_attacker = this.mz.is_attacker(w)
      if (!stm_is_attacker) continue

      this.mz.make_to_world(w)

      const moves = this.mz.m.get_legal_moves(this.mz.pos)

      for (const move of moves) {
        const w2 = this.mz.add_move(w, move)

        out.push({
          root,
          parent: w,
          world_id: w2
        })
      }

      this.mz.unmake_world(w)
    }

    return out.length ? { worlds: out, forced_seen: out } : null
  }
}

class ForcedFrontier implements Resolver {
  id = 'forced_frontier'

  inputRelations = [
    'forced_reachable',
    //'forced_seen'
  ]

  resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null {
    const out: Row[] = []

    for (const fr of input.rows) {
      const root = fr.root
      const w = fr.world_id

      // if already processed for this root, skip
      //const seen = ctx.get('forced_seen', root)
      //  .some(r => r.world_id === w)
        const seen = ctx.get('forced_seen', w)
            .some(r => r.root === root)

      if (seen) continue

      out.push({
        root,
        world_id: w
      })
    }

    return out.length
      ? { forced_frontier: out }
      : null
  }
}


class SeedForcedReachable implements Resolver {
  id = 'seed_forced_reachable'

  //inputRelations = ['hypothesis_root'] // or candidate_attack_move
  inputRelations = ['candidate_attack_move']

  resolve(input: InputSlice<Row>): ResolverOutput | null {
    const out: Row[] = []

    for (const r of input.rows) {
      const root = r.world_id

      out.push({
        root,
        world_id: root
      })
    }

    return out.length
      ? { forced_reachable: out }
      : null
  }
}

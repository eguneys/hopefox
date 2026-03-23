import type { AlphaChatStateHooks, MyAlphaChatStateContext } from './alpha_beta_v2'
import { ContextDelta, FeatureContribution, GeneratedMove, Intention, intentionEqual, MinMaxPlayer } from './chat_alpha'
import { make_move_from_to } from './distill/hopefox_c'
import { mz_forks, mz_typed_forks, mz_views } from './get_features'
import { PositionMaterializer, WorldId } from './pos_materializer'

export const hooks: AlphaChatStateHooks = {
    evaluate: function (isMaximizing: boolean, ctx: MyAlphaChatStateContext, mz: PositionMaterializer): number {
    let player: MinMaxPlayer = isMaximizing ? 'max' : 'min'
    let opponent: MinMaxPlayer = isMaximizing ? 'min' : 'max'

    if(ctx.find_intentions(opponent, 'mate').next().value) {

      return - 5000
    }


    let q_m = ctx.find_intentions(player, 'mate').next().value
    if (q_m) {
      return 5000
    }

    if (ctx.find_intentions(opponent, 'bishop_forks_king_and_rook_dd').next().value) {
      return 9
    }



    if (ctx.find_intentions(opponent, 'bishop_captures_queen').next().value) {
      return -9
    }

    if (ctx.find_intentions(opponent, 'rook_takes_knight').next().value) {
      return -3
    }

    if(ctx.find_intentions(opponent, 'queen_captures_queen').next().value) {

      if (ctx.find_intentions(player, 'rook_captures_queen').next().value) {
        return 0
      }
      return - 10
    }


    if (ctx.find_intentions(opponent, 'knight_captures_hanging_queen').next().value) {
      return -10
    }

    let n_c = ctx.find_intentions(player, 'knight_captures_hanging_queen').next().value
    if (n_c) {
      return 10
    }
    let k_c = ctx.find_intentions(player, 'king_captures_bishop_fork').next().value
    if (k_c) {
      return 5
    }
    let b_f = ctx.find_intentions(player, 'bishop_forks_king_and_rook').next().value
    if (b_f) {
      return 7
    }
    let p_b = ctx.find_intentions(player, 'pawn_captures_bishop').next().value
    if (p_b) {
      return 5
    }



    return 0
  },
    is_terminal: function (isMaximizing: boolean, ctx: MyAlphaChatStateContext, mz: PositionMaterializer): boolean {
      let player: MinMaxPlayer = isMaximizing ? 'max' : 'min'

      let is_mate = ctx.find_intentions(player, 'queen_bishop_mate').next().value

      if (is_mate) {
        return true
      }


        return false
    },
    list_moves: function (isMaximizing: boolean, ctx: MyAlphaChatStateContext, mz: PositionMaterializer): GeneratedMove<WorldId>[] {

      let player: MinMaxPlayer = isMaximizing ? 'max' : 'min'
      let opponent: MinMaxPlayer = isMaximizing ? 'min' : 'max'

      let mz_vv = mz_views(mz)
      let mz_ff = mz_forks(mz_vv)
      let mzt = mz_typed_forks(mz_vv, mz_ff)
      let legals = mz.inc_generate_legal_moves()

      let res: GeneratedMove<WorldId>[] = []

      const push = (type_feature: string, payload: any, move: WorldId) => {
        mk_push(player, type_feature, res, move, mz, payload)
      }

      for (let r_r of mzt.rook_captures_queen) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('rook_captures_queen', r_r, move)
      }

      for (let r_r of mzt.bishop_captures_queen) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('bishop_captures_queen', r_r, move)
      }



      for (let r_r of mzt.queen_captures_queen) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('queen_captures_queen', r_r, move)
      }

      for (let r_r of mzt.rook_takes_knight) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('rook_takes_knight', r_r, move)
      }



      for (let r_r of mzt.rook_captures_rook) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('rook_captures_rook', r_r, move)
      }

      for (let r_r of mzt.pawn_captures_bishop) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('pawn_captures_bishop', r_r, move)
      }


    for (let q_m of mzt.queen_bishop_mate) {
      let move = make_move_from_to(q_m.queen, q_m.to)

      if (!legals.includes(move)) continue

      push('mate', q_m, move)
    }

    for (let q_m of mzt.queen_rook_through_mate) {
      let move = make_move_from_to(q_m.queen, q_m.to)

      if (!legals.includes(move)) continue

      push('mate', q_m, move)
      debugger
    }

    for (let q_m of mzt.queen_bishop_through_mate) {
      let move = make_move_from_to(q_m.queen, q_m.to)

      if (!legals.includes(move)) continue

      push('mate', q_m, move)
      debugger
    }





    for (let q_a of ctx.find_intentions(opponent, 'queen_attacks_hanging_knight')) {
      
      for (let n_c of mzt.knight_takes_hanging_queen) {
        if (n_c.to !== q_a.payload.to) {
          continue
        }

        let move = make_move_from_to(n_c.from, n_c.to)

        if (!legals.includes(move)) continue

        push('knight_captures_hanging_queen', n_c, move)
      }

    }

    for (let b_f of ctx.find_intentions(opponent, 'bishop_forks_king_and_rook')) {

      for (let k_c of mz_ff.turn_king_capturable) {
        if (k_c.to !== b_f.payload.to) {
          continue
        }

        let move = make_move_from_to(k_c.from, k_c.to)

        if (!legals.includes(move)) continue

        push('king_captures_bishop_fork', k_c, move)
      }

    }


    for (let q_m of mzt.queen_attacks_hanging_knight) {
      let move = make_move_from_to(q_m.from, q_m.to)

      if (!legals.includes(move)) continue

      push('queen_attacks_hanging_knight', q_m, move)
    }

      out: for (let b_f of mzt.bishop_forks_king_and_rook) {
        for (let d_d of mz_ff.defend_double_from_see) {
          if (d_d.to == b_f.to) {
            let move = make_move_from_to(b_f.from, b_f.to)

            if (!legals.includes(move)) continue


            push('bishop_forks_king_and_rook_dd', b_f, move)


            continue out
          }
        }
        let move = make_move_from_to(b_f.from, b_f.to)

        if (!legals.includes(move)) continue

      push('bishop_forks_king_and_rook', b_f, move)
    }


    return res
  }
}


function mk_push(player: MinMaxPlayer, type_feature: string, res: GeneratedMove<WorldId>[], move: WorldId, mz: PositionMaterializer, payload: any) {
        res.push({
          move: mz.inc_add_move(move),
          featureContributions: [{
            feature: type_feature,
            delta: 0,
            weighted: 1
          }],
          intentionDelta: {
            features: [],
            addedIntentions: [{
              id: `${move}:${type_feature}`,
              type: type_feature,
              player,
              payload,
              createdAtDepth: 0,
              lastUpdatedDepth: 0,
              status: 'active'
            }],
            removedIntentions: [],
            updatedIntentions: []
          }
        })
}

/*

if (forkDetected) {
  moves.push({
    move: bishopMove,
    featureContributions: [...],
    intentionDelta: {
      addedIntentions: [forkIntent],
      removedIntentions: [],
      updatedIntentions: [],
      features: [] // or omit here
    }
  });
}

*/


import type { AlphaChatStateHooks, MyAlphaChatStateContext } from './alpha_beta_v2'
import { ContextDelta, FeatureContribution, GeneratedMove, Intention, intentionEqual, MinMaxPlayer } from './chat_alpha'
import { make_move_from_to, move_c_to_Move } from './distill/hopefox_c'
import { mz_forks, mz_future, mz_typed_forks, mz_views } from './get_features'
import { PositionMaterializer, WorldId } from './pos_materializer'

export const hooks: AlphaChatStateHooks = {
    evaluate: function (isMaximizing: boolean, ctx: MyAlphaChatStateContext, mz: PositionMaterializer): number {
    let player: MinMaxPlayer = 'max' //isMaximizing ? 'max' : 'min'
    let opponent: MinMaxPlayer = 'min'//isMaximizing ? 'min' : 'max'

    if(ctx.find_intentions(opponent, 'mate').next().value) {

      //console.log('opponent', opponent)
      return - 5000
    }


    let q_m = ctx.find_intentions(player, 'mate').next().value
    if (q_m) {
      //console.log('player', player)
      return 5000
    }

    if (ctx.find_intentions(opponent, 'knight_captures_hanging_queen').next().value) {
      return -10
    }

    let n_c = ctx.find_intentions(player, 'knight_captures_hanging_queen').next().value
    if (n_c) {
      return 10
    }

    if (ctx.find_intentions(opponent, 'bishop_forks_king_and_rook_dd').next().value) {
      return 9
    }

    if (ctx.find_intentions(player, 'knight_captures_queen').next().value) {
      return 9
    }
    if (ctx.find_intentions(opponent, 'knight_captures_queen').next().value) {
      return -9
    }


    if (mz.inc_sans()[2]=== 'Bxf8') {
      debugger
    }

    if (ctx.find_intentions(player, 'rook_captures_queen').next().value) {
      return 9
    }
    if (ctx.find_intentions(opponent, 'rook_captures_queen').next().value) {
      return -9
    }

    if (ctx.find_intentions(player, 'rook_captures_bishop').next().value) {
      return 3
    }
    if (ctx.find_intentions(opponent, 'rook_captures_bishop').next().value) {
      if (ctx.find_intentions(player, 'bishop_captures_rook').next().value) {

        if (ctx.find_intentions(opponent, 'queen_evades_attack').next().value) {
          return 1
        }

        return 2.1
      }
      return -3
    }

    if (ctx.find_intentions(opponent, 'bishop_captures_hanging_bishop').next().value) {
      if (ctx.find_intentions(player, 'bishop_captures_rook').next().value) {
        return 2
      }


      if (ctx.find_intentions(player, 'rook_takes_knight').next().value) {
        return .1
      }

      return -4
    }
    if (ctx.find_intentions(player, 'bishop_captures_hanging_bishop').next().value) {
      if (ctx.find_intentions(opponent, 'rook_takes_knight').next().value) {
        return .1
      }


      return 4
    }



    if (ctx.find_intentions(opponent, 'bishop_captures_queen').next().value) {
      return -9
    }
    if (ctx.find_intentions(player, 'bishop_captures_queen').next().value) {
      return 9
    }


    if (ctx.find_intentions(opponent, 'king_captures_rook').next().value) {
      return -5
    }

    if (
      ctx.find_intentions(opponent, 'bishop_captures_rook').next().value &&
      ctx.find_intentions(player, 'bishop_captures_rook').next().value
    ) {
      return 0
    }

    if (ctx.find_intentions(opponent, 'bishop_captures_rook').next().value) {
      return -6.7
    }



    if (ctx.find_intentions(player, 'bishop_captures_rook').next().value) {
      return 6.2
    }



    if (ctx.find_intentions(player, 'pawn_captures_rook').next().value) {
      return 5
    }
    if (ctx.find_intentions(opponent, 'pawn_captures_rook').next().value) {
      return -5
    }




    if (ctx.find_intentions(opponent, 'rook_takes_knight').next().value) {
      if (ctx.find_intentions(player, 'pawn_captures_knight').next().value) {
        return 0.3

      }
      return -3
    }

    if(ctx.find_intentions(player, 'queen_captures_hanging_rook').next().value) {
      return 5.7
    }



    if(ctx.find_intentions(opponent, 'queen_captures_queen').next().value) {

      if (ctx.find_intentions(player, 'rook_captures_queen').next().value) {
        return 0
      }
      if (ctx.find_intentions(player, 'pawn_captures_queen').next().value) {
        return 0
      }
      return - 10
    }

    if (ctx.find_intentions(opponent, 'king_captures_bishop_fork').next().value) {

      return -5
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
    let p_n = ctx.find_intentions(player, 'pawn_captures_knight').next().value
    if (p_n) {
      return 3
    }
    let o_n = ctx.find_intentions(opponent, 'pawn_captures_knight').next().value
    if (o_n) {
      return -3
    }

    return 0
  },
    is_terminal: function (isMaximizing: boolean, ctx: MyAlphaChatStateContext, mz: PositionMaterializer): boolean {
      let player: MinMaxPlayer = isMaximizing ? 'max' : 'min'

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

        let mz_fu = mz_future(mz, { from: r_r.from, to: r_r.to })
        if (mz_fu.mate) {
          push('mate', r_r, move)
        } else {
          push('rook_captures_queen', r_r, move)
        }
      }

      for (let r_r of mzt.bishop_captures_hanging_pawn) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('bishop_captures_hanging_pawn', r_r, move)
      }

      for (let r_r of mzt.bishop_captures_hanging_knight) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('bishop_captures_hanging_knight', r_r, move)
      }

      for (let r_r of mzt.bishop_captures_hanging_bishop) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('bishop_captures_hanging_bishop', r_r, move)
      }


      for (let r_r of mzt.bishop_attack_queen) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('bishop_attack_queen', r_r, move)
      }



      for (let r_r of mzt.bishop_captures_queen) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('bishop_captures_queen', r_r, move)
      }

      for (let r_r of mzt.bishop_captures_rook) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('bishop_captures_rook', r_r, move)
      }

      for (let r_r of mzt.queen_takes_knight) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('queen_takes_knight', r_r, move)
      }



      for (let r_r of mzt.queen_captures_hanging_rook) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue


        let mz_fu = mz_future(mz, { from: r_r.from, to: r_r.to })
        if (mz_fu.mate) {
          push('mate', r_r, move)
        } else {
          push('queen_captures_hanging_rook', r_r, move)
        }
      }



      for (let r_r of mzt.queen_captures_queen) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue


        let mz_fu = mz_future(mz, { from: r_r.from, to: r_r.to })
        if (mz_fu.mate) {
          push('mate', r_r, move)
        } else {
          push('queen_captures_queen', r_r, move)
        }
      }

      for (let r_r of mzt.rook_takes_knight) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('rook_takes_knight', r_r, move)
      }

      for (let r_r of mzt.rook_captures_bishop) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('rook_captures_bishop', r_r, move)
      }

      for (let r_r of mzt.rook_captures_rook) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('rook_captures_rook', r_r, move)
      }

      for (let r_r of mzt.knight_captures_bishop) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('knight_captures_bishop', r_r, move)
      }


      for (let r_r of mzt.knight_captures_queen) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('knight_captures_queen', r_r, move)
      }



      for (let r_r of mzt.pawn_captures_knight) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('pawn_captures_knight', r_r, move)
      }


      for (let r_r of mzt.pawn_captures_bishop) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('pawn_captures_bishop', r_r, move)
      }

      for (let r_r of mzt.pawn_captures_queen) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('pawn_captures_queen', r_r, move)
      }


      for (let r_r of mzt.pawn_captures_rook) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('pawn_captures_rook', r_r, move)
      }

      for (let d_c of mzt.discovered_check) {
        let move = make_move_from_to(d_c.from, d_c.to)
        if (!legals.includes(move)) continue
        push('discovered_check', d_c, move)
      }

      for (let r_r of mzt.uncapturable_knight_check) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue

        let mz_fu = mz_future(mz, { from: r_r.from, to: r_r.to })
        if (mz_fu.mate) {
          push('mate', r_r, move)
        } else {
          push('check', r_r, move)
        }
      }

      for (let d_c of mzt.king_captures_bishop) {
        let move = make_move_from_to(d_c.from, d_c.to)
        if (!legals.includes(move)) continue
        push('king_captures_bishop', d_c, move)
      }



      for (let d_c of mzt.king_captures_rook) {
        let move = make_move_from_to(d_c.from, d_c.to)
        if (!legals.includes(move)) continue
        push('king_captures_rook', d_c, move)
      }

      for (let d_c of mzt.queen_captures_bishop) {
        let move = make_move_from_to(d_c.from, d_c.to)
        if (!legals.includes(move)) continue
        push('queen_captures_bishop', d_c, move)
      }

      for (let d_c of mzt.queen_captures_pin_defended_pawn) {
        let move = make_move_from_to(d_c.from, d_c.to)
        if (!legals.includes(move)) continue
        push('queen_captures_pin_defended_pawn', d_c, move)
      }




      for (let d_c of mzt.king_evades_check) {
        let move = make_move_from_to(d_c.from, d_c.to)
        if (!legals.includes(move)) continue
        push('king_evades_check', d_c, move)
      }

      for (let d_c of mzt.queen_evades_attack) {
        let move = make_move_from_to(d_c.from, d_c.to)
        if (!legals.includes(move)) continue
        push('queen_evades_attack', d_c, move)
      }





      for (let r_r of mzt.rook_attacks_queen) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('rook_attacks_queen', r_r, move)
      }

      for (let r_r of mzt.rook_check) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('check', r_r, move)
      }

      for (let r_r of mzt.blocks_check) {
        let move = make_move_from_to(r_r.from, r_r.to)
        if (!legals.includes(move)) continue
        push('blocks_check', r_r, move)
      }




    for (let q_m of mzt.queen_bishop_check) {
      let move = make_move_from_to(q_m.queen, q_m.to)
      if (!legals.includes(move)) continue

      let mz_fu = mz_future(mz, { from: q_m.queen, to: q_m.to })
      if (mz_fu.mate) {
        push('mate', q_m, move)
      } else {
        push('check', q_m, move)
      }
    }

    for (let q_m of mzt.queen_rook_through_mate) {
      let move = make_move_from_to(q_m.queen, q_m.to)

      if (!legals.includes(move)) continue

      push('mate', q_m, move)
    }

    for (let q_m of mzt.queen_bishop_through_check) {
      let move = make_move_from_to(q_m.queen, q_m.to)

      if (!legals.includes(move)) continue


      let mz_fu = mz_future(mz, { from: q_m.queen, to: q_m.to })
      if (mz_fu.mate) {
        push('mate', q_m, move)
      } else {
        push('check', q_m, move)
      }
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


    for (let q_m of mzt.queen_see_king_with_bishop) {
      for (let d_d of mz_ff.defend_double_from_see2) {
        if (q_m.king_to !== d_d.to) {
          continue
        }
        let move = make_move_from_to(d_d.from, d_d.to_a)

        if (!legals.includes(move)) continue

        push('double_defend_king', q_m, move)
      }
    }

    for (let q_m of mzt.queen_see_king_with_bishop_through) {
      for (let d_d of mz_ff.defend_double_from_see2) {
        if (q_m.king_to !== d_d.to) {
          continue
        }
        let move = make_move_from_to(d_d.from, d_d.to_a)

        if (!legals.includes(move)) continue

        push('double_defend_king', q_m, move)
      }
    }




    /*
    for (let r of res) {
      let legal = move_c_to_Move(mz.nodes.move_of_world(r.move))

      let fu = mz_future(mz, legal)

      mz.inc_make_world(r.move)

      for (let legal2  of fu._mz_views.legals) {

        let fu2 = mz_future(mz, legal2)

        if (fu2.mate) {

          for (let q_m of mz_ff.defend_double_from_see2) {
            if (q_m.from_b !== mz_ff.turn_king.from) {
              continue
            }
            let move = make_move_from_to(q_m.from, q_m.to_a)

            if (!legals.includes(move)) continue

            console.log(q_m)
            //push('defend_double', q_m, move)
          }
        }
      }

      mz.inc_unmake_world(r.move)
    }
      */

    return res
  }
}


function mk_push(player: MinMaxPlayer, type_feature: string, res: GeneratedMove<WorldId>[], w: WorldId, mz: PositionMaterializer, payload: any) {

  let move = mz.inc_add_move(w)
  if (res.find(_ => _.move === move)) {
    //return
  }
        res.push({
          move,
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


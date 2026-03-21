import type { AlphaChatStateHooks, MyAlphaChatStateContext } from './alpha_beta_v2'
import { ContextDelta, FeatureContribution, GeneratedMove, Intention, intentionEqual } from './chat_alpha'
import { make_move_from_to } from './distill/hopefox_c'
import { mz_forks, mz_typed_forks, mz_views } from './get_features'
import { PositionMaterializer, WorldId } from './pos_materializer'

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

export const hooks: AlphaChatStateHooks = {
    evaluate: function (ctx: MyAlphaChatStateContext, mz: PositionMaterializer): number {
        let q_m = ctx.find_intentions('queen_mate').next().value
        if (q_m) {
          return 5000
        }


        let n_c = ctx.find_intentions('knight_captures_hanging_queen').next().value
        if (n_c) {
          return -5
        }
        let k_c = ctx.find_intentions('king_captures_bishop_fork').next().value
        if (k_c) {
          return -5
        }
        let b_f = ctx.find_intentions('bishop_forks_king_and_rook').next().value
        if (b_f) {
          return 5
        }

        return 0
    },
    is_terminal: function (ctx: MyAlphaChatStateContext, mz: PositionMaterializer): boolean {
      let is_mate = ctx.find_intentions('queen_bishop_mate').next().value

      if (is_mate) {
        return true
      }


        return false
    },
    list_moves: function (isMaximizing: boolean, ctx: MyAlphaChatStateContext, mz: PositionMaterializer): GeneratedMove<WorldId>[] {

      let mz_vv = mz_views(mz)
      let mz_ff = mz_forks(mz_vv)
      let mzt = mz_typed_forks(mz_vv, mz_ff)
      let legals = mz.inc_generate_legal_moves()

      let res: GeneratedMove<WorldId>[] = []



      for (let r_r of mzt.queen_captures_queen) {
        let move = make_move_from_to(r_r.from, r_r.to)

        if (!legals.includes(move)) continue

        res.push({
          move: mz.inc_add_move(move),
          featureContributions: [{
            feature: 'queen_captures_queen',
            delta: 0,
            weighted: 1
          }],
          intentionDelta: {
            features: [],
            addedIntentions: [{
              id: `${move}`,
              type: 'queen_captures_queen',
              payload: r_r,
              createdAtDepth: 0,
              lastUpdatedDepth: 0,
              status: 'active'
            }],
            removedIntentions: [],
            updatedIntentions: []
          }
        })
      }




      for (let r_r of mzt.rook_captures_rook) {
        let move = make_move_from_to(r_r.from, r_r.to)

        if (!legals.includes(move)) continue

        res.push({
          move: mz.inc_add_move(move),
          featureContributions: [{
            feature: 'rook_captures_rook',
            delta: 0,
            weighted: 1
          }],
          intentionDelta: {
            features: [],
            addedIntentions: [{
              id: `${move}`,
              type: 'rook_captures_rook',
              payload: r_r,
              createdAtDepth: 0,
              lastUpdatedDepth: 0,
              status: 'active'
            }],
            removedIntentions: [],
            updatedIntentions: []
          }
        })
      }



    for (let q_a of ctx.find_intentions('queen_attacks_hanging_knight')) {

      for (let n_c of mzt.knight_takes_hanging_queen) {
        if (n_c.to !== q_a.payload.to) {
          continue
        }

        let move = make_move_from_to(n_c.from, n_c.to)

        if (!legals.includes(move)) continue

        res.push({
          move: mz.inc_add_move(move),
          featureContributions: [{
            feature: 'knight_captures_hanging_queen',
            delta: 0,
            weighted: 1
          }],
          intentionDelta: {
            features: [],
            addedIntentions: [{
              id: `${move}`,
              type: 'knight_captures_hanging_queen',
              payload: undefined,
              createdAtDepth: 0,
              lastUpdatedDepth: 0,
              status: 'active'
            }],
            removedIntentions: [],
            updatedIntentions: []
          }
        })
      }

    }





    for (let b_f of ctx.find_intentions('bishop_forks_king_and_rook')) {

      for (let k_c of mz_ff.turn_king_capturable) {
        if (k_c.to !== b_f.payload.to) {
          continue
        }

        let move = make_move_from_to(k_c.from, k_c.to)

        if (!legals.includes(move)) continue

        res.push({
          move: mz.inc_add_move(move),
          featureContributions: [{
            feature: 'king_captures_bishop_fork',
            delta: 0,
            weighted: 1
          }],
          intentionDelta: {
            features: [],
            addedIntentions: [{
              id: `${move}`,
              type: 'king_captures_bishop_fork',
              payload: undefined,
              createdAtDepth: 0,
              lastUpdatedDepth: 0,
              status: 'active'
            }],
            removedIntentions: [],
            updatedIntentions: []
          }
        })


      }

    }


    for (let q_m of mzt.queen_attacks_hanging_knight) {
      let move = make_move_from_to(q_m.from, q_m.to)

      if (!legals.includes(move)) continue

      res.push({
        move: mz.inc_add_move(move),
        featureContributions: [{
          feature: 'queen_attacks_hanging_knight',
          delta: 0,
          weighted: 1
        }],
        intentionDelta: {
          features: [],
          addedIntentions: [{
            id: `${move}`,
            type: 'queen_attacks_hanging_knight',
            payload: q_m,
            createdAtDepth: 0,
            lastUpdatedDepth: 0,
            status: 'active'
          }],
          removedIntentions: [],
          updatedIntentions: []
        }
      })

    }



    for (let q_m of mzt.queen_bishop_mate) {
      let move = make_move_from_to(q_m.queen, q_m.to)

      if (!legals.includes(move)) continue

      res.push({
        move: mz.inc_add_move(move),
        featureContributions: [{
          feature: 'queen_mate',
          delta: 0,
          weighted: 1
        }],
        intentionDelta: {
          features: [],
          addedIntentions: [{
            id: `${move}`,
            type: 'queen_mate',
            payload: undefined,
            createdAtDepth: 0,
            lastUpdatedDepth: 0,
            status: 'active'
          }],
          removedIntentions: [],
          updatedIntentions: []
        }
      })

    }

    for (let b_f of mzt.bishop_forks_king_and_rook) {
      let move = make_move_from_to(b_f.from, b_f.to)

      if (!legals.includes(move)) continue

      res.push({
        move: mz.inc_add_move(move),
        featureContributions: [{
          feature: 'bishop_forks_king_and_rook',
          delta: 0,
          weighted: 1
        }],
        intentionDelta: {
          features: [],
          addedIntentions: [{
            id: `${move}`,
            type: 'bishop_forks_king_and_rook',
            payload: b_f,
            createdAtDepth: 0,
            lastUpdatedDepth: 0,
            status: 'active'
          }],
          removedIntentions: [],
          updatedIntentions: []
        }
      })

    }


    return res
  }
}
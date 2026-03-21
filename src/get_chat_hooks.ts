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
        let b_f = ctx.find_intentions('bishop_fork')
        if (b_f.length > 0) {
          return 5
        }
        return 0
    },
    is_terminal: function (ctx: MyAlphaChatStateContext, mz: PositionMaterializer): boolean {
      let is_mate = ctx.find_intentions('queen_bishop_mate').length > 0

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
                  feature: 'bishop_fork',
                  delta: 0,
                  weighted: 1
                }],
                intentionDelta: {
                  features: [],
                  addedIntentions: [{
                    id: `${move}`,
                    type: 'bishop_fork',
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


            return res
    }
}
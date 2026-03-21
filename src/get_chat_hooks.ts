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
        let b_f = ctx.intentions.values().find(_ => _.type === 'bishop_fork')
        if (b_f) {
          return 5
        }
        return 0
    },
    is_terminal: function (ctx: MyAlphaChatStateContext, mz: PositionMaterializer): boolean {
        return false
    },
    list_moves: function (isMaximizing: boolean, ctx: MyAlphaChatStateContext, mz: PositionMaterializer): GeneratedMove<WorldId>[] {

            let mz_vv = mz_views(mz)
            let mz_ff = mz_forks(mz_vv)
            let mzt = mz_typed_forks(mz_vv, mz_ff)
            let legals = mz.inc_generate_legal_moves()

            let res: GeneratedMove<WorldId>[] = []

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
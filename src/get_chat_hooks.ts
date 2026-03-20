import type { AlphaChatStateContext, AlphaChatStateHooks } from './alpha_beta_v2'
import { ContextDelta, FeatureContribution } from './chat_alpha'
import { mz_forks, mz_typed_forks, mz_views } from './get_features'
import { PositionMaterializer, WorldId } from './pos_materializer'

class MyAlphaChatStateContext implements AlphaChatStateContext {

    applyIntentionDelta(delta: ContextDelta): void {
        throw new Error('Method not implemented.')
    }
    clone(): AlphaChatStateContext {
        let res = new MyAlphaChatStateContext()

        return res
    }
    diff(b: AlphaChatStateContext): ContextDelta {
        let res: ContextDelta = {
            features: [],
            addedIntentions: [],
            removedIntentions: [],
            updatedIntentions: []
        }

        return res
    }

}

export const ctx = new MyAlphaChatStateContext()


export const hooks: AlphaChatStateHooks = {
    evaluate: function (ctx: AlphaChatStateContext, mz: PositionMaterializer): number {
        return 0
    },
    is_terminal: function (ctx: AlphaChatStateContext, mz: PositionMaterializer): boolean {
        return false
    },
    list_moves: function (isMaximizing: boolean, ctx: AlphaChatStateContext, mz: PositionMaterializer): [WorldId, FeatureContribution[]][] {

            let mz_vv = mz_views(mz)
            let mz_ff = mz_forks(mz_vv)
            let mzt = mz_typed_forks(mz_vv, mz_ff)


            let legals = mz.inc_generate_legal_moves()

            let res: [WorldId, FeatureContribution[]][] = []

            return res
    }
}
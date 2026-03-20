import type { AlphaChatStateContext, AlphaChatStateHooks } from './alpha_beta_v2'
import { ContextDelta, FeatureContribution, Intention, intentionEqual } from './chat_alpha'
import { mz_forks, mz_typed_forks, mz_views } from './get_features'
import { PositionMaterializer, WorldId } from './pos_materializer'



class MyAlphaChatStateContext implements AlphaChatStateContext {


    static diff(self: MyAlphaChatStateContext, other: MyAlphaChatStateContext): Omit<ContextDelta, 'features'> {
        const added: Intention[] = [];
        const removed: Intention[] = [];
        const updated: Intention[] = [];

        const aMap = self.intentions;
        const bMap = other.intentions;

        // detect added + updated
        for (const [id, bIntent] of bMap) {
            const aIntent = aMap.get(id);

            if (!aIntent) {
                added.push(bIntent);
            } else if (!intentionEqual(aIntent, bIntent)) {
                updated.push(bIntent);
            }
        }

        // detect removed
        for (const [id, aIntent] of aMap) {
            if (!bMap.has(id)) {
                removed.push(aIntent);
            }
        }

        return {
            addedIntentions: added,
            removedIntentions: removed,
            updatedIntentions: updated,
        };
}

    constructor(readonly intentions: Map<string, Intention>) {

    }

    applyIntentionDelta(delta: ContextDelta): void {
    }

    clone(): AlphaChatStateContext {
        let res = new MyAlphaChatStateContext(new Map(this.intentions))
        return res
    }

    diff(b: MyAlphaChatStateContext): Omit<ContextDelta, 'features'> {
        return MyAlphaChatStateContext.diff(this, b)
    }
}


export const ctx = new MyAlphaChatStateContext(new Map())


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
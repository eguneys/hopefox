import { ContextDelta, FeatureContribution, GameState, GeneratedMove, Intention, intentionEqual, IntentionType, MinMaxPlayer, SearchResult } from "./chat_alpha";
import { exampleUsage } from "./chat_alpha_v2";
import { MoveC, PositionC, PositionManager } from "./distill/hopefox_c";
import { PositionMaterializer, WorldId } from "./pos_materializer";
import * as Get_Chat_Hooks from './get_chat_hooks'

export class ChessChatGameState implements GameState<WorldId, AlphaChatStateContext> {

    static alpha_beta_summary = (mz: PositionMaterializer, depth: number, hooks: AlphaChatStateHooks, ctx: AlphaChatStateContext, solution: SAN[], multiPV: number) => {
        let state = new ChessChatGameState(mz, hooks, ctx)
        //alphaBeta(state, depth, -Infinity, Infinity, true)
        return exampleUsage(mz, state, depth, solution, multiPV)
    }



    constructor(readonly mz: PositionMaterializer, readonly hooks: AlphaChatStateHooks, readonly ctx: AlphaChatStateContext) {}

    get_lambda() {
        return 0.2
    }

    print_history() {
        return this.mz.inc_sans()
    }

    undoIntentionDelta(delta: ContextDelta): void {
        this.ctx.undoIntentionDelta(delta)
    }
    applyIntentionDelta(delta: ContextDelta): void {
        this.ctx.applyIntentionDelta(delta)
    }
    generateMovesWithIntentions(isMaximizing: boolean): GeneratedMove<WorldId>[] {
        return this.hooks.list_moves(isMaximizing, this.ctx, this.mz)
    }
    makeMove(world_id: WorldId): void {
        this.mz.inc_make_world(world_id)
    }
    unmakeMove(world_id: WorldId): void {
        this.mz.inc_unmake_world(world_id)
    }
    evaluate(isMaximizing: boolean): number {
        return this.hooks.evaluate(isMaximizing, this.ctx, this.mz)
    }
    isGameOver(isMaximizing: boolean): boolean {
        return this.hooks.is_terminal(isMaximizing, this.ctx, this.mz)
    }
    cloneContext(): AlphaChatStateContext {
        return this.ctx.clone()
    }
    getContext(): AlphaChatStateContext {
        return this.ctx
    }
    diffContext(a: AlphaChatStateContext, b: AlphaChatStateContext): Omit<ContextDelta, 'features'> {
        return a.diff(b)
    }

}


export type AlphaChatStateHooks = {
    evaluate(isMaximizing: boolean, ctx: AlphaChatStateContext, mz: PositionMaterializer): number
    is_terminal(isMaximizing: boolean, ctx: AlphaChatStateContext, mz: PositionMaterializer): boolean
    list_moves(isMaximizing: boolean, ctx: AlphaChatStateContext, mz: PositionMaterializer): GeneratedMove<WorldId>[]
}

export interface AlphaChatStateContext {
    clone(): AlphaChatStateContext
    diff(b: AlphaChatStateContext): Omit<ContextDelta, 'features'>
    applyIntentionDelta(delta: ContextDelta): void
    undoIntentionDelta(delta: ContextDelta): void
}



export class MyAlphaChatStateContext implements AlphaChatStateContext {


    static diff(self: MyAlphaChatStateContext, other: MyAlphaChatStateContext): Omit<ContextDelta, 'features'> {
        const added: Intention[] = [];
        const removed: Intention[] = [];
        const updated: { before: Intention, after: Intention }[] = [];

        const aMap = self.intentions;
        const bMap = other.intentions;

        // detect added + updated
        for (const [id, bIntent] of bMap) {
            const aIntent = aMap.get(id);

            if (!aIntent) {
                added.push(bIntent);
            } else if (!intentionEqual(aIntent, bIntent)) {
                updated.push({ before: aIntent, after: bIntent });
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

    constructor(readonly intentions: Map<string, Intention>) {}

    find_intentions(player: MinMaxPlayer, type: IntentionType) {
        return this.intentions.values().filter(_ => _.type === type && _.player === player)
    }

    applyIntentionDelta(delta: ContextDelta): void {
        for (const intent of delta.removedIntentions) {
            this.intentions.delete(intent.id)
        }

        for (const intent of delta.addedIntentions) {
            this.intentions.set(intent.id, intent)
        }

        for (const intent of delta.updatedIntentions) {
            this.intentions.delete(intent.before.id)
            this.intentions.set(intent.after.id, intent.after)
        }
    }

    undoIntentionDelta(delta: ContextDelta) {
        // reverse order

        // undo updates // restore previous version
        /*  TODO */
        for (const intent of delta.updatedIntentions) {
            this.intentions.delete(intent.after.id)
            this.intentions.set(intent.before.id, intent.before)
        }


        for (const intent of delta.addedIntentions) {
            this.intentions.delete(intent.id)
        }

        for (const intent of delta.removedIntentions) {
            this.intentions.set(intent.id, intent)
        }
    }

    clone(): AlphaChatStateContext {
        let res = new MyAlphaChatStateContext(new Map(this.intentions))
        return res
    }

    diff(b: MyAlphaChatStateContext): Omit<ContextDelta, 'features'> {
        return MyAlphaChatStateContext.diff(this, b)
    }
}





type SAN = string
export function solve(mz: PositionMaterializer, solution: SAN[], multiPV: number) {
    const ctx = new MyAlphaChatStateContext(new Map())
    let { hooks } = Get_Chat_Hooks
    return ChessChatGameState.alpha_beta_summary(mz, 5, hooks, ctx, solution, multiPV)
}


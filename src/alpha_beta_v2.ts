import { ContextDelta, FeatureContribution, GameState, GeneratedMove, Intention, intentionEqual, SearchResult } from "./chat_alpha";
import { exampleUsage } from "./chat_alpha_v2";
import { MoveC, PositionC, PositionManager } from "./distill/hopefox_c";
import { PositionMaterializer, WorldId } from "./pos_materializer";
import * as Get_Chat_Hooks from './get_chat_hooks'

export class ChessChatGameState implements GameState<WorldId, AlphaChatStateContext> {

    static alpha_beta_summary = (m: PositionManager, pos: PositionC, depth: number, hooks: AlphaChatStateHooks, ctx: AlphaChatStateContext, solution: SAN[]) => {
        let state = new ChessChatGameState(m, pos, hooks, ctx)
        //alphaBeta(state, depth, -Infinity, Infinity, true)
        return exampleUsage(state, depth, solution)
    }



    mz: PositionMaterializer
    constructor(readonly m: PositionManager, readonly pos: PositionC, readonly hooks: AlphaChatStateHooks, readonly ctx: AlphaChatStateContext) {
        this.mz = new PositionMaterializer(m, pos)
    }


    get_pv(result: SearchResult<WorldId>) {
        let res = []

        if (!result.moveDeltas) {
            return []
        }

        /*
        for (let m of result.moveDeltas) {
            if (m.isPV) {
                res.push(this.mz.sans(m.move))
            }
        }
            */

        let pv = result.moveDeltas.filter(_ => _.isPV)
        if (pv.length === 0) {
            return []
        }
        return this.mz.sans(pv[pv.length - 1].move)
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
    evaluate(): number {
        return this.hooks.evaluate(this.ctx, this.mz)
    }
    isGameOver(): boolean {
        return this.hooks.is_terminal(this.ctx, this.mz)
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
    evaluate(ctx: AlphaChatStateContext, mz: PositionMaterializer): number
    is_terminal(ctx: AlphaChatStateContext, mz: PositionMaterializer): boolean
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
export function solve(m: PositionManager, pos: PositionC, solution: SAN[]) {
    const ctx = new MyAlphaChatStateContext(new Map())
    let { hooks } = Get_Chat_Hooks
    return ChessChatGameState.alpha_beta_summary(m, pos, 2, hooks, ctx, solution)
}


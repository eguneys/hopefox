import { ContextDelta, FeatureContribution, GameState } from "./chat_alpha";
import { exampleUsage } from "./chat_alpha_v2";
import { PositionC, PositionManager } from "./distill/hopefox_c";
import { PositionMaterializer, WorldId } from "./pos_materializer";
import * as Get_Chat_Hooks from './get_chat_hooks'

export class ChessChatGameState implements GameState<WorldId, AlphaChatStateContext> {

    static alpha_beta_summary = (m: PositionManager, pos: PositionC, depth: number, hooks: AlphaChatStateHooks, ctx: AlphaChatStateContext) => {
        let state = new ChessChatGameState(m, pos, hooks, ctx)
        //alphaBeta(state, depth, -Infinity, Infinity, true)
        exampleUsage(state, depth)

        let res: string[][] = []

        return res
    }



    mz: PositionMaterializer
    constructor(readonly m: PositionManager, readonly pos: PositionC, readonly hooks: AlphaChatStateHooks, readonly ctx: AlphaChatStateContext) {
        this.mz = new PositionMaterializer(m, pos)
    }
    applyIntentionDelta(delta: ContextDelta): void {
        this.ctx.applyIntentionDelta(delta)
    }
    generateMovesWithIntentions(isMaximizing: boolean): [WorldId, FeatureContribution[]][] {
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
    list_moves(isMaximizing: boolean, ctx: AlphaChatStateContext, mz: PositionMaterializer): [WorldId, FeatureContribution[]][]
}

export interface AlphaChatStateContext {
    clone(): AlphaChatStateContext
    diff(b: AlphaChatStateContext): Omit<ContextDelta, 'features'>
    applyIntentionDelta(delta: ContextDelta): void
}


export function solve(m: PositionManager, pos: PositionC) {
    let { hooks, ctx } = Get_Chat_Hooks
    return ChessChatGameState.alpha_beta_summary(m, pos, 2, hooks, ctx)
}


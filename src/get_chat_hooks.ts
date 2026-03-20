import type { AlphaChatStateContext, AlphaChatStateHooks } from './alpha_beta_v2'
import { ContextDelta } from './chat_alpha'
import { PositionMaterializer, WorldId } from './pos_materializer'

class MyAlphaChatStateContext implements AlphaChatStateContext {
    clone(): AlphaChatStateContext {
        throw new Error('Method not implemented.')
    }
    diff(b: AlphaChatStateContext): ContextDelta {
        throw new Error('Method not implemented.')
    }

}

export const ctx = new MyAlphaChatStateContext()


export const hooks: AlphaChatStateHooks = {
    evaluate: function (ctx: AlphaChatStateContext, mz: PositionMaterializer): number {
        throw new Error('Function not implemented.')
    },
    is_terminal: function (ctx: AlphaChatStateContext, mz: PositionMaterializer): boolean {
        throw new Error('Function not implemented.')
    },
    list_moves: function (isMaximizing: boolean, ctx: AlphaChatStateContext, mz: PositionMaterializer): WorldId[] {
        throw new Error('Function not implemented.')
    }
}
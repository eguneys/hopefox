import { evaluate, generate_moves } from './evaluate'
import { Node, Context, FeatureDelta, PvLine } from './types'

function negaMax(pv_line: PvLine[], node: Node, ctx: Context, depth: number, alpha: number, beta: number, color: number) {
    if (depth === 0) {
        return color * evaluate(node)
    }

    let side = (color > 0)

    let moves = generate_moves(ctx, side)


    if (moves.length === 0) {
        return color * evaluate(node)
    }

    let foundMove = false

    for (let i = 0; i < moves.length; i++) {
        let { move, delta } = moves[i]

        let checkpoint = node.mark()

        node.ply++;

        node.apply_delta(delta)

        ctx.mz.make_to_world(move)

        let score = -negaMax(pv_line, node, ctx, depth - 1, -beta, -alpha, -color)


        node.rollback(checkpoint)

        node.ply--;

        ctx.mz.unmake_world(move)


        if (!foundMove || score > alpha) {
            foundMove = true
            alpha = score

            pv_line.push({move, score})
        }

        if (alpha >= beta)
            break;
    }

    return alpha
}


export function search(pv_line: PvLine[], node: Node, ctx: Context, depth: number) {
    return negaMax(pv_line, node, ctx, depth, -Infinity, Infinity, 1)
}
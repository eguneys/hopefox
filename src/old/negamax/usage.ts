import { Context, Node, PvLine } from './types'
import { search } from "./negamax";
import { PositionMaterializer } from '../pos_materializer';
import { PositionC, PositionManager } from '../distill/hopefox_c';

export function usage(m: PositionManager, pos: PositionC, depth: number) {

    let pv_line: PvLine[] = []
    let node = new Node()
    let ctx: Context = { mz: new PositionMaterializer(m, pos) }

    search(pv_line, node, ctx, depth)

    return pv_line
}
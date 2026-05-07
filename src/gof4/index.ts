import { PositionC, PositionManager } from "../distill/hopefox_c";
import { parse_and_create_bindings, visual_fill_run_bindings } from "./gofer";
import { visual_parse_nested_graph_root } from "./parser";

export function usage(code: string) {

    let bb = parse_and_create_bindings(code)
    let vv = visual_parse_nested_graph_root(code)

    return (m: PositionManager, pos: PositionC) => {
        return bb.flatMap((b, i) => visual_fill_run_bindings(vv[i], b, m, pos))
    }
}


export * from './log'
export * from './types'
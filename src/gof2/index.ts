import { PositionC, PositionManager } from "../distill/hopefox_c";
import { parse_and_create_bindings, run_bindings } from "./gofer3";

export function usage(code: string) {

    let bb = parse_and_create_bindings(code)

    return (m: PositionManager, pos: PositionC) => {
        return bb.flatMap(b => run_bindings(b, m, pos))
    }
}
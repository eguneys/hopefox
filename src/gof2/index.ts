import { PositionC, PositionManager } from "../distill/hopefox_c";
import { parse_and_create_bindings, run_bindings } from "./gofer";

export function usage(code: string) {

    let b = parse_and_create_bindings(code)

    return (m: PositionManager, pos: PositionC) => {
        return run_bindings(b, m, pos)
    }
}
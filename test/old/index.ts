import { compile_str_to_composite_defs } from "./compiler";
import { compile_str_to_gof } from "./gof_compiler";

export function gofchess(text_defs: string, text_gof: string) {
    let defs = compile_str_to_composite_defs(text_defs)
    let gof = compile_str_to_gof(text_gof)

    console.log(defs, gof)
}
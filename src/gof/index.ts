import { compile_str_to_composite_defs } from "./compiler";
import { Clear_table, compile_str_to_gof } from "./gof_compiler";
import { Clear_table as Clear_table2, Gofer, gofer } from "./gofer";

export function gofchess(text_defs: string, text_gof: string): Gofer {

    Clear_table()
    Clear_table2()

    let defs = compile_str_to_composite_defs(text_defs)
    let gof = compile_str_to_gof(text_gof)

    return gofer(defs, gof)
}
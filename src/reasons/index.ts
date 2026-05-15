import { PositionC, PositionManager } from "../distill/hopefox_c"
import { parse_defs } from "../gof4/parser"
import { AtomicActionCall, AtomicCall, AtomicFilterCall, CompositeActionDefinition, PieceSymbol, Quantification } from "../gof4"
import { sans_to_moves } from "./index_0"
import { History, Columnar } from "../gof2/gofer"
import { AtomicCallNode } from "../gof4/gofer"
import { IndexGroupNodes } from "../gof2/gofer3"
import { atomic_generators } from "./atomic_generators"



export function reason_engine(code: string) {

    
    let defs: CompositeActionDefinition[] = parse_defs(code)
    return (m: PositionManager, pos: PositionC, sans: string[]) => {

        let solution = sans_to_moves(m, pos, sans)

    }
}


export type AtomicGenCallNode = {
    atomic_action: AtomicCall
    start_row_index: number
    end_row_index: number
    children: AtomicGenCallNode[]
}


class BindingIn {

    history_per_row: History[]
    symbol_per_column: PieceSymbol[]
    table: Columnar

    atomic_call_root: AtomicGenCallNode

    static from_position(defs: CompositeActionDefinition[], m: PositionManager, pos: PositionC, solution: string[], depth: number) {

        let res = new BindingIn()

        res.fill_position_in(m, pos, depth)

    }

    fill_position_in(m: PositionManager, pos: PositionC, depth: number) {
        this.history_per_row = []
        this.table = new Columnar()

        this.history_per_row.push([])

        this.atomic_call_root = {
            start_row_index: 0,
            end_row_index: 1,
            children: [],
        }

        this.atomic_gen_step_for_node(m, pos, this.atomic_call_root, depth)
    }

    atomic_gen_step_for_node(m: PositionManager, pos: PositionC, node: AtomicGenCallNode, depth: number) {

        node.children = this.run_action_gen_on_position(m, pos, node.start_row_index, node.end_row_index)

        if (node.children.length === 0 || depth === 0) {
            return
        }


        for (let i = 0; i < node.children.length; i++) {
            this.atomic_gen_step_for_node(m, pos, node.children[i], depth - 1)
        }
    }


    run_action_gen_on_position(m: PositionManager, pos: PositionC, start_row_index: number, end_row_index: number) {

        let res: AtomicGenCallNode[] = []

        for (let generator of atomic_generators) {
            let rr = generator(m, pos, this.symbol_per_column, this.history_per_row, this.table, start_row_index, end_row_index)

            for (let r of rr) {
                res.push({
                    action: r.action,
                    start_row_index: r.start_row_index,
                    end_row_index: r.end_row_index,
                    children: []
                })
            }
        }

        return res

    }
}
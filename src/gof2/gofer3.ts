import { move_c_to_Move, PositionC, PositionManager } from "../distill/hopefox_c"
import { SquareSet } from "../distill/squareSet"
import { atomic_action_handlers, atomic_filter_handlers } from "./atomic_actions"
import { History, Columnar, DefNotFoundException, FieldsCannotExpandException, extract_action_parameters, extract_fields, history_to_sans } from "./gofer"
import { parse_defs, parse_nested_graph_root } from "./parser"
import { AtomicCall, CompositeActionCallWithQuantification, CompositeActionDefinition, CompositeNestedGraphNode, CompositeNestedGraphRoot, is_atomic_action, is_psymbol2, PieceSymbol, Quantification, symbol_equals, VSymbol } from "./types"

class UnreachableCodeException extends Error {

}

export type AtomicCallNode = {
    quantification: Quantification
    actions: AtomicCall[]
    children: AtomicCallNode[]
}

export class BindingOutWithQuantifiers {
    table: Columnar
    start_row_index: number

    symbol_per_column: PieceSymbol[]
    history_per_row: History[]

    atomic_call_root!: AtomicCallNode

    constructor() {
        this.table = new Columnar()
        this.start_row_index = 0
        this.symbol_per_column = []
        this.history_per_row = []
    }

    static from_defs(defs: CompositeActionDefinition[], node: CompositeNestedGraphNode) {
        let res = new BindingOutWithQuantifiers()

        res.set_table_columns_with_root(node)
        res.fill_atomic_call_tree(defs, node)
        return res
    }

    get_history_for_groups(group: IndexGroups) {
        return group.map(_ => this.history_per_row.slice(_.start_row_index, _.end_row_index))
    }


    fill_atomic_call_tree(defs: CompositeActionDefinition[], node: CompositeNestedGraphNode) {

        let symbol_per_column = this.symbol_per_column
        function fill_node(node: CompositeNestedGraphNode): AtomicCallNode {
            let res: AtomicCall[] = []
            let def = defs.find(_ => _.head.id === node.data.call.id)

            if (!def) {
                throw new DefNotFoundException(node.data.call.id)
            }

            for (let b of def.body) {
                let a_params = extract_action_parameters(b.params, def.head.params, node.data.call.params)
                let fields = extract_fields(symbol_per_column, a_params)

                if (!fields) {
                    throw new FieldsCannotExpandException(b.params)
                }

                res.push({
                    id: b.id,
                    fields
                })
            }


            let children = node.children.map(child => fill_node(child))

            return { 
                quantification: node.data.quantification,
                actions: res,
                children
            }
        }

        this.atomic_call_root = fill_node(node)
    }

    set_table_columns_with_root(root: CompositeNestedGraphNode) {

        let { symbol_per_column, table } = this
        function fill_node(node: CompositeNestedGraphNode) {
            for (let param of node.data.call.params) {
                if (is_psymbol2(param)) {
                    if (!symbol_per_column.some(_ => symbol_equals(_, param.a))) {
                        symbol_per_column.push(param.a)
                        table.add_column_type(param.a.id)
                    }
                    if (!symbol_per_column.some(_ => symbol_equals(_, param.b))) {
                        symbol_per_column.push(param.b)
                        table.add_column_type(param.b.id)
                    }
                } else {
                    if (!symbol_per_column.some(_ => symbol_equals(_, param))) {
                        symbol_per_column.push(param)
                        table.add_column_type(param.id)
                    }
                }
            }

            node.children.forEach(_ => fill_node(_))
        }

        fill_node(root)
    }


    fill_history_for_position(m: PositionManager, pos: PositionC) {

        this.history_per_row.length = 0
        this.table.clear_rows()
        this.start_row_index = 0


        for (let i = 0; i < this.table.columns.length; i++) {
            let symbol  = this.symbol_per_column[i]
            let Col = this.table.get_column(i)
            Col.push_raw(SquareSet.full())
        }
        
        this.history_per_row.push([])


        return this.atomic_step_for_node(m, pos, this.atomic_call_root, [{ start_row_index: 0, end_row_index: 1 }])
    }

    atomic_step_for_node(m: PositionManager, pos: PositionC, node: AtomicCallNode, index_group: IndexGroups): IndexGroups {

        let local_groups = []
        for (let index_range of index_group) {
            let index_range_start_row_index = index_range.start_row_index
            let index_range_end_row_index = index_range.end_row_index

            let start_row_index = -1
            let end_row_index = -1
            for (let action of node.actions) {
                let local_begin_index = this.history_per_row.length
                this.run_action_on_position(m, pos, action, index_range_start_row_index, index_range_end_row_index)
                let local_end_index = this.history_per_row.length

                start_row_index = local_begin_index
                end_row_index = local_end_index

                index_range_start_row_index = local_begin_index
                index_range_end_row_index = local_end_index
            }

            if (start_row_index !== end_row_index) {
                local_groups.push({ start_row_index, end_row_index })
            }
        }

        if (node.children.length === 0) {
            return local_groups
        }

        let children_groups = []
        for (let child of node.children) {
            children_groups.push(...this.atomic_step_for_node(m, pos, child, local_groups))
        }

        if (node.quantification === Quantification.IfThen) {
            return children_groups
        } else if (node.quantification === Quantification.ForAll) {

            if (this.local_groups_covered_by_sub_groups(local_groups, children_groups)) {
                return children_groups
            } else {
                return []
            }
        }
        throw new UnreachableCodeException()
    }

    local_groups_covered_by_sub_groups(a: IndexGroups, b: IndexGroups) {
        for (let range of a) {
            outer: for (let i = range.start_row_index; i < range.end_row_index; i++) {
                let h = this.history_per_row[i]

                for (let sub_range of b) {
                    for (let j = sub_range.start_row_index; j < sub_range.end_row_index; j++) {
                        let sub_h = this.history_per_row[j]

                        if (is_subset(h, sub_h)) {
                            continue outer
                        }
                    }
                }

                return false
            }
        }
        return true
    }

    // TODO expects only one action per definition
    extract_S_Covered_from_C0(C0: number[], S0: number[]) {
        let res = []
        for (let i = 0; i < C0.length; i++) {
            let h_0 = this.history_per_row[C0[i]]
            let s0 = h_0[h_0.length - 2]
            for (let j = 0; j < S0.length; j++) {
                let h_1 = this.history_per_row[S0[j]]
                let s1 = h_1[h_1.length - 1]
                if (s0 === s1) {
                    res.push(S0[j])
                }
            }
        }
        return res
    }

    run_action_on_position(m: PositionManager, pos: PositionC, action: AtomicCall, start_row_index: number, end_row_index: number) {
        if (is_atomic_action(action)) {
            atomic_action_handlers[action.id](
                action.fields, 
                start_row_index, 
                end_row_index,
                this.symbol_per_column,
                m,
                pos,
                this.history_per_row,
                this.table
            )
        } else {
            atomic_filter_handlers[action.id](
                action.fields, 
                start_row_index, 
                end_row_index,
                this.symbol_per_column,
                m,
                pos,
                this.history_per_row,
                this.table
            )
        }
    }
}

function is_subset(a: number[], b: number[]) {

    for (let aa of a) {
        if (!b.includes(aa)) {
            return false
        }
    }
    return true
}

export function parse_and_create_bindings(code: string): BindingOutWithQuantifiers[] {
    let defs = parse_defs(code)
    let nodes = parse_nested_graph_root(code)

    return nodes.map(_ => BindingOutWithQuantifiers.from_defs(defs, _))
}


export function run_bindings(b: BindingOutWithQuantifiers, m: PositionManager, pos: PositionC) {
    let gg = b.fill_history_for_position(m, pos)
    if (gg.length === 0) {
        return []
    }

    let res = []

    for (let hh of b.get_history_for_groups(gg)) {
        for (let h of hh) {
            res.push(history_to_sans(h, m, pos))
        }
    }
    return res
}


export type IndexRange = { start_row_index: number, end_row_index: number }
export type IndexGroups = IndexRange[]
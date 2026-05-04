import { PositionC, PositionManager } from "../distill/hopefox_c"
import { SquareSet } from "../distill/squareSet"
import { History, Columnar, DefNotFoundException, FieldsCannotExpandException, extract_action_parameters, history_to_sans } from "../gof2/gofer"
import { IndexGroupNodes, IndexGroups, SansNodes } from "../gof2/gofer3"
import { atomic_action_handlers, atomic_filter_handlers } from "./atomic_actions"
import { parse_defs, parse_nested_graph_root } from "./parser"
import { AtomicCall, CompositeActionDefinition, CompositeNestedGraphNode, is_atomic_action, is_psymbol2, PieceSymbol, Quantification, SAN, symbol_equals, Visual_CompositeNestedGraphNode } from "./types"

export class UnreachableCodeException extends Error { }
export class NotImplementedException extends Error { }

export type AtomicCallNode = {
    quantification: Quantification
    actions: AtomicCall[]
    children: AtomicCallNode[]
}

export class BindingOutWithQuantifiers {
    global_table: Columnar
    table: Columnar

    global_symbols: PieceSymbol[]
    symbol_per_column: PieceSymbol[]
    history_per_row: History[]

    atomic_call_root!: AtomicCallNode

    constructor() {
        this.global_table = new Columnar()
        this.table = new Columnar()
        this.global_symbols = []
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

        let { global_symbols, symbol_per_column } = this
        function fill_node(node: CompositeNestedGraphNode): AtomicCallNode {
            let res: AtomicCall[] = []

            for (let call of node.data.call) {

                let def = defs.find(_ => _.head.id === call.id)

                if (!def) {
                    throw new DefNotFoundException(call.id)
                }

                for (let b of def.body) {
                    let a_params = extract_action_parameters(b.params, def.head.params, call.params)
                    let fields = extract_fields_optional(symbol_per_column, a_params)
                    let fields2 = extract_fields_optional(global_symbols, a_params)

                    if (!fields || !fields2) {
                        throw new FieldsCannotExpandException(b.params)
                    }

                    res.push({
                        id: b.id,
                        fields,
                        fields2
                    })
                }
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

        let { global_symbols, symbol_per_column, table, global_table } = this
        function fill_node(node: CompositeNestedGraphNode) {
            for (let call of node.data.call)
                for (let param of call.params) {
                    if (is_psymbol2(param)) {
                        if (param.a.global_id) {
                            if (!global_symbols.some(_ => symbol_equals(_, param.a))) {
                                global_symbols.push(param.a)
                                global_table.add_column_type(param.a.id)
                            }
                        } else {
                            if (!symbol_per_column.some(_ => symbol_equals(_, param.a))) {
                                symbol_per_column.push(param.a)
                                table.add_column_type(param.a.id)
                            }
                        }
                        if (param.b.global_id) {
                            if (!global_symbols.some(_ => symbol_equals(_, param.b))) {
                                global_symbols.push(param.b)
                                global_table.add_column_type(param.b.id)
                            }
                        } else {
                            if (!symbol_per_column.some(_ => symbol_equals(_, param.b))) {
                                symbol_per_column.push(param.b)
                                table.add_column_type(param.b.id)
                            }
                        }
                    } else {
                        if (param.global_id) {
                            if (!global_symbols.some(_ => symbol_equals(_, param))) {
                                global_symbols.push(param)
                                global_table.add_column_type(param.id)
                            }
                        } else {
                            if (!symbol_per_column.some(_ => symbol_equals(_, param))) {
                                symbol_per_column.push(param)
                                table.add_column_type(param.id)
                            }
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
        this.global_table.clear_rows()

        for (let i = 0; i < this.global_table.columns.length; i++) {
            let symbol  = this.global_symbols[i]
            let Col = this.global_table.get_column(i)
            Col.push_raw(SquareSet.full())
        }
        

        for (let i = 0; i < this.table.columns.length; i++) {
            let symbol  = this.symbol_per_column[i]
            let Col = this.table.get_column(i)
            Col.push_raw(SquareSet.full())
        }
        
        this.history_per_row.push([])


        return this.atomic_step_for_node(m, pos, this.atomic_call_root, { group: [{ start_row_index: 0, end_row_index: 1 }], children: [] })
    }

    atomic_step_for_node(m: PositionManager, pos: PositionC, node: AtomicCallNode, nodes: IndexGroupNodes): IndexGroupNodes {

        let index_group = nodes.group
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
            return { group: local_groups, children: [] } 
        }

        let pass_node: IndexGroupNodes = { group: local_groups, children: [] }
        for (let child of node.children) {
            pass_node.children.push(this.atomic_step_for_node(m, pos, child, pass_node))
        }

        if (node.quantification === Quantification.IfThen) {
            return pass_node
        } else if (node.quantification === Quantification.ForAll) {
            throw new NotImplementedException()
        }
        throw new UnreachableCodeException()
    }

    run_action_on_position(m: PositionManager, pos: PositionC, action: AtomicCall, start_row_index: number, end_row_index: number) {
        if (is_atomic_action(action)) {
            atomic_action_handlers[action.id](
                action.fields, 
                action.fields2,
                start_row_index, 
                end_row_index,
                this.symbol_per_column,
                this.global_symbols,
                m,
                pos,
                this.history_per_row,
                this.table,
                this.global_table
            )
        } else {
            atomic_filter_handlers[action.id](
                action.fields, 
                action.fields2,
                start_row_index, 
                end_row_index,
                this.symbol_per_column,
                this.global_symbols,
                m,
                pos,
                this.history_per_row,
                this.table,
                this.global_table
            )
        }
    }
}

export function extract_fields_optional(symbol_per_column: PieceSymbol[], a_params: PieceSymbol[]) {
    let res = []

    outer: for (let param of a_params) {
        for (let i = 0; i < symbol_per_column.length; i++) {
            if (symbol_equals(param, symbol_per_column[i])) {
                res.push(i)
                continue outer
            }
        }
        res.push(-1)
    }
    return res
}


export function parse_and_create_bindings(code: string): BindingOutWithQuantifiers[] {
    let defs = parse_defs(code)
    let nodes = parse_nested_graph_root(code)

    return nodes.map(_ => BindingOutWithQuantifiers.from_defs(defs, _))
}


export function visual_fill_run_bindings(v: Visual_CompositeNestedGraphNode, b: BindingOutWithQuantifiers, m: PositionManager, pos: PositionC): Visual_CompositeNestedGraphNode {

    let ss = run_bindings(b, m, pos)

    function fill_visual(v: Visual_CompositeNestedGraphNode, s: SansNodes) {
        for (let i = 0; i < v.data.call.length; i++) {
            v.data.call[i].witness = s.sans
        }
        for (let i = 0; i < v.children.length; i++) {
            fill_visual(v.children[i], s.children[i])
        }
    }


    fill_visual(v, ss)

    return v
}

export function run_bindings(b: BindingOutWithQuantifiers, m: PositionManager, pos: PositionC): SansNodes {
    let gg = b.fill_history_for_position(m, pos)

    function fill_sans(node: IndexGroupNodes): SansNodes {
        let hhh = b.get_history_for_groups(node.group)

        let sans: SAN[][] = []

        for (let hh of hhh)
            for (let h of hh) { 
                sans.push(history_to_sans(h, m, pos))
            }

        let children = node.children.map(_ => fill_sans(_))
        return { sans, children }
    }

    return fill_sans(gg)
}
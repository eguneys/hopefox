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
    nested_globals: Set<number>
    negation_global?: number
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
        function fill_node(node: CompositeNestedGraphNode, nested_globals: Set<number>): AtomicCallNode {
            let res: AtomicCall[] = []

            let negation_global

            for (let call of node.data.call) {

                for (let param of call.params) {
                    if (is_psymbol2(param)) {
                        if (param.a.is_negation_bag) {
                            extract_fields(symbol_per_column, [param.a]).forEach(_ => negation_global = _)
                        }
                        if (param.b.is_negation_bag) {
                            extract_fields(symbol_per_column, [param.b]).forEach(_ => negation_global = _)
                        }
                    } else {
                        if (param.is_negation_bag) {
                            extract_fields(symbol_per_column, [param]).forEach(_ => negation_global = _)
                        }
                    }
                }



                for (let param of call.params) {
                    if (is_psymbol2(param)) {
                        if (param.a.global_id !== undefined) {
                            extract_fields(symbol_per_column, [param.a]).forEach(_ => nested_globals.add(_))
                        }
                        if (param.b.global_id !== undefined) {
                            extract_fields(symbol_per_column, [param.b]).forEach(_ => nested_globals.add(_))
                        }
                    } else {
                        if (param.global_id !== undefined) {
                            extract_fields(symbol_per_column, [param]).forEach(_ => nested_globals.add(_))
                        }
                    }
                }

                let def = defs.find(_ => _.head.id === call.id)

                if (!def) {
                    throw new DefNotFoundException(call.id)
                }

                for (let b of def.body) {
                    let a_params = extract_action_parameters(b.params, def.head.params, call.params)
                    let fields = extract_fields(symbol_per_column, a_params)

                    if (!fields) {
                        throw new FieldsCannotExpandException(b.params)
                    }

                    res.push({
                        id: b.id,
                        fields
                    })
                }
            }

            let collect_globals = node.children.map(_ => new Set(nested_globals))

            let children = node.children.map((child, i) => fill_node(child, collect_globals[i]))

            collect_globals.forEach(_ => _.forEach(_ => nested_globals.add(_)))

            return { 
                quantification: node.data.quantification,
                actions: res,
                children,
                nested_globals,
                negation_global
            }
        }

        this.atomic_call_root = fill_node(node, new Set())
    }

    set_table_columns_with_root(root: CompositeNestedGraphNode) {

        let { symbol_per_column, table } = this
        function fill_node(node: CompositeNestedGraphNode) {
            for (let call of node.data.call)
                for (let param of call.params) {
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

        let pass_node_children: IndexGroupNodes[] = []
        let child = node.children[0]
        pass_node_children.push(this.atomic_step_for_node(m, pos, child, { group: local_groups, children: [] }))
        for (let i = 1; i < node.children.length; i++) {
            let next_child = node.children[i]

            let global_symbols = intersect_fields(
                child.nested_globals,
                next_child.nested_globals)

            let globals_to_inject
            if (global_symbols.length === 1) {
                globals_to_inject = this.fill_single_globals_to_inject(global_symbols[0], pass_node_children[pass_node_children.length - 1])
            }

            let local_groups_with_injection: IndexGroups = []

            if (globals_to_inject !== undefined) {

                for (let group of local_groups) {
                    let local_begin_index = this.history_per_row.length
                    this.run_global_inject_on_position(group.start_row_index, group.end_row_index, globals_to_inject)
                    let local_end_index = this.history_per_row.length
                    local_groups_with_injection.push({
                        start_row_index: local_begin_index,
                        end_row_index: local_end_index
                    })
                }
            } else {
                local_groups_with_injection = local_groups
            }

            let save_local_groups_with_injection = local_groups_with_injection
            local_groups_with_injection = []

            if (child.negation_global !== undefined && 
                child.negation_global === next_child.negation_global) {

                let globals_to_reject = this.fill_globals_to_reject(child.negation_global, pass_node_children[pass_node_children.length - 1])

                for (let group of local_groups) {
                    let local_begin_index = this.history_per_row.length
                    this.run_global_reject_on_position(group.start_row_index, group.end_row_index, globals_to_reject)
                    let local_end_index = this.history_per_row.length
                    local_groups_with_injection.push({
                        start_row_index: local_begin_index,
                        end_row_index: local_end_index
                    })
                }
            } else {
                local_groups_with_injection = save_local_groups_with_injection
            }


            pass_node_children.push(this.atomic_step_for_node(m, pos, next_child, { group: local_groups_with_injection, children: [] }))

            child = next_child
        }

        let pass_node = { group: local_groups, children: pass_node_children }

        if (node.quantification === Quantification.IfThen) {
            return pass_node
        } else if (node.quantification === Quantification.ForAll) {

            throw new NotImplementedException()
        }
        throw new UnreachableCodeException()
    }

    run_global_reject_on_position(start_row_index: number, end_row_index: number, global_to_reject: SingleGlobalsToReject) {
        let Gs = this.table.get_column(global_to_reject.negation_global)

        let value = SquareSet.empty()
        for (let row of global_to_reject.rows) {
            value = value.union(row)
        }
        value = value.complement()
        for (let i = start_row_index; i < end_row_index; i++) {
            this.table.create_new_duplicate_row(i)

            Gs.set_raw(value)
            this.history_per_row.push(this.history_per_row[i])
        }
    }

    fill_globals_to_reject(negation_global: number, index_group_nodes: IndexGroupNodes) {
        let { table } = this
        let rows: SquareSet[] = []
        function only_leaves(leaf: IndexGroupNodes) {
            if (leaf.children.length > 0) {
                leaf.children.forEach(_ => only_leaves(_))
                return
            }
            for (let group of leaf.group) {
                let Gs = table.get_column(negation_global)

                for (let i = group.start_row_index; i < group.end_row_index; i++) {
                    if (!rows.some(_ => _.equals(Gs.rows[i]))) {
                        rows.push(Gs.rows[i])
                    }
                }
            }
        }
        only_leaves(index_group_nodes)

        return {
            negation_global,
            rows
        }
    }

    run_global_inject_on_position(start_row_index: number, end_row_index: number, global_to_inject: SingleGlobalsToInject) {
        let Gs = this.table.get_column(global_to_inject.global_symbol)

        for (let row of global_to_inject.rows)
            for (let i = start_row_index; i < end_row_index; i++) {
                this.table.create_new_duplicate_row(i)

                Gs.set_raw(row)
                this.history_per_row.push(this.history_per_row[i])
            }
    }

    fill_single_globals_to_inject(global_symbol: number, index_group_nodes: IndexGroupNodes): SingleGlobalsToInject {

        let { table } = this
        let rows: SquareSet[] = []
        function only_leaves(leaf: IndexGroupNodes) {
            if (leaf.children.length > 0) {
                leaf.children.forEach(_ => only_leaves(_))
                return
            }
            for (let group of leaf.group) {
                let Gs = table.get_column(global_symbol)

                for (let i = group.start_row_index; i < group.end_row_index; i++) {
                    if (!rows.some(_ => _.equals(Gs.rows[i]))) {
                        rows.push(Gs.rows[i])
                    }
                }
            }
        }
        only_leaves(index_group_nodes)

        return {
            global_symbol,
            rows
        }
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

function intersect_fields(a: Set<number>, b: Set<number>) {
    let res: number[] = []
    for (let x of a) {
        if (b.has(x)) {
            res.push(x)
        }
    }
    return res

}


function intersect_symbols(a: PieceSymbol[], b: PieceSymbol[]) {
    let res: PieceSymbol[] = []
    for (let x of a) {
        if (b.some(_ => symbol_equals(_, x))) {
            res.push(x)
        }
    }
    return res
}

type SingleGlobalsToInject = {
    global_symbol: number
    rows: SquareSet[]
}

type SingleGlobalsToReject = {
    negation_global: number
    rows: SquareSet[]
}




export function extract_fields(symbol_per_column: PieceSymbol[], a_params: PieceSymbol[]) {
    let res = []

    for (let param of a_params) {
        for (let i = 0; i < symbol_per_column.length; i++) {
            if (symbol_equals(param, symbol_per_column[i])) {
                res.push(i)
            }
        }
    }
    return res
}


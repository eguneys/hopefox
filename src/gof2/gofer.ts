import { MoveC, PositionC, PositionManager } from "../distill/hopefox_c";
import { SquareSet } from "../distill/squareSet";
import { Square } from "../distill/types";
import { atomic_action_handlers, atomic_filter_handlers } from "./atomic_actions";
import { parse_defs, parse_ring } from "./parser";
import { AtomicCall, CompositeActionDefinition, CompositeRing, is_atomic_action, is_psymbol2, is_vsymbol2, PieceSymbol, PSymbol, symbol_equals, VariableSymbol, VSymbol, vsymbol_equals } from "./types";

export class FieldsCannotExpandException extends Error {
    constructor(params: VSymbol[]) {
        super(`Fields cannot expand : ${params.join(' ')}`);
        this.name = "FieldsCannotExpandException";
    }
}



export class DefNotFoundException extends Error {
    constructor(id: string) {
        super(`Definition not found: ${id}`);
        this.name = "DefNotFoundException";
    }
}


export class IncompatibleSymbolException extends Error {
    constructor(a: VSymbol, b: PSymbol) {
        super(`Incompatible Symbol Exception: ${a.id} and ${b}`);
        this.name = "IncompatibleSymbolException";
    }
}



export class Column {

    name: string
    rows: SquareSet[]

    constructor(name: string) {
        this.name = name
        this.rows = []
    }

    set_raw(bb: SquareSet) {
        this.rows[this.rows.length - 1] = bb
    }

    push_raw(bb: SquareSet) {
        this.rows.push(bb)
    }
}

export class Columnar {
    create_new_duplicate_row(i: number) {
        for (let col of this.columns) {
            col.rows.push(col.rows[i])
        }
    }

    clear_rows() {
        for (let col of this.columns) {
            col.rows = []
        }
    }
    get_column(i: number) {
        return this.columns[i]
    }

    columns: Column[]
    constructor() {
        this.columns = []
    }

    add_column_type(name: string) {
        this.columns.push(new Column(name))
    }
}

export type History = MoveC[]


export function extract_action_parameters(
    c_params: VariableSymbol[],
    d_params: VSymbol[],
    i_params: PSymbol[]) {
        let res: PieceSymbol[] = []
        for (let param of c_params) {
            for (let i = 0; i < d_params.length; i++) {
                let symbol = d_params[i]
                let s = i_params[i]
                if (is_vsymbol2(symbol)) {
                    if (is_psymbol2(s)) {
                        if (symbol.id === param.id) {
                            res.push(s.a)
                        } else if (symbol.id2 === param.id) {
                            res.push(s.b)
                        }
                    } else {
                        throw new IncompatibleSymbolException(d_params[i], i_params[i])
                    }
                } else {
                    if (vsymbol_equals(symbol, param)) {
                        if (is_psymbol2(s)) {
                            throw new IncompatibleSymbolException(d_params[i], i_params[i])
                        }
                        res.push(s)
                    }
                }
            }
        }
        return res
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


export class BindingOut {
    table: Columnar
    start_row_index: number

    actions: AtomicCall[]
    symbol_per_column: PieceSymbol[]
    history_per_row: History[]

    constructor() {
        this.table = new Columnar()
        this.start_row_index = 0
        this.actions = []
        this.symbol_per_column = []
        this.history_per_row = []
    }

    static from_defs(defs: CompositeActionDefinition[], ring: CompositeRing) {
        let res = new BindingOut()

        res.fill_ring(ring)
        res.fill_actions(defs, ring)
        return res
    }

    get_history() {
        return this.history_per_row.slice(this.start_row_index)
    }

    fill_actions(defs: CompositeActionDefinition[], ring: CompositeRing) {

        let res: AtomicCall[] = []

        for (let call of ring) {
            let def = defs.find(_ => _.head.id === call.id)

            if (!def) {
                throw new DefNotFoundException(call.id)
            }

            for (let b of def.body) {
                let a_params = extract_action_parameters(b.params, def.head.params, call.params)
                let fields = extract_fields(this.symbol_per_column, a_params)

                if (!fields) {
                    throw new FieldsCannotExpandException(b.params)
                }

                res.push({
                    id: b.id,
                    fields
                })
            }

        }

        this.actions = res
    }

    fill_ring(ring: CompositeRing) {
        for (let call of ring) {
            for (let param of call.params) {
                if (is_psymbol2(param)) {
                    if (!this.symbol_per_column.some(_ => symbol_equals(_, param.a))) {
                        this.symbol_per_column.push(param.a)
                        this.table.add_column_type(param.a.id)
                    }
                    if (!this.symbol_per_column.some(_ => symbol_equals(_, param.b))) {
                        this.symbol_per_column.push(param.b)
                        this.table.add_column_type(param.b.id)
                    }
                } else {
                    if (!this.symbol_per_column.some(_ => symbol_equals(_, param))) {
                        this.symbol_per_column.push(param)
                        this.table.add_column_type(param.id)
                    }
                }
            }
        }
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


        for (let action of this.actions) {
            this.run_action_on_position(m, pos, action)
        }
    }


    run_action_on_position(m: PositionManager, pos: PositionC, action: AtomicCall) {
        let new_start_row_index = this.history_per_row.length

        if (is_atomic_action(action)) {
            atomic_action_handlers[action.id](
                action.fields, 
                this.start_row_index, 
                this.symbol_per_column,
                m,
                pos,
                this.history_per_row,
                this.table
            )
        } else {
            atomic_filter_handlers[action.id](
                action.fields, 
                this.start_row_index, 
                this.symbol_per_column,
                m,
                pos,
                this.history_per_row,
                this.table
            )
        }

        this.start_row_index = new_start_row_index
    }
}


export function parse_and_create_bindings(code: string): BindingOut {
    return BindingOut.from_defs(parse_defs(code), parse_ring(code))
}


export function run_bindings(b: BindingOut, m: PositionManager, pos: PositionC) {
    b.fill_history_for_position(m, pos)

    let res = []

    for (let h of b.get_history()) {
        res.push(history_to_sans(h, m, pos))
    }
    return res
}


type SAN = string
export function history_to_sans(h: MoveC[], m: PositionManager, pos: PositionC) {
    let res: SAN[] = []


    for (let move of h) {
        res.push(m.make_san(pos, move))
        m.make_move(pos, move)
    }

    for (let i = h.length - 1; i >= 0; i--) {
        m.unmake_move(pos, h[i])
    }
    return res
}
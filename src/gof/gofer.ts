import { squareSet } from "../distill/debug";
import { make_move_from_to, MoveC, piece_c_to_piece, piece_c_type_of, PositionC, PositionManager } from "../distill/hopefox_c";
import { SquareSet } from "../distill/squareSet";
import { Square } from "../distill/types";
import { ActionParameters, AtomicAction, AtomicActionId, CompositeAction, CompositeActionDefinition, CompositeActionId, Gof, PieceSymbol, PieceSymbolVariableIdUndefined } from "./types";

type GApplication = (
    binding_out: BindingOut, 
    m: PositionManager, 
    pos: PositionC,
    fields: PieceSymbol[]
) => BindingOut

const GApplications: Map<AtomicActionId | CompositeActionId, GApplication> = new Map()

const HashTable: Map<PieceSymbolHash, PieceSymbol> = new Map()

function Clear_table() {
    GApplications.clear()
    HashTable.clear()
}

function Fill_Applications(defs: CompositeActionDefinition[]) {
    GApplications.set(AtomicActionId.Attack, GAttack)
    GApplications.set(AtomicActionId.Move, GMove)
}

const history_to_san_line = (m: PositionManager, pos: PositionC, history: MoveC[]) => {
    let res = []
    for (let move of history) {
        res.push(m.make_san(pos, move))
        m.make_move(pos, move)
    }
    for (let i = history.length - 1; i >= 0; i--) {
        m.unmake_move(pos, history[i])
    }
    return res
}

export type SAN = string
export type SanLine = SAN[]
export type Gofer = (m: PositionManager, pos: PositionC) => SanLine[]


class UnrecognizedGDefinitionException extends Error {
    constructor(id: AtomicActionId | CompositeActionId) {
        super(`Unrecognized G Definition: ${id}`)
    }
}



class UnrecognizedGofDefinitionException extends Error {
    constructor(id: CompositeActionId) {
        super(`Unrecognized Gof Definition: ${id}`)
    }
}

export function gofer(defs: CompositeActionDefinition[], gof: Gof) {
    Clear_table()
    Fill_Applications(defs)

    function apply_g(binding_out: BindingOut, m: PositionManager, pos: PositionC, b: AtomicAction | CompositeAction, d_params: ActionParameters, params: PieceSymbol[]) {
        let unmakes: (() => void)[] = []

        let g = GApplications.get(b.id)

        if (!g) {
            throw new UnrecognizedGDefinitionException(b.id)
        }

        let fields = extract_fields(b.params, d_params, params)
        return g(binding_out, m, pos, fields)
    }

    function apply_definition(binding_out: BindingOut, m: PositionManager, pos: PositionC, id: CompositeActionId, params: PieceSymbol[]) {
        let d = defs.find(_ => _.id === id)

        if (!d) {
            throw new UnrecognizedGofDefinitionException(id)
        }

        for (let b of d.body) {
            binding_out = apply_g(binding_out, m, pos, b, d.params, params)
            if (binding_out.length === 0) break
        }
        return binding_out
    }

    return (m: PositionManager, pos: PositionC) => {
        let res = []
        for (let g of gof) {
            let binding_out: BindingOut = [{ history: [], map: new Map()}]
            for (let i of g) {
                binding_out = apply_definition(binding_out, m, pos, i.id, i.params)
                if (binding_out.length === 0) break
            }
            if (binding_out.length > 0)
                res.push(binding_out)
        }

        return res.map(_ => _.map(_ => history_to_san_line(m, pos, _.history)))
    }
}

type PieceSymbolHash = number
type Binding = {
    history: MoveC[]
    map: Map<PieceSymbolHash, Square>
}
type BindingOut = Binding[]

class UnrecognizedGParamException extends Error {
    constructor(id: AtomicActionId | CompositeActionId) {
        super(`Unrecognized G Param: ${id}`)
    }
}



function extract_fields(b_params: ActionParameters, d_params: ActionParameters, symbols: PieceSymbol[]) {
    let res = []
    for (let b_param of b_params) {
        let i = d_params.findIndex(_ => _.id === b_param.id)
        if (i === -1) {
            i = d_params.findIndex(_ => _.id_to === b_param.id)

            if (i === -1) {
                throw new UnrecognizedGParamException(b_param.id)
            }
        }
        res.push(symbols[i])
    }
    return res
}


function GMove(
    binding_out: BindingOut,
    m: PositionManager,
    pos: PositionC,
    fields: PieceSymbol[]
) {
    let res: BindingOut = []

    assert_length(fields, 2)
    let [from, to] = fields

    let h_from = piece_symbol_hash(from)
    let h_to = piece_symbol_hash(to)

    let from_pieces = [from.piece, from.piece + 8]


    for (let b of binding_out) {
        apply_history(m, pos, b.history)

        let occ = m.get_pieces_bb(pos, from_pieces)

        let legals = m.get_legal_moves(pos)

        let b_from = b.map.get(h_from)
        if (b_from !== undefined) {
            occ = SquareSet.fromSquare(b_from)
        }

        for (let sq of occ) {
            let aa = m.pos_attacks(pos, sq)

            let b_to = b.map.get(h_to)
            if (b_to !== undefined) {
                aa = SquareSet.fromSquare(b_to)
            }

            for (let a of aa) {
                let move = make_move_from_to(sq, a)
                if (!legals.includes(move)) {
                    continue
                }
                let history = [...b.history, move]
                let map = new Map(b.map)
                map.set(h_from, sq)
                map.set(h_to, a)
                res.push({ map, history})
            }
        }

        unapply_history(m, pos, b.history)
    }
    return res
}


function apply_history(m: PositionManager, pos: PositionC, history: MoveC[]) {
    for (let move of history) {
        m.make_move(pos, move)
    }
}
function unapply_history(m: PositionManager, pos: PositionC, history: MoveC[]) {
    for (let i = history.length - 1; i >= 0; i--) {
        m.unmake_move(pos, history[i])
    }
}

function GAttack(
    binding_out: BindingOut,
    m: PositionManager,
    pos: PositionC,
    fields: PieceSymbol[]
) {
    let res: BindingOut = []

    assert_length(fields, 2)
    let [from, to] = fields

    let h_from = piece_symbol_hash(from)
    let h_to = piece_symbol_hash(to)

    let from_pieces = [from.piece, from.piece + 8]

    let occ = m.get_pieces_bb(pos, from_pieces)

    for (let b of binding_out) {
        apply_history(m, pos, b.history)
        let b_from = b.map.get(h_from)
        if (b_from !== undefined) {
            occ = SquareSet.fromSquare(b_from)
        }

        for (let sq of occ) {
            let aa = m.pos_attacks(pos, sq)

            let b_to = b.map.get(h_to)
            if (b_to !== undefined) {
                aa = SquareSet.fromSquare(b_to)
            }

            for (let a of aa) {

                let piece2 = m.get_at(pos, a)

                if (piece2 === undefined) {
                    continue
                }

                let piece_type2 = piece_c_type_of(piece2)
                if (to.piece != piece_type2) {
                    continue
                }



                let history = b.history
                let map = new Map(b.map)
                map.set(h_from, sq)
                map.set(h_to, a)
                res.push({ history, map })
            }
        }

        unapply_history(m, pos, b.history)
    }

    return res
}

function piece_symbol_hash(a: PieceSymbol) {
    let hash = 0
    hash = (hash * 31) + a.piece
    hash = (hash * 31) + a.id
    hash = (hash * 31) + a.piece_to
    hash = (hash * 31) + a.id_to
    return hash
}

class UnmatchedFieldParityException extends Error {
    constructor(expected: number, actual: number) {
        super(`Unmatched field parity: actual ${actual}, but expected ${expected}`)
    }
}

function assert_length<T>(l: T[], nb: number) {
    if (l.length !== nb) {
        throw new UnmatchedFieldParityException(nb, l.length)
    }
}

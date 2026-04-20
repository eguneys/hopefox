import { squareSet } from "../distill/debug";
import { make_move_from_to, MoveC, No_Piece_Type, piece_c_to_piece, piece_c_type_of, PositionC, PositionManager } from "../distill/hopefox_c";
import { SquareSet } from "../distill/squareSet";
import { Square } from "../distill/types";
import { GofHashTable } from "./gof_compiler";
import { ActionParameters, AtomicAction, AtomicActionId, CompositeAction, CompositeActionDefinition, CompositeActionId, Gof, PieceSymbol, PieceSymbolIdNull, PieceSymbolIdUndefined, PieceSymbolVariableIdNull, PieceSymbolVariableIdUndefined } from "./types";

type GApplication = (
    binding_out: BindingOut, 
    m: PositionManager, 
    pos: PositionC,
    fields: PieceSymbol[]
) => BindingOut

const GApplications: Map<AtomicActionId | CompositeActionId, GApplication> = new Map()

const HashTable: Map<PieceSymbolHash, PieceSymbol> = new Map()
const BindingHashTable: Map<BindingHash, Binding> = new Map()

function hash_binding(b: Binding) {
    let hash = 0
    for (let move of b.history) 
        hash = (hash * 31) + move
    for (let [k, v] of b.map.entries()) {
        hash = (hash * 31) + k
        hash = (hash * 31) + v
    }
    return hash
}

function push_to_binding_out(out: BindingOut, b: Binding) {
    let hash = hash_binding(b)
    BindingHashTable.set(hash, b)
    out.add(hash)
}

export function Clear_table() {
    GApplications.clear()
    HashTable.clear()
}

function Fill_Applications(defs: CompositeActionDefinition[]) {
    GApplications.set(AtomicActionId.Capture, GCapture)
    GApplications.set(AtomicActionId.Attack, GAttack)
    GApplications.set(AtomicActionId.Move, GMove)
    GApplications.set(AtomicActionId.Attack_Through, GAttack_Through)
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
        super(`Unrecognized G Definition: \n "${GofHashTable.get(id)}"`)
    }
}



class UnrecognizedGofDefinitionException extends Error {
    constructor(id: CompositeActionId) {
        super(`Unrecognized Gof Definition: \n "${GofHashTable.get(id)}"`)
    }
}

export function gofer(defs: CompositeActionDefinition[], gof: Gof): Gofer {
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
            if (binding_out.size === 0) break
        }
        return binding_out
    }

    return (m: PositionManager, pos: PositionC) => {
        let res = []
        for (let g of gof) {
            let binding_out: BindingOut = new Set()
            push_to_binding_out(binding_out, {map: new Map(), history: []})
            for (let i of g) {
                binding_out = apply_definition(binding_out, m, pos, i.id, i.params)
                if (binding_out.size === 0) break
            }
            if (binding_out.size > 0)
                res.push(binding_out)
        }

        return res.flatMap(_ => [..._].map(_ => history_to_san_line(m, pos, BindingHashTable.get(_)!.history)))
    }
}

type PieceSymbolHash = number
type Binding = {
    history: MoveC[]
    map: Map<PieceSymbolHash, Square>
}
type BindingHash = number
type BindingOut = Set<BindingHash>

class UnrecognizedGParamException extends Error {
    constructor(id: AtomicActionId | CompositeActionId) {
        super(`Unrecognized G Param: ${id}`)
    }
}



function extract_fields(b_params: ActionParameters, d_params: ActionParameters, symbols: PieceSymbol[]) {
    let res = []
    for (let b_param of b_params) {
        if (b_param.id === PieceSymbolVariableIdNull) {
            res.push({ piece: No_Piece_Type, piece_to: No_Piece_Type, id: PieceSymbolIdNull, id_to: PieceSymbolIdUndefined })
            continue
        }
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


function GCapture(
    binding_out: BindingOut,
    m: PositionManager,
    pos: PositionC,
    fields: PieceSymbol[]
) {
    let res: BindingOut = new Set()

    assert_length(fields, 3)
    let [from, to, captured] = fields

    let h_from = piece_symbol_hash(from)
    let h_to = piece_symbol_hash(to)
    let h_captured = piece_symbol_hash(captured)

    let from_pieces = [from.piece, from.piece + 8]


    for (let b_hash of binding_out) {
        let b = BindingHashTable.get(b_hash)!

        apply_history(m, pos, b.history)

        let occ = m.get_pieces_bb(pos, from_pieces)

        let legals = m.get_legal_moves(pos)

        let b_from = b.map.get(h_from)
        if (b_from !== undefined) {
            occ = SquareSet.fromSquare(b_from)
        }

        for (let sq of occ) {

            let piece = m.get_at(pos, sq)!

            let piece_type = piece_c_type_of(piece)
            if (from.piece != piece_type) {
                continue
            }

            let aa = m.pos_attacks(pos, sq)

            let b_to = b.map.get(h_to)
            if (b_to !== undefined) {
                aa = aa.intersect(SquareSet.fromSquare(b_to))
            }

            let c_to = b.map.get(h_captured)
            if (c_to !== undefined) {
                aa = aa.intersect(SquareSet.fromSquare(c_to))
            }

            for (let a of aa) {
                let piece = m.get_at(pos, a)
                if (piece === undefined) {
                    continue
                }

                let move = make_move_from_to(sq, a)
                if (!legals.includes(move)) {
                    continue
                }
                let history = [...b.history, move]
                let map = new Map(b.map)
                map.set(h_from, sq)
                map.set(h_to, a)
                map.set(h_captured, a)
                push_to_binding_out(res, { map, history})
            }
        }

        unapply_history(m, pos, b.history)
    }
    return res
}



function GMove(
    binding_out: BindingOut,
    m: PositionManager,
    pos: PositionC,
    fields: PieceSymbol[]
) {
    let res: BindingOut = new Set()

    assert_length(fields, 2)
    let [from, to] = fields

    let h_from = piece_symbol_hash(from)
    let h_to = piece_symbol_hash(to)

    let from_pieces = [from.piece, from.piece + 8]


    for (let b_hash of binding_out) {
        let b = BindingHashTable.get(b_hash)!
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
                aa = aa.intersect(SquareSet.fromSquare(b_to))
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
                push_to_binding_out(res, {map, history})
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
    let res: BindingOut = new Set()

    assert_length(fields, 2)
    let [from, to] = fields

    let h_from = piece_symbol_hash(from)
    let h_to = piece_symbol_hash(to)

    let from_pieces = [from.piece, from.piece + 8]
    let to_pieces = [to.piece, to.piece + 8]

    if (from.id === PieceSymbolIdNull) {

        let occ = m.pos_occupied(pos)
        let to_occ = occ

        for (let b_hash of binding_out) {
            let b = BindingHashTable.get(b_hash)!
            apply_history(m, pos, b.history)

            let b_to = b.map.get(h_to)
            if (b_to !== undefined) {
                to_occ = SquareSet.fromSquare(b_to)
            }

            outer: for (let sq of to_occ) {
                for (let sq2 of occ) {
                    let a_piece = m.get_at(pos, sq2)!
                    let a_pt = piece_c_type_of(a_piece)

                    let aa = m.pos_attacks(pos, sq2)

                    if (aa.has(sq)) {
                        continue outer
                    }
                }
                let history = b.history
                let map = new Map(b.map)
                map.set(h_to, sq)
                push_to_binding_out(res, {map, history})
            }

            unapply_history(m, pos, b.history)
        }

        return res
    }



    let occ = m.get_pieces_bb(pos, from_pieces)

    for (let b_hash of binding_out) {
        let b = BindingHashTable.get(b_hash)!
        apply_history(m, pos, b.history)
        let b_from = b.map.get(h_from)
        if (b_from !== undefined) {
            occ = SquareSet.fromSquare(b_from)
        }

        for (let sq of occ) {
            let aa = m.pos_attacks(pos, sq)

            let b_to = b.map.get(h_to)
            if (b_to !== undefined) {
                aa = aa.intersect(SquareSet.fromSquare(b_to))
            }

            if (to.id === PieceSymbolIdNull) {
                if (aa.isEmpty()) {


                    let history = b.history
                    let map = new Map(b.map)
                    map.set(h_from, sq)
                    push_to_binding_out(res, { map, history })
                } else {
                    continue
                }
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
                push_to_binding_out(res, {map, history})
            }
        }

        unapply_history(m, pos, b.history)
    }

    return res
}


function GAttack_Through(
    binding_out: BindingOut,
    m: PositionManager,
    pos: PositionC,
    fields: PieceSymbol[]
) {
    let res: BindingOut = new Set()

    assert_length(fields, 3)
    let [from, to, to_through] = fields

    let h_from = piece_symbol_hash(from)
    let h_to = piece_symbol_hash(to)
    let h_to_through = piece_symbol_hash(to_through)

    let from_pieces = [from.piece, from.piece + 8]
    let to_through_pieces = [to_through.piece, to_through.piece + 8]

    for (let b_hash of binding_out) {
        let b = BindingHashTable.get(b_hash)!

        apply_history(m, pos, b.history)

        let occ = m.get_pieces_bb(pos, from_pieces)
        let aa_through = m.get_pieces_bb(pos, to_through_pieces)

        let b_from = b.map.get(h_from)
        if (b_from !== undefined) {
            occ = SquareSet.fromSquare(b_from)
        }

        let b_to_through = b.map.get(h_to_through)
        if (b_to_through !== undefined) {
            aa_through = SquareSet.fromSquare(b_to_through)
        }

        for (let sq of occ) {

            let piece = m.get_at(pos, sq)!

            for (let a_through of aa_through) {

                let piece_through = m.get_at(pos, a_through)
                if (!piece_through) {
                    continue
                }
                let pt_through = piece_c_type_of(piece_through)
                if (to_through.piece != pt_through) {
                    continue
                }

                let aa = m.pos_attacks(pos, sq)
                let through = m.attacks(piece, sq, occ.without(a_through))

                let aa_to = through.diff(aa)

                for (let a_to of aa_to) {

                    let piece2 = m.get_at(pos, a_to)!

                    if (!piece2) {
                        continue
                    }

                    let pt2 = piece_c_type_of(piece2)
                    if (to.piece != pt2) {
                        continue
                    }

                    let history = b.history
                    let map = new Map(b.map)
                    map.set(h_from, sq)
                    map.set(h_to, a_to)
                    map.set(h_to_through, a_through)
                    push_to_binding_out(res, { history, map })
                }
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

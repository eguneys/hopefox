import { make_move_from_to, move_c_to_Move, piece_to_c, PositionC, PositionManager, role_to_c } from "../distill/hopefox_c";
import { SquareSet } from "../distill/squareSet";
import { History, Columnar } from "./gofer";
import { AtomicActionId, AtomicFilterId, PieceSymbol } from "./types";

export type AtomicHandler = (
    fields: number[],
    start_row_index: number,
    symbol_per_column: PieceSymbol[],
    m: PositionManager,
    pos: PositionC,
    history_per_row: History[],
    table: Columnar) => void


export const atomic_action_handlers: Record<AtomicActionId, AtomicHandler> = {
    [AtomicActionId.Move]: atomic_action_move,
    [AtomicActionId.Capture]: atomic_action_move,
    [AtomicActionId.Promote]: atomic_action_move,
    [AtomicActionId.Push]: atomic_action_move,

}

export const atomic_filter_handlers: Record<AtomicFilterId, AtomicHandler> = {
    [AtomicFilterId.Attack]: atomic_filter_attack,
    [AtomicFilterId.Attack_Through]: atomic_filter_attack_through,
}

function atomic_action_move(
    fields: number[],
    start_row_index: number,
    columns: PieceSymbol[],
    m: PositionManager,
    pos: PositionC,
    history_per_row: History[],
    table: Columnar) {


        let from = fields[0]
        let to = fields[1]

        let from_symbol = columns[from]
        let to_symbol = columns[to]


        let Tos = table.get_column(to)
        let Froms = table.get_column(from)

        let end_row = history_per_row.length

        for (let i = start_row_index; i < end_row; i++) {
            let h = history_per_row[i]
            history_make_for_pos(h, m, pos)

            let legals = m.get_legal_moves(pos)

            let from_symbol_bb = bitboard_of_symbol(from_symbol, m, pos)

            let bb_from = Froms.rows[i].intersect(from_symbol_bb)
            let bb_to = Tos.rows[i]


            for (let legal of legals) {
                let { from, to } = move_c_to_Move(legal)

                if (!bb_from.has(from)) {
                    continue
                }

                if (!bb_to.has(to)) {
                    continue;
                }

                table.create_new_duplicate_row(i)

                Froms.set_raw(SquareSet.fromSquare(from))
                Tos.set_raw(SquareSet.fromSquare(to))

                let h2 = [...h, make_move_from_to(from, to)]
                history_per_row.push(h2)
            }

            history_unmake_for_pos(h, m, pos)
        }

}


function atomic_filter_attack(
    fields: number[],
    start_row_index: number,
    columns: PieceSymbol[],
    m: PositionManager,
    pos: PositionC,
    history_per_row: History[],
    table: Columnar) {

    let from = fields[0]
    let to = fields[1]

    let from_symbol = columns[from]
    let to_symbol = columns[to]


    let Tos = table.get_column(to)
    let Froms = table.get_column(from)

    let end_row = history_per_row.length

    for (let i = start_row_index; i < end_row; i++) {
        let h = history_per_row[i]
        history_make_for_pos(h, m, pos)

        let from_symbol_bb = bitboard_of_symbol(from_symbol, m, pos)
        let to_symbol_bb = bitboard_of_symbol(to_symbol, m, pos)

        let bb_from = Froms.rows[i].intersect(from_symbol_bb)
        let bb_to = Tos.rows[i].intersect(to_symbol_bb)

        let occ = m.pos_occupied(pos)

        let bb = occ.intersect(bb_from)

        for (let sq of bb) {

            let aa = m.pos_attacks(pos, sq)

            aa = aa.intersect(bb_to)

            for (let a of aa) {
                table.create_new_duplicate_row(i)

                Froms.set_raw(SquareSet.fromSquare(sq))
                Tos.set_raw(SquareSet.fromSquare(a))

                history_per_row.push(h)
            }
        }

        history_unmake_for_pos(h, m, pos)
    }

}


function atomic_filter_attack_through(
    fields: number[],
    start_row_index: number,
    symbol_per_column: PieceSymbol[],
    m: PositionManager,
    pos: PositionC,
    history_per_row: History[],
    table: Columnar) {

}

function history_make_for_pos(h: History, m: PositionManager, pos: number) {
    for (let move of h) {
        m.make_move(pos, move)
    }
}

function history_unmake_for_pos(h: History, m: PositionManager, pos: number) {
    for (let i = h.length - 1; i >= 0; i--) {
        m.unmake_move(pos, h[i])
    }
}


function bitboard_of_symbol(from_symbol: PieceSymbol, m: PositionManager, pos: PositionC) {
    return m.get_pieces_bb(pos, [role_to_c(from_symbol.piece)])
}


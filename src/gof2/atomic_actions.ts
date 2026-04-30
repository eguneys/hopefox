import { between } from "../distill/attacks";
import { BLACK, color_c_opposite, make_move_from_to, move_c_to_Move, PAWN, piece_c_color_of, piece_c_type_of, piece_to_c, PositionC, PositionManager, role_to_c, WHITE } from "../distill/hopefox_c";
import { SquareSet } from "../distill/squareSet";
import { History, Columnar } from "./gofer";
import { AtomicActionId, AtomicFilterId, PieceSymbol } from "./types";

export type AtomicHandler = (
    fields: number[],
    start_row_index: number,
    end_row_index: number,
    symbol_per_column: PieceSymbol[],
    m: PositionManager,
    pos: PositionC,
    history_per_row: History[],
    table: Columnar) => void


export const atomic_action_handlers: Record<AtomicActionId, AtomicHandler> = {
    [AtomicActionId.Safe_Move]: atomic_action_safe_move,
    [AtomicActionId.Move]: atomic_action_move,
    [AtomicActionId.Capture]: atomic_action_capture,
    [AtomicActionId.Promote]: atomic_action_move,
    [AtomicActionId.Push]: atomic_action_move,

}

export const atomic_filter_handlers: Record<AtomicFilterId, AtomicHandler> = {
    [AtomicFilterId.Attack]: atomic_filter_attack,
    [AtomicFilterId.Attack_Through]: atomic_filter_attack_through,
    [AtomicFilterId.No_King_Evades]: atomic_filter_no_king_evades,
    [AtomicFilterId.No_Captures]: atomic_filter_no_captures,
    [AtomicFilterId.No_Blocks_Check]: atomic_filter_no_blocks_check,
    [AtomicFilterId.No_Push_Blocks_Check]: atomic_filter_no_push_blocks_check,
}

function atomic_action_safe_move(
    fields: number[],
    start_row_index: number,
    end_row_index: number,
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

        for (let i = start_row_index; i < end_row_index; i++) {
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

function atomic_action_move(
    fields: number[],
    start_row_index: number,
    end_row_index: number,
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

        for (let i = start_row_index; i < end_row_index; i++) {
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


function atomic_action_capture(
    fields: number[],
    start_row_index: number,
    end_row_index: number,
    columns: PieceSymbol[],
    m: PositionManager,
    pos: PositionC,
    history_per_row: History[],
    table: Columnar) {


        let from = fields[0]
        let to = fields[1]
        let captured = fields[2]

        let from_symbol = columns[from]
        let to_symbol = columns[to]
        let captured_symbol = columns[captured]


        let Tos = table.get_column(to)
        let Froms = table.get_column(from)
        let Captureds = table.get_column(captured)

        for (let i = start_row_index; i < end_row_index; i++) {
            let h = history_per_row[i]
            history_make_for_pos(h, m, pos)

            let legals = m.get_legal_moves(pos)

            let from_symbol_bb = bitboard_of_symbol(from_symbol, m, pos)
            let captured_symbol_bb = bitboard_of_symbol(captured_symbol, m, pos)

            let bb_from = Froms.rows[i].intersect(from_symbol_bb)
            let bb_to = Tos.rows[i].intersect(captured_symbol_bb)


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
    end_row_index: number,
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

    for (let i = start_row_index; i < end_row_index; i++) {
        let h = history_per_row[i]
        history_make_for_pos(h, m, pos)

        let from_symbol_bb = bitboard_of_symbol(from_symbol, m, pos)
        let to_symbol_bb = bitboard_of_symbol(to_symbol, m, pos)

        let bb_from = Froms.rows[i].intersect(from_symbol_bb)
        let bb_to = Tos.rows[i].intersect(to_symbol_bb)

        let occ = m.pos_occupied(pos)

        let bb = occ.intersect(bb_from)

        for (let sq of bb) {

            let color = piece_c_color_of(m.get_at(pos, sq)!)

            let aa = m.pos_attacks(pos, sq)

            aa = aa.intersect(bb_to)

            for (let a of aa) {
                let p2 = m.get_at(pos, a)
                if (p2 === undefined) {
                    continue
                }
                let color2 = piece_c_color_of(p2)

                if (color === color2) {
                    continue
                }

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
    end_row_index: number,
    columns: PieceSymbol[],
    m: PositionManager,
    pos: PositionC,
    history_per_row: History[],
    table: Columnar) {

    let from = fields[0]
    let to = fields[1]
    let through = fields[2]

    let from_symbol = columns[from]
    let to_symbol = columns[to]
    let through_symbol = columns[through]


    let Tos = table.get_column(to)
    let Froms = table.get_column(from)
    let Throughs = table.get_column(through)

    for (let i = start_row_index; i < end_row_index; i++) {
        let h = history_per_row[i]
        history_make_for_pos(h, m, pos)

        let from_symbol_bb = bitboard_of_symbol(from_symbol, m, pos)
        let to_symbol_bb = bitboard_of_symbol(to_symbol, m, pos)
        let through_symbol_bb = bitboard_of_symbol(through_symbol, m, pos)

        let bb_from = Froms.rows[i].intersect(from_symbol_bb)
        let bb_to = Tos.rows[i].intersect(to_symbol_bb)
        let bb_through = Throughs.rows[i].intersect(through_symbol_bb)

        let occ = m.pos_occupied(pos)

        let bb = occ.intersect(bb_from)

        let through_bb = occ.intersect(bb_through)

        for (let sq of bb) {

            let piece = m.get_at(pos, sq)!

            let color = piece_c_color_of(piece)
            let pt = piece_c_type_of(piece)

            for (let through_sq of through_bb) {

                let aa = m.attacks(pt, sq, occ.without(through_sq))
                    .diff(m.attacks(pt, sq, occ))

                aa = aa.intersect(bb_to)

                for (let a of aa) {
                    let p2 = m.get_at(pos, a)
                    if (p2 === undefined) {
                        continue
                    }
                    let color2 = piece_c_color_of(p2)

                    if (color === color2) {
                        continue
                    }

                    table.create_new_duplicate_row(i)

                    Froms.set_raw(SquareSet.fromSquare(sq))
                    Tos.set_raw(SquareSet.fromSquare(a))

                    history_per_row.push(h)
                }
        }
        }

        history_unmake_for_pos(h, m, pos)
    }



}


function atomic_filter_no_king_evades(
    fields: number[],
    start_row_index: number,
    end_row_index: number,
    columns: PieceSymbol[],
    m: PositionManager,
    pos: PositionC,
    history_per_row: History[],
    table: Columnar) {

    let from = fields[0]

    let from_symbol = columns[from]

    let Froms = table.get_column(from)

    for (let i = start_row_index; i < end_row_index; i++) {
        let h = history_per_row[i]
        history_make_for_pos(h, m, pos)

        let from_symbol_bb = bitboard_of_symbol(from_symbol, m, pos)

        let bb_from = Froms.rows[i].intersect(from_symbol_bb)

        let occ = m.pos_occupied(pos)

        let bb = occ.intersect(bb_from)

        outer: for (let sq of bb) {

            let color = piece_c_color_of(m.get_at(pos, sq)!)

            let aa2 = m.get_pieces_color_bb(pos, color === WHITE ? BLACK: WHITE)

            let occ2 = occ.without(sq)
            let aa = m.pos_attacks(pos, sq)

            outer2: for (let a of aa) {

                let f_piece = m.get_at(pos, a)
                if (f_piece !== undefined) {
                    if (piece_c_color_of(f_piece) === color) {
                        continue
                    }
                }

                for (let a2 of aa2) {

                    let p2 = m.get_at(pos, a2)!

                    if (m.attacks(p2, a2, occ2.with(a)).has(a)) {
                        continue outer2
                    }
                }
                continue outer
            }

            table.create_new_duplicate_row(i)

            Froms.set_raw(SquareSet.fromSquare(sq))
            history_per_row.push(h)
        }

        history_unmake_for_pos(h, m, pos)
    }

}



function atomic_filter_no_captures(
    fields: number[],
    start_row_index: number,
    end_row_index: number,
    columns: PieceSymbol[],
    m: PositionManager,
    pos: PositionC,
    history_per_row: History[],
    table: Columnar) {

    let from = fields[0]

    let from_symbol = columns[from]

    let Froms = table.get_column(from)

    for (let i = start_row_index; i < end_row_index; i++) {
        let h = history_per_row[i]
        history_make_for_pos(h, m, pos)

        let from_symbol_bb = bitboard_of_symbol(from_symbol, m, pos)

        let bb_from = Froms.rows[i].intersect(from_symbol_bb)

        let occ = m.pos_occupied(pos)

        let bb = occ.intersect(bb_from)

        outer: for (let sq of bb) {

            let color = piece_c_color_of(m.get_at(pos, sq)!)

            let bb2 = m.get_pieces_color_bb(pos, color === WHITE ? BLACK: WHITE)

            for (let b2 of bb2) {

                let p2 = m.get_at(pos, b2)!
                if (piece_c_color_of(p2) === color) {
                    continue
                }

                let aa2 = m.pos_attacks(pos, b2)

                if (aa2.has(sq)) {
                    continue outer
                }
            }

            table.create_new_duplicate_row(i)

            Froms.set_raw(SquareSet.fromSquare(sq))
            history_per_row.push(h)
        }

        history_unmake_for_pos(h, m, pos)
    }

}



function atomic_filter_no_blocks_check(
    fields: number[],
    start_row_index: number,
    end_row_index: number,
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

    for (let i = start_row_index; i < end_row_index; i++) {
        let h = history_per_row[i]
        history_make_for_pos(h, m, pos)

        let from_symbol_bb = bitboard_of_symbol(from_symbol, m, pos)
        let to_symbol_bb = bitboard_of_symbol(to_symbol, m, pos)

        let bb_from = Froms.rows[i].intersect(from_symbol_bb)
        let bb_to = Tos.rows[i].intersect(to_symbol_bb)

        let occ = m.pos_occupied(pos)

        let bb = occ.intersect(bb_from)

        for (let sq of bb) {

            let color = piece_c_color_of(m.get_at(pos, sq)!)
            let aa = m.pos_attacks(pos, sq)

            aa = aa.intersect(bb_to)

            let bb = m.get_pieces_color_bb(pos, color_c_opposite(color))

            outer: for (let a of aa) {

                let range = between(sq, a)


                for (let b of bb.without(a)) {
                    let bb2 = m.pos_attacks(pos, b)

                    if (!bb2.intersect(range).isEmpty()) {
                        continue outer
                    }
                }

                table.create_new_duplicate_row(i)

                Froms.set_raw(SquareSet.fromSquare(sq))
                Tos.set_raw(SquareSet.fromSquare(a))

                history_per_row.push(h)
            }
        }

        history_unmake_for_pos(h, m, pos)
    }

}


function atomic_filter_no_push_blocks_check(
    fields: number[],
    start_row_index: number,
    end_row_index: number,
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

    for (let i = start_row_index; i < end_row_index; i++) {
        let h = history_per_row[i]
        history_make_for_pos(h, m, pos)

        let from_symbol_bb = bitboard_of_symbol(from_symbol, m, pos)
        let to_symbol_bb = bitboard_of_symbol(to_symbol, m, pos)

        let bb_from = Froms.rows[i].intersect(from_symbol_bb)
        let bb_to = Tos.rows[i].intersect(to_symbol_bb)

        let occ = m.pos_occupied(pos)

        let bb = occ.intersect(bb_from)

        for (let sq of bb) {

            let color = piece_c_color_of(m.get_at(pos, sq)!)
            let aa = m.pos_attacks(pos, sq)

            aa = aa.intersect(bb_to)

            let bb = m.get_pieces_color_bb(pos, color_c_opposite(color))
            bb = bb.intersect(m.get_pieces_bb(pos, [PAWN]))

            outer: for (let a of aa) {

                let range = between(sq, a)


                for (let b of bb.without(a)) {
                    let bb2 = m.pawn_pushes(pos, b)

                    if (!bb2.intersect(range).isEmpty()) {
                        continue outer
                    }
                }

                table.create_new_duplicate_row(i)

                Froms.set_raw(SquareSet.fromSquare(sq))
                Tos.set_raw(SquareSet.fromSquare(a))

                history_per_row.push(h)
            }
        }

        history_unmake_for_pos(h, m, pos)
    }

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


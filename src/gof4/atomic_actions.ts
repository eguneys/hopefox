import { between } from "../distill/attacks";
import { BLACK, color_c_opposite, KING, make_move_from_to, make_move_from_to_promotion, move_c_to_Castling, move_c_to_Move, PAWN, piece_c_color_of, piece_c_type_of, piece_to_c, PositionC, PositionManager, role_to_c, WHITE } from "../distill/hopefox_c";
import { go_black, go_white, SquareSet } from "../distill/squareSet";
import { AtomicActionId, AtomicFilterId, PieceSymbol } from "./types";
import { squareSet } from '../distill/debug'
import { History, Columnar, history_to_sans } from "../gof2/gofer";

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
    [AtomicActionId.Promote]: atomic_action_promote,
    [AtomicActionId.Push]: atomic_action_push,

}

export const atomic_filter_handlers: Record<AtomicFilterId, AtomicHandler> = {
    [AtomicFilterId.Attack]: atomic_filter_attack,
    [AtomicFilterId.Attack_Through]: atomic_filter_attack_through,
    [AtomicFilterId.Defend]: atomic_filter_defend,
    [AtomicFilterId.About_To_Promote]: atomic_filter_about_to_promote,
    [AtomicFilterId.About_To_Push]: atomic_filter_about_to_push,
    [AtomicFilterId.No_King_Evades]: atomic_filter_no_king_evades,
    [AtomicFilterId.No_Captures]: atomic_filter_no_captures,
    [AtomicFilterId.No_Blocks_Check]: atomic_filter_no_blocks_check,
    [AtomicFilterId.No_Push_Blocks_Check]: atomic_filter_no_push_blocks_check,
    [AtomicFilterId.No_Defense]: atomic_filter_no_defense,
    [AtomicFilterId.No_Attack]: atomic_filter_no_attack,
    [AtomicFilterId.Same]: atomic_filter_same,
    [AtomicFilterId.Opposite]: atomic_filter_opposite,
    [AtomicFilterId.BackrankWall]: atomic_filter_backrank_wall,
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


                if (move_c_to_Castling(legal)) {
                    continue
                }

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


function atomic_action_push(
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

function atomic_action_promote(
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
        let promotion = fields[2]

        let from_symbol = columns[from]
        let to_symbol = columns[to]
        let promotion_symbol = columns[promotion]


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
                let { from, to, promotion } = move_c_to_Move(legal)

                if (!bb_from.has(from)) {
                    continue
                }

                if (!bb_to.has(to)) {
                    continue;
                }
                
                if (promotion === undefined) {
                    continue;
                }
                if (promotion_symbol.piece !== promotion) {
                    continue;
                }


                table.create_new_duplicate_row(i)

                Froms.set_raw(SquareSet.fromSquare(from))
                Tos.set_raw(SquareSet.fromSquare(to))

                let h2 = [...h, make_move_from_to_promotion(from, to, role_to_c(promotion))]
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
        let bb_to = Tos.rows[i]//.intersect(to_symbol_bb)

        let occ = m.pos_occupied(pos)

        let bb = occ.intersect(bb_from)

        for (let sq of bb) {

            let color = piece_c_color_of(m.get_at(pos, sq)!)

            let aa = m.pos_attacks(pos, sq)

            aa = aa.intersect(bb_to)

            //aa = aa.intersect(m.get_pieces_color_bb(pos, color_c_opposite(color)))

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


function atomic_filter_defend(
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

            aa = aa.intersect(m.get_pieces_color_bb(pos, color))

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


function atomic_filter_about_to_push(
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

        bb = bb.intersect(m.get_pieces_bb(pos, [PAWN]))

        for (let sq of bb) {

            let color = piece_c_color_of(m.get_at(pos, sq)!)

            let promotion = color === WHITE ? go_black(sq) : go_white(sq)

            if (promotion === undefined) {
                continue
            }

            table.create_new_duplicate_row(i)

            Froms.set_raw(SquareSet.fromSquare(sq))
            Tos.set_raw(SquareSet.fromSquare(promotion))

            history_per_row.push(h)
        }

        history_unmake_for_pos(h, m, pos)
    }
}



function atomic_filter_about_to_promote(
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

        bb = bb.intersect(m.get_pieces_bb(pos, [PAWN]))

        for (let sq of bb) {

            let color = piece_c_color_of(m.get_at(pos, sq)!)

            let promotion = color === WHITE ? go_black(sq) : go_white(sq)

            if (promotion === undefined) {
                continue
            }
            if (
                !SquareSet.fromRank(0).has(promotion) &&
                !SquareSet.fromRank(7).has(promotion)) {
                    continue
                }

            table.create_new_duplicate_row(i)

            Froms.set_raw(SquareSet.fromSquare(sq))
            Tos.set_raw(SquareSet.fromSquare(promotion))

            history_per_row.push(h)
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

            bb2 = bb2.diff(m.get_pieces_bb(pos, [KING]))

            for (let b2 of bb2) {
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



function atomic_filter_no_defense(
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

            let bb2 = m.get_pieces_color_bb(pos, color)

            for (let b2 of bb2) {

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


function atomic_filter_no_attack(
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

    let Froms = table.get_column(from)
    let Tos = table.get_column(to)

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

            let aa = m.pos_attacks(pos, sq)

            let bb2 = bb_to.diff(aa)


            for (let b2 of bb2) {

                table.create_new_duplicate_row(i)

                Froms.set_raw(SquareSet.fromSquare(sq))
                Tos.set_raw(SquareSet.fromSquare(b2))
                history_per_row.push(h)
            }
        }

        history_unmake_for_pos(h, m, pos)
    }
}



function atomic_filter_same(
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

        let SS = history_to_sans(h, m, pos)

        history_make_for_pos(h, m, pos)


        let from_symbol_bb = bitboard_of_symbol(from_symbol, m, pos)
        let to_symbol_bb = bitboard_of_symbol(to_symbol, m, pos)

        let bb_from = Froms.rows[i];//.intersect(from_symbol_bb)
        let bb_to = Tos.rows[i]; //.intersect(to_symbol_bb)

        let bb = bb_from.intersect(bb_to)

        for (let sq of bb) {

            table.create_new_duplicate_row(i)

            Froms.set_raw(SquareSet.fromSquare(sq))
            Tos.set_raw(SquareSet.fromSquare(sq))

            history_per_row.push(h)
        }

        history_unmake_for_pos(h, m, pos)
    }

}


function atomic_filter_opposite(
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

        let SS = history_to_sans(h, m, pos)

        history_make_for_pos(h, m, pos)


        let from_symbol_bb = bitboard_of_symbol(from_symbol, m, pos)
        let to_symbol_bb = bitboard_of_symbol(to_symbol, m, pos)

        let bb_from = Froms.rows[i]//.intersect(from_symbol_bb)
        let bb_to = Tos.rows[i]//.intersect(to_symbol_bb)

        let bb = bb_from

        for (let sq of bb) {

            let piece = m.get_at(pos, sq)!
            let color = piece_c_color_of(piece)

            let bb2 = m.get_pieces_color_bb(pos, color_c_opposite(color)).intersect(bb_to)

            for (let sq2 of bb2) {

                table.create_new_duplicate_row(i)

                Froms.set_raw(SquareSet.fromSquare(sq))
                Tos.set_raw(SquareSet.fromSquare(sq2))

                history_per_row.push(h)
            }
        }

        history_unmake_for_pos(h, m, pos)
    }

}



function atomic_filter_backrank_wall(
    fields: number[],
    start_row_index: number,
    end_row_index: number,
    columns: PieceSymbol[],
    m: PositionManager,
    pos: PositionC,
    history_per_row: History[],
    table: Columnar) {

    let from = fields[0]
    let a = fields[1]
    let b = fields[2]
    let c = fields[3]

    let from_symbol = columns[from]
    let a_symbol = columns[a]
    let b_symbol = columns[b]
    let c_symbol = columns[c]


    let Froms = table.get_column(from)
    let As = table.get_column(a)
    let Bs = table.get_column(b)
    let Cs = table.get_column(c)

    for (let i = start_row_index; i < end_row_index; i++) {
        let h = history_per_row[i]

        history_make_for_pos(h, m, pos)


        let from_symbol_bb = bitboard_of_symbol(from_symbol, m, pos)
        let a_symbol_bb = bitboard_of_symbol(a_symbol, m, pos)
        let b_symbol_bb = bitboard_of_symbol(b_symbol, m, pos)
        let c_symbol_bb = bitboard_of_symbol(c_symbol, m, pos)

        let bb_from = Froms.rows[i].intersect(from_symbol_bb)
        let bb_a = As.rows[i].intersect(a_symbol_bb)
        let bb_b = Bs.rows[i].intersect(b_symbol_bb)
        let bb_c = Cs.rows[i].intersect(c_symbol_bb)

        let bb_backranks = SquareSet.backranks()

        let bb = bb_from.intersect(bb_backranks)

        for (let sq of bb) {

            let piece = m.get_at(pos, sq)!
            let color = piece_c_color_of(piece)

            let occ_color = m.get_pieces_color_bb(pos, color)

            let wall_rank = color === WHITE ? SquareSet.fromRank(1) : SquareSet.fromRank(7)

            let w_aa = m.pos_attacks(pos, sq).intersect(wall_rank).intersect(occ_color)

            if (w_aa.size() !== 3) {
                continue
            }

            let a_sq = w_aa.first()!
            w_aa = w_aa.withoutFirst()
            let b_sq = w_aa.first()!
            w_aa = w_aa.withoutFirst()
            let c_sq = w_aa.first()!

            {

                table.create_new_duplicate_row(i)

                Froms.set_raw(SquareSet.fromSquare(sq))
                As.set_raw(SquareSet.fromSquare(a_sq))
                Bs.set_raw(SquareSet.fromSquare(b_sq))
                Cs.set_raw(SquareSet.fromSquare(c_sq))

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
    if (from_symbol.piece === undefined) {
        return m.pos_occupied(pos).complement()
    }
    return m.get_pieces_bb(pos, [role_to_c(from_symbol.piece)])
}


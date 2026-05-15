import { PieceSymbol } from "../gof4"
import { Columnar, History } from '../gof2/gofer'
import { AtomicGenCallNode } from "."
import { make_move_from_to, move_c_to_Move, piece_c_to_piece, PieceC, PositionC, PositionManager } from "../distill/hopefox_c"
import { SquareSet } from "../distill/squareSet"
import { history_make_for_pos, history_unmake_for_pos } from "../gof4/atomic_actions"
import { square } from "../distill/debug"

export type AtomicGenerator = 
    (m: PositionManager, pos: PositionC, symbol_per_column: PieceSymbol[], history_per_row: History[], table: Columnar, start_row_index: number, end_row_index: number) => void

export const atomic_generators: AtomicGenerator[] = [
    atomic_gen_captures
]


function atomic_gen_captures(m: PositionManager, pos: PositionC, symbol_per_column: PieceSymbol[], history_per_row: History[], table: Columnar, start_row_index: number, end_row_index: number): void {

    let legals = m.get_legal_moves(pos)

    for (let i = start_row_index; i < end_row_index; i++) {

        let h = history_per_row[i]
        history_make_for_pos(h, m, pos)

        let row = history_per_row[i]

        let RemainingFrom = m.pos_occupied(pos)
        let RemainingTo = m.pos_occupied(pos)
        for (let j = 0; j < symbol_per_column.length; j++) {
            let From = table.get_column(j)

            let from_j = From.rows[i]

            for (let k = 0; k < symbol_per_column.length; k++) {
                let To = table.get_column(k)

                let to_k = To.rows[i]

                for (let move of legals) {
                    let { from, to } = move_c_to_Move(move)

                    if (from_j.has(from) && to_k.has(to)) {


                        table.create_new_duplicate_row(i)


                        From.set_raw(SquareSet.fromSquare(from))
                        To.set_raw(SquareSet.fromSquare(to))

                        let h2 = [...h, make_move_from_to(from, to)]
                        history_per_row.push(h2)
                        RemainingFrom = RemainingFrom.without(from)
                        RemainingTo = RemainingTo.without(to)
                    }
                }
            }
        }


        for (let move of legals) {
            let { from, to } = move_c_to_Move(move)

            if (RemainingFrom.has(from) && RemainingTo.has(to)) {

                let piece_from = m.get_at(pos, from)!
                let piece_to = m.get_at(pos, to)

                if (piece_to === undefined) {
                    continue
                }

                let from_field = symbol_per_column.length
                let to_field = symbol_per_column.length + 1

                symbol_per_column.push(make_symbol_for_piece(piece_from, symbol_per_column))
                symbol_per_column.push(make_symbol_for_piece(piece_to, symbol_per_column))

                table.add_column_type(`captures.from.${square(from)}`)
                table.add_column_type(`captures.to.${square(to)}`)


                let From = table.get_column(from_field)
                let To = table.get_column(to_field)

                table.create_new_duplicate_row(i)

                From.set_raw(SquareSet.fromSquare(from))
                To.set_raw(SquareSet.fromSquare(to))

                let h2 = [...h, make_move_from_to(from, to)]
                history_per_row.push(h2)
            }
        }

        history_unmake_for_pos(h, m, pos)
    }
}


function make_symbol_for_piece(piece: PieceC, symbol_per_column: PieceSymbol[]): PieceSymbol {

    let { role } = piece_c_to_piece(piece)

    let ids = symbol_per_column.filter(_ => _.piece === role)
    let next_id = ids.length + 1

    return {
        piece: role,
        id: `${next_id}`
    }
}
import { move_c_to_Move, MoveC, piece_c_color_of, piece_c_to_piece, PositionC, PositionManager } from "../hopefox_c";
import { FEN } from "../mor3_hope1";
import { SquareSet } from "../squareSet";
import { Move, Piece, Square } from "../types";

let m = await PositionManager.make()

export function quiescence_plus(fen: FEN) {
    let pos = m.create_position(fen)


    let res = pos_c_to_move_plus(pos)

    m.delete_position(pos)
    return res
}

export type MovePlus = {
    from: Piece
    to?: Piece
    move: Move
    move_c: MoveC
    checkers: SquareSet
    is_checkmate: boolean
}

function pos_at_piece(pos: PositionC, sq: Square) {
        let res = m.get_at(pos, sq)

        if (res !== undefined) {
            return piece_c_to_piece(res)
        }
}

function pos_c_to_move_plus(pos: PositionC): MovePlus[] {
    return m.get_legal_moves(pos).map(move_c => {
        let move = move_c_to_Move(move_c)

        let from = pos_at_piece(pos, move.from)!
        let to = pos_at_piece(pos, move.to)

        m.make_move(pos, move_c)
        let checkers = m.checkers(pos)
        let is_checkmate = !!m.is_checkmate(pos)
        m.unmake_move(pos, move_c)

        return {
            from,
            to,
            move,
            move_c,
            checkers,
            is_checkmate
        }
    })
}
import { Position } from "../distill/chess"
import { move_c_to_Move, MoveC, PositionC, PositionManager } from "../distill/hopefox_c"
import { makeSan } from "../distill/san"
import { Move } from "../distill/types"

type SAN = string

export function san_moves(pos: Position, moves: Move[]) {
    let res: SAN[] = []
    let p2 = pos.clone()
    for (let move of moves) {
        res.push(makeSan(p2, move))
        p2.play(move)
    }
    return res
}

export function flat_san_moves(pos: Position, moves: Move[][]) {
    let res: SAN[][] = []
    for (let move of moves) {
        res.push(san_moves(pos, move))
    }
    return res
}

export function san_moves_c(m: PositionManager, pos: PositionC, moves: MoveC[]) {
    return san_moves(m.get_pos_read_fen(pos), moves.map(m => move_c_to_Move(m)))
}


export function flat_san_moves_c(m: PositionManager, pos: PositionC, moves: MoveC[][]) {
    let res: SAN[][] = []
    for (let move of moves) {
        res.push(san_moves_c(m, pos, move))
    }
    return res
}
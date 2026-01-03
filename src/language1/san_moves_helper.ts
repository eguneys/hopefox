import { Position } from "../chess"
import { move_c_to_Move, MoveC, PositionC, PositionManager } from "../hopefox_c"
import { makeSan } from "../san"
import { Move } from "../types"

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

export function san_moves_c(m: PositionManager, pos: PositionC, moves: MoveC[]) {
    return san_moves(m.get_pos_read_fen(pos), moves.map(m => move_c_to_Move(m)))
}
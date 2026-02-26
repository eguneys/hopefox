import { Position } from "../distill/chess"
import { make_move_from_to, move_c_to_Move, MoveC, PositionC, PositionManager } from "../distill/hopefox_c"
import { makeSan } from "../distill/san"
import { Move } from "../distill/types"
import { Relation } from "../language5/relation_manager"

export function extract_sans_relation(m: PositionManager, pos: PositionC, relation: Relation) {
    return extract_moves_relation(relation).map(_ => san_moves_c(m, pos, _))
}


export function extract_moves_relation(relation: Relation) {
    return relation.rows.map(_ => {
        let res = []
        for (let i = 0; i < 8; i++) {
            let from_key = `from${i === 0 ? '' : (i + 1)}`
            let to_key = `to${i === 0 ? '' : (i + 1)}`
            if (_.has(from_key)) {
                res.push(make_move_from_to(_.get(from_key)!, _.get(to_key)!))
            } else {
                break
            }
        }
        return res
    })
}




export function extract_sans(pos: Position, aa: MoveC[]) {

  let resaa = []
  let p2 = pos.clone()
  for (let a = 0; a < aa.length; a++) {
    let move = move_c_to_Move(aa[a])
    resaa.push(makeSan(p2, move))
    p2.play(move)
  }
  return resaa
}

type Column = string
type Row = Map<Column, number>
export function extract_line(row: Row) {
  let res = []
  for (let i = 1; i < 8; i++) {
    let key = i == 1 ? '' : i
    if (!row.has('from' + key)) {
      break
    }
    res.push(make_move_from_to(row.get('from' + key)!, row.get('to' + key)!))
  }
  return res
}


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
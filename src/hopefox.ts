import { Chess } from "./chess";
import { squareSet } from "./debug";
import { makeFen, parseFen } from "./fen";
import { get_king_squares } from "./squareSet";
import { Color, Role, ROLES } from "./types";
import { opposite } from "./util";

export function hopefox(fen: string, pattern: string, turn?: Color) {

    let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()

    if (!turn) {
        turn = pos.turn
    }

    let king = get_king_squares(pos.board.king.intersect(pos.board[turn]).singleSquare()!)

    let o = king[4]!

    let res = king.every((sq, i) => {
        let rule = pattern.slice(i * 2, i * 2 + 2)
        if (rule === 'Oo') return sq === undefined

        if (sq === undefined) {
            return false
        }

        let color = rule[0].toLowerCase() === rule[0] ? opposite(turn) : turn

        if (rule[1] === 'o') {
            return pos.board.get(sq)?.color === color
        }
        
        if (rule[1] === 'n') {
            let roles: Role[] = []
            if (rule[0].toLowerCase() === 'f') {
                roles = ROLES.slice(0)
            } else if (rule[0].toLowerCase() === 'r') {
                roles = ['rook']
            } else if (rule[0].toLowerCase() === 'q') {
                roles = ['queen']
            } else if (rule[0].toLowerCase() === 'n') {
                roles = ['knight']
            } else if (rule[0].toLowerCase() === 'b') {
                roles = ['bishop']
            } else if (rule[0].toLowerCase() === 'k') {
                roles = ['king']
            } else if (rule[0].toLowerCase() === 'p') {
                roles = ['pawn']
            }

            let p2 = pos.clone()
            p2.turn = color
            p2.board.take(o)
            let n = roles.find(role => {
                for (let from of p2.board[role]) {
                    if (p2.dests(from).has(sq)) {
                        return true
                    }
                }
            })

            return n !== undefined
        }

        return true
    })

    return res
}
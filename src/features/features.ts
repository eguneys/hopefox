'a Gobbles b'
'hanging a'
'a Check'
'a Forks b And c'
'a Pins b To c'
'Mate In Q'

'First Move'
'Only Move'

'aa Exchange'
'a Sacrifice'



'bishop Sacrifice'
'pawn Gobbles bishop'
'queen Forks king and rook | hanging rook'
'First Move'
'queen Gobbles rook'

import { attacks } from "../attacks"
import { Position } from "../chess"
import { fen_pos, pos_moves } from "../hopefox"
import { FEN } from "../mor3_hope1"
import { makeSan } from "../san"
import { Move, Role } from "../types"
import { onlyMove } from "./soup_snakes"

export const Backrank1 = Bind([
    Check('rook'),
    OnlyMove,
    Exchange('rook'),
    Gobbles('bishop', 'queen')
])

export const Adventure = Bind([
    Sacrifice('bishop'),
    Gobbles('pawn', 'bishop'),
    Forks('queen', 'king', 'rook'), // Hanging('rook')
    FirstMove,
    Gobbles('queen', 'rook'),
])

type PosMove = (pos: Position) => Move[][]

function Bind(ss: PosMove[]) {
    return (pos: Position) => {
        function deep(pos: Position, ss: PosMove[], line: Move[]): Move[][] {
            if (ss.length === 1) {
                return ss[0](pos).map(_ => [...line, ..._])
            }
            let ss_rest = ss.slice(1)
            let mm = ss[0](pos)

            return mm.flatMap(mm => {
                let p2 = pos.clone()
                mm.forEach(m => p2.play(m))

                return deep(p2, ss_rest, [...line, ...mm])
            })
        }

        return deep(pos, ss, [])
    }
}

function Exchange(a: Role) {
    return (pos: Position) => {

        let mm = pos_moves(pos)

        return mm.flatMap(m => {
            if (pos.board.get(m.from)!.role !== a) {
                return []
            }
            if (pos.board.get(m.to)?.role !== a) {
                return []
            }

            let p2 = pos.clone()
            p2.play(m)

            let mm2 = pos_moves(p2)

            return mm2.map(m2 => {
                if (m2.to !== m.to) {
                    return []
                }
                return [m, m2]
            })

        })
    }
}

function Check(a: Role) {
    return (pos: Position) => {

        let mm = pos_moves(pos)

        return mm.filter(m => {
            let p2 = pos.clone()
            p2.play(m)
            return p2.isCheck()
        }).map(_ => [_])
    }
}

function OnlyMove(pos: Position) {
    let m = pos_moves(pos)
    if (m.length > 1) {
        return []
    }
    return m.slice(0, 1).map(_ => [_])
}

function FirstMove(pos: Position) {
    return pos_moves(pos).slice(0, 1).map(_ => [_])
}

function Hanging(a: Role) {
    return (pos: Position) => {
        let res = []
        for (let sq of pos.board[pos.turn]) {

            for (let sq2 of pos.board[pos.turn]) {
                let piece = pos.board.get(sq2)!
                if (attacks(piece, sq2, pos.board.occupied)) {
                    res.push(sq)
                }
            }
        }
        return res
    }
}

function Forks(a: Role, b: Role, c: Role) {
    return (pos: Position) => {

    let piece = { color: pos.turn, role: a }

    let mm = pos_moves(pos)

    let res: Move[][] = []
    for (let move of mm) {
        if (pos.board.get(move.from)!.role !== a) {
            continue
        }

        let p2 = pos.clone()
        p2.play(move)

        let aa = attacks(piece, move.to, p2.board.occupied)

        let b_found = false,
            c_found = false
        for (let a of aa) {
            if (p2.board.get(a)?.role === b) {
                b_found = true
            }
            if (p2.board.get(a)?.role === c) {
                c_found = true
            }
        }

        if (b_found && c_found) {
            res.push([move])
        }
    }
    return res

}
}

function Gobbles(a: Role, b: Role) {
    return (pos: Position) => {
    let mm = pos_moves(pos)

    let res: Move[][] = []
    for (let move of mm) {
        if (pos.board.get(move.from)!.role !== a) {
            continue
        }
        if (pos.board.get(move.to)?.role !== b) {
            continue
        }
        res.push([move])
    }
    return res
}
}

function Sacrifice(a: Role) {
    return (pos: Position) => {
        let mm = pos_moves(pos)


        let res: Move[][] = []
        for (let move of mm) {
            if (pos.board.get(move.from)!.role !== a) {
                continue
            }

            let p2 = pos.clone()
            p2.play(move)

            let mm2 = pos_moves(p2)

            for (let move2 of mm2) {
                if (move2.to !== move.from) {
                    continue
                }

                res.push([move])
            }
        }
        return res
    }
}


export function play_and_sans(moves: Move[], pos: Position) {

    let res = []
    pos = pos.clone()
    for (let mm of moves) {
        res.push(makeSan(pos, mm))
        pos.play(mm)
    }
    return res
}
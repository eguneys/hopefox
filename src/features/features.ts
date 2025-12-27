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
import { blocks } from "../hopefox_helper"
import { FEN } from "../mor3_hope1"
import { makeSan } from "../san"
import { Move, Role } from "../types"
import { opposite } from "../util"
import { onlyMove } from "./soup_snakes"

export const Liquidation = Bind([
    Check('queen'),
    Exchange('queen'),
    Gobbles('king', 'rook'),
    Traps('bishop', 'rook'),
    FirstMove,
    Gobbles('bishop', 'rook')
])

export const Adventure2 = Either([
    Forks('knight', 'king', 'queen'),
    Forks('knight', 'king', 'rook'),
    Forks('knight', 'king', 'bishop'),
    Forks('bishop', 'king', 'rook'),
    Forks('rook', 'king', 'knight'),
    Forks('queen', 'king', 'bishop')
])

export const AdventureAndFinish = Bind([
    Adventure2,
    Either([
        KingRuns,
        AllMoves,
    ]),
    Either([
        Gobbles('knight', 'queen'),
        Gobbles('knight', 'rook'),
        Gobbles('knight', 'bishop'),
        Gobbles('bishop', 'rook'),
        Gobbles('rook', 'knight'),
        Gobbles('queen', 'bishop'),
    ])
])

export const UnpinGobble = Bind([
    Gobbles('knight', 'knight'),
    Gobbles('bishop', 'queen'),
    Gobbles('knight', 'queen')
])

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

export const RookMate = Bind([
    MateIn1('rook')
])

export const Backrank2 = Bind([
    Check('rook'),
    OnlyMove,
    MateIn1('rook')
])

export const Backrank3 = Bind([
    Check('queen'),
    Gobbles('bishop', 'queen'),
    Check('rook'),
    OnlyMove,
    MateIn1('rook')
])

export const Backrank4 = Bind([
    Gobbles('rook', 'rook'),
    FirstMove, // Queen block
    MateIn1('rook')
])

export const Backrank5 = Bind([
    Check('queen'),
    AllMoves,
    MateIn1('queen')
])


export const Backrank6 = Bind([
    Check('queen'),
    BlocksCheck('bishop'),
    Gobbles('queen', 'bishop'),
    OnlyMove,
    MateIn1('queen')
])



export const Backranks = Either([
    Backrank1,
    Backrank2,
    Backrank3,
    Backrank4,
    Backrank5,
    Backrank6
])


export const ExchangeAndGobble2 = Bind([
    Exchange('queen'),
    Gobbles('rook', 'rook'),
])

export const ExchangeAndGobble = Bind([
    Exchange('rook'),
    Either([
        Gobbles('rook', 'rook'),
        Gobbles('rook', 'bishop'),
    ])
])

export const GobbleAndExchange = Bind([
    Captures('queen', 'bishop'),
    Forks('queen', 'queen', 'king'),
    Captures('queen', 'queen')
])

export const GobbleAndExchange2 = Bind([
    Captures('queen', 'bishop'),
    Exchange('queen')
])


export const Skewer = Bind([
    Check('rook'),
    FirstMove,
    Gobbles('rook', 'rook')
])

export const ExchangeAndWin = Bind([
    Exchange('knight'),
    Gobbles('rook', 'queen')
])

export const GobblesSome = Either([
    Gobbles('knight', 'bishop')
])



export const TacticalFind = Either([
    Backranks,
    Adventure,
    RookMate,
    ExchangeAndGobble,
    ExchangeAndGobble2,
    Adventure2,
    Liquidation,
    Skewer,
    ExchangeAndWin,
    GobbleAndExchange,
    GobbleAndExchange2,
    GobblesSome,
    UnpinGobble,
    AdventureAndFinish
])

function Either(ss: PosMove[]) {
    return (pos: Position) => {
        return ss.flatMap(_ => _(pos))
    }
}


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

export function Exchange(a: Role) {
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

            return mm2.filter(m2 => {
                if (m2.to !== m.to) {
                    return false
                }
                return true
            }).map(m2 => {
                return [m, m2]
            })

        })
    }
}


export function MateIn1(a: Role) {
    return (pos: Position) => {

        let mm = pos_moves(pos)

        return mm.filter(m => {
            let p2 = pos.clone()
            p2.play(m)
            return p2.isCheckmate()
        }).map(_ => [_])
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

function AllMoves(pos: Position) {
    let m = pos_moves(pos)
    if (m.length > 10) {
        return []
    }
    return m.slice(0, 10).map(_ => [_])
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


function BlocksCheck(a: Role) {
    return (pos: Position) => {

        let res: Move[][] = []
        let mm = pos_moves(pos)

        let king = pos.board.kingOf(pos.turn)!

        for (let sq of pos.board[opposite(pos.turn)]) {

            let piece = pos.board.get(sq)!

            let aa = attacks(piece, sq, pos.board.occupied)

            if (!aa.has(king)) {
                continue
            }

            for (let m of mm) {
                if (aa.has(m.to)) {

                    res.push([m])
                }
            }
        }
        return res
    }
}



function Traps(a: Role, b: Role) {
    return (pos: Position) => {

    let piece = { color: pos.turn, role: a }

    let mm = pos_moves(pos)

    let res: Move[][] = []
    outer: for (let move of mm) {
        if (pos.board.get(move.from)!.role !== a) {
            continue
        }

        let p2 = pos.clone()
        p2.play(move)

        let mm2 = pos_moves(p2)

        for (let move2 of mm2) {
            let p3 = pos.clone()
            p3.play(move2)


            let mm3 = pos_moves(p3)

            if (!mm3.find(m3 => {
                return p3.board.get(m3.to)?.role === b
            })) {
                continue outer
            }
        }

        res.push([move])
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
            let piece2 = p2.board.get(a)
            if (!piece2 || piece2.color === pos.turn) {
                continue
            }
            if (piece2.role === b) {
                b_found = true
            }
            if (piece2.role === c) {
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


function Captures(a: Role, b: Role) {
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

function KingRuns(pos: Position) {
    let mm = pos_moves(pos)

    let res: Move[][] = []
    for (let move of mm) {
        if (pos.board.get(move.from)!.role !== 'king') {
            continue
        }
        res.push([move])
    }
    return res
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

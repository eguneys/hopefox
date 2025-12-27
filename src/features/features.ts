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


/**
 * 
 * 
 */


'Check Captures Pins Sacrifice Gobbles'
'Sacrifice Sacrifice Captures'
'Gobbles Exchange'
'Sacrifice Captures Check'
'Pins Any Gobbles'
'Gobbles'
'Exchange Gobbles'
'Gobbles' // 'Gobbles Exchange' 'Gobbles Exchange'
'Check Only Gobbles'// 'Check First Gobbles'
'Captures Exchange'
'Captures Forks Captures'
'Exchange Gobbles'
'Exchange Gobbles'
'Captures Exchange'

'Sacrifice Gobbles Forks FirstMove Gobbles'
'Check OnlyMove Exchange Gobbles'
'Gobbles Gobbles Gobbles'

'Gobbels' // 'Gobbles Gobbles' 'Gobbles Gobbles'

'Captures Captures Gobbles'
'Captures Gobbles Gobbles'
'Forks Sacrifice Gobbles'

'Forks KingRuns Gobbles' // 'Forks AllMoves Gobbles'

'Check Exchange Gobbles Traps FirstMove Gobbles'

'Check BlocksCheck Gobbles OnlyMove MateIn1'
'Check KingRuns Check OnlyMove MateIn1'
'Check BlocksCheck Gobbles OnlyMove MateIn1'
'Check All MateIn1'
'Gobbles FirstMove MateIn1'
'Check Gobbles Check OnlyMove MateIn1'
'Check OnlyMove MateIn1'
'MateIn1'



'Check Captures Sacrifice Gobbles Exchange Pins Forks'
'Any Only FirstMove KingRuns BlocksCheck MateIn1'

/**  */

'Check Captures Gobbles Exchange Sacrifice'
'Pins Forks'
'KingRuns BlocksCheck'
'Any Only FirstMove'
'MateIn1'

'Forks KingRuns Gobbles' // Ne2+ Kh1 Nxd4       -Q
'Exchange Gobbles'     // 'Nxd5 Qxd5+' Rxd5     -Nn -Q
'Exchange'             // 'Nxd5 cxd5'           -Nn
'Captures'             //  Nxd5                 -N
'Captures Captures Captures' // Nxd5 Qxd5+ Rxd5

'Exchange Forks KingRuns Gobbles Captures'
'Sacrifice Check'
'Pins'
'BlocksCheck'
'MateIn1'
'All Only FirstMove'



'Exchange Forks KingRuns Gobbles Captures'


'Exchange axA Bxa'
'Forks a+AB'
'KingRuns'
'Gobbles axB a<B'
'Captures axB'

'Captures KingRuns Forks'

import { attacks } from "../attacks"
import { Position } from "../chess"
import { fen_pos, pos_moves } from "../hopefox"
import { blocks } from "../hopefox_helper"
import { FEN } from "../mor3_hope1"
import { makeSan } from "../san"
import { Move, Role } from "../types"
import { opposite } from "../util"
import { onlyMove } from "./soup_snakes"

const Blocks = Either([
    BlocksCheck('bishop'),
    BlocksCheck('rook')
])



const Checks = Either([
    Check('queen'),
])

export const CapturesComb = Either([
    Captures('knight', 'queen'),
    Captures('knight', 'knight'),
    Captures('knight', 'rook'),
    Captures('knight', 'bishop'),
    Captures('knight', 'pawn'),
    Captures('bishop', 'queen'),
    Captures('bishop', 'knight'),
    Captures('bishop', 'rook'),
    Captures('bishop', 'bishop'),
    Captures('bishop', 'pawn'),
    Captures('rook', 'queen'),
    Captures('rook', 'rook'),
    Captures('rook', 'bishop'),
    Captures('rook', 'knight'),
    Captures('rook', 'pawn'),

    Captures('queen', 'rook'),
    Captures('queen', 'queen'),
    Captures('queen', 'bishop'),
    Captures('queen', 'knight'),
    Captures('queen', 'pawn'),

    Captures('pawn', 'bishop'),
    Captures('pawn', 'knight'),
    Captures('pawn', 'queen'),

    Captures('king', 'knight'),
    Captures('king', 'queen'),
    Captures('king', 'rook'),
])

const ForksComb = Either([
    Forks('knight', 'king', 'queen'),
    Forks('knight', 'king', 'rook'),
    Forks('knight', 'king', 'bishop'),
    Forks('queen', 'king', 'queen'),
    Forks('queen', 'king', 'bishop'),
    Forks('queen', 'king', 'rook'),
    Forks('rook', 'king', 'bishop'),
])

const MateIn1s = Either([
    MateIn1('rook'),
    MateIn1('queen'),
])

export const CapturesKingRunsForks = Bind([ForksComb, KingRuns, CapturesComb])
export const ChecksCapturesMateLong = Combination([Checks, Blocks, CapturesComb, MateIn1s], 5)

export const CaptureForkCapture = Bind([CapturesComb, ForksComb, CapturesComb])
export const CaptureCaptureCapture = Bind([CapturesComb, CapturesComb, CapturesComb])

export const TacticalFind2 = Either([
    MateIn1s,
    Bind([Checks, KingRuns, MateIn1s]),
    Bind([CapturesComb, CapturesComb, MateIn1s]),
    Bind([Checks, Blocks, CapturesComb, Blocks, MateIn1s]),
    Bind([Combination([Checks, Blocks, CapturesComb], 2), MateIn1s]),
    Bind([Checks, KingRuns, Checks, CapturesComb, MateIn1s]),
    Bind([Checks, CapturesComb]),
    Bind([Checks, CapturesComb, CapturesComb]),
    Bind([CapturesComb, CapturesComb]),
    Bind([CapturesComb, CapturesComb, CapturesComb]),
    Bind([CapturesComb, CapturesComb, CapturesComb, CapturesComb]),
    Bind([Checks, Blocks, CapturesComb]),
    Bind([Checks, Blocks, CapturesComb, CapturesComb]),
    CapturesKingRunsForks,
    CaptureForkCapture,
    CaptureCaptureCapture,
    CapturesComb,
])


function Combination(ss: PosMove[], n: number) {
    let res = combs(ss, n)
    return Either(res.map(_ => Bind(_)))
}

function combs<T>(a: T[], n: number): T[][] {
  let result: T[][] = [[]];
  
  for (let i = 0; i < n; i++) {
    const newResult: T[][] = [];
    for (const combo of result) {
      for (const item of a) {
        newResult.push([...combo, item]);
      }
    }
    result = newResult;
  }
  
  return result;
}

//console.log(combs([1,2,3], 3))


/*** Manual */

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
    Forks('rook', 'king', 'bishop'),
    Forks('rook', 'king', 'queen'),
    Forks('queen', 'king', 'bishop'),
    Forks('queen', 'king', 'rook'),
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
        Gobbles('rook', 'queen'),
        Gobbles('rook', 'knight'),
        Gobbles('rook', 'bishop'),
        Gobbles('queen', 'bishop'),
        Gobbles('queen', 'rook'),
    ])
])


export const ForksNewWay = Bind([
    Forks('knight', 'king', 'rook'),
    Sacrifice('queen'),
    Gobbles('queen', 'queen')
])

export const CaptureDefenderWithCheck = Bind([
    Captures('bishop', 'knight'),
    Gobbles('pawn', 'bishop'),
    Gobbles('queen', 'queen')
])

export const CaptureDefender2 = Bind([
    Captures('knight', 'bishop'),
    Captures('pawn', 'knight'),
    Gobbles('queen', 'knight')
])



export const UnpinGobble = Bind([
    Gobbles('knight', 'knight'),
    Either([
        Bind([
            Gobbles('bishop', 'queen'),
            Gobbles('knight', 'queen')
        ]),
        Bind([
            Gobbles('bishop', 'knight'),
            Gobbles('queen', 'bishop')
        ])
    ])
])

export const GobbleGobble = Bind([
    Gobbles('knight', 'rook'),
    Gobbles('bishop', 'rook'),
    Gobbles('pawn', 'bishop')
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


export const BackrankF7 = Bind([
    Check('queen'),
    KingRuns,
    Check('queen'),
    OnlyMove,
    MateIn1('rook')
])

export const BackrankBlocks = Bind([
    Check('rook'),
    BlocksCheck('bishop'),
    Gobbles('rook', 'bishop'),
    OnlyMove,
    MateIn1('rook')
])

export const BackrankLiquidation = Bind([
    Sacrifice('queen'),
    Gobbles('knight', 'queen'),
    Check('rook'),
    BlocksCheck('queen'),
    Gobbles('rook', 'queen')
])


export const Backranks = Either([
    Backrank1,
    Backrank2,
    Backrank3,
    Backrank4,
    Backrank5,
    Backrank6,
    BackrankF7,
    BackrankBlocks,
    BackrankLiquidation,
])

export const GobbleExchange = Bind([
    Captures('bishop', 'rook'),
    Exchange('queen')
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
        Gobbles('knight', 'queen'),
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


export const Skewer = Either([
    Bind([
        Check('queen'),
        OnlyMove,
        Gobbles('queen', 'rook')
    ]),
    Bind([
        Check('rook'),
        FirstMove,
        Gobbles('rook', 'rook')
    ])
])

export const ExchangeAndWin = Bind([
    Exchange('knight'),
    Gobbles('rook', 'queen')
])

export const GobblesSome = Either([
    Gobbles('knight', 'bishop'),
    Bind([
        Either([
            Gobbles('rook', 'bishop'),
            Gobbles('rook', 'knight'),
            Gobbles('rook', 'rook'),
        ]),
        Exchange('rook')
    ]),
    Bind([
        Gobbles('bishop', 'knight'),
        Exchange('bishop')
    ]),
])

export const GobblesMoreWithExchange = Bind([
    Exchange('knight'),
    Gobbles('queen', 'knight')
])

export const GobblesAll = Either([
    Gobbles('queen', 'rook')
])

export const PinAndWin = Bind([
    Pins('bishop', 'queen', 'king'),
    AnyAllMoves,
    Gobbles('bishop', 'queen')
])


export const SomeSacRook = Bind([
    Sacrifice('rook'),
    Captures('knight', 'rook'),
    Check('rook')
])

export const KingGobbles = Bind([
    Gobbles('king', 'knight'),
    Exchange('bishop')
])

export const Gobble3 = Bind([
    Sacrifice('rook'),
    Sacrifice('queen'),
    Captures('rook', 'queen')
])

export const GobbleAndSkewer = Bind([
    Check('pawn'),
    Captures('queen', 'pawn'),
    Pins('bishop', 'queen', 'king'),
    Sacrifice('queen'),
    Gobbles('pawn', 'queen')
])

export const TacticalFind = Either([
    Backranks,
    Adventure,
    RookMate,
    ExchangeAndGobble,
    ExchangeAndGobble2,
    //Adventure2,
    Liquidation,
    Skewer,
    ExchangeAndWin,
    GobbleAndExchange,
    GobbleAndExchange2,
    GobblesSome,
    GobblesAll,
    UnpinGobble,
    AdventureAndFinish,
    GobbleGobble,
    ForksNewWay,
    CaptureDefenderWithCheck,
    PinAndWin,
    SomeSacRook,
    KingGobbles,
    CaptureDefender2,
    GobbleExchange,
    Gobble3,
    GobbleAndSkewer,
    GobblesMoreWithExchange
])

export function Either(ss: PosMove[]) {
    return (pos: Position) => {
        return ss.flatMap(_ => _(pos))
    }
}


type PosMove = (pos: Position) => Move[][]

export function Bind(ss: PosMove[]) {
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

function AnyAllMoves(pos: Position) {
    let m = pos_moves(pos)
    return m.map(_ => [_])
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


function Pins(a: Role, b: Role, c: Role) {
    return (pos: Position) => {

        let res: Move[][] = []
        let mm = pos_moves(pos)

        let king = pos.board.kingOf(opposite(pos.turn))!

        for (let sq of pos.board[pos.turn]) {

            let piece = pos.board.get(sq)!
            let aaX = attacks(piece, sq, pos.board.occupied)

            for (let a of aaX) {
                let aa = attacks(piece, a, pos.board.occupied.without(sq))
                for (let sq2 of pos.board[opposite(pos.turn)]) {

                if (!aa.has(sq2)) {
                    continue
                }

                let aa2 = attacks(piece, a, pos.board.occupied.without(sq2))

                if (!aa2.has(king)) {
                    continue
                }

                for (let m of mm) {
                    if (sq === m.from && a === m.to) {
                        res.push([m])
                    }
                }

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
                if (move2.to !== move.to) {
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

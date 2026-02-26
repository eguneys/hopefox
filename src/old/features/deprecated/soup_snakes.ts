import { attacks } from "../attacks";
import { Position } from "../chess";
import { fen_pos, matein1, pos_moves } from "../hopefox";
import { FEN } from "../mor3_hope1";
import { makeSan } from "../san";
import { makeUci, opposite, parseUci } from "../util";

export type UCI = string
export type SAN = string
export type SANLine = string
export type SnakeLine = string

export type Snake = 
    | 'mateIn1'
    | 'rookExchange'
    | 'hangingRook'
    | 'rookCheck'
    | 'firstMove'
    | 'bishopGobblesQueen'
    | 'bishopGobblesRook'
    | 'onlyMove'
    | 'knightForksKingAndQueen'
    | 'knightGobblesQueen'
    | 'knightGobblesKnight'
    | 'liquidateQueensAndRooks'
    | 'knightForksKingAndRook'
    | 'knightGobblesRook'
    | 'knightForksKingAndBishop'
    | 'knightGobblesBishop'
    | 'hangingRookOnQueenExchange'
    | 'hangingRookAfterQueenExchange'
    | 'queenCheck'
    | 'queenGobblesBishop'
    | 'queenForksKingAndRook'
    | 'bishopForksKingAndRook'
    | 'bishopCheck'
    | 'bishopPinQueenToKing'
    | 'kingGobblesKnight'

export type Snakes = [Snake, UCI[]]

export type SoupSnake = Snakes[]
export type SoupSnakes = SoupSnake[]

function grade_snake(snake: Snake) {
    switch (snake) {
        case 'mateIn1': return 100000
        case 'rookExchange': return 900
        case 'hangingRook': return 800
        case 'rookCheck': return 700
        case 'bishopGobblesQueen': return 500
        case 'bishopGobblesRook': return 400
        case 'onlyMove': return 300
        case 'knightForksKingAndQueen': return 200
        case 'knightGobblesQueen': return 100
        case 'knightGobblesKnight': return 50
        case 'liquidateQueensAndRooks': return 40
        case 'knightForksKingAndRook': return 30
        case 'knightGobblesRook': return 20
        case 'knightForksKingAndBishop': return 10
        case 'knightGobblesBishop': return 5
        case 'hangingRookOnQueenExchange': return 4
        case 'hangingRookAfterQueenExchange': return 3
        case 'queenCheck': return 2
        case 'queenGobblesBishop': return 1
        case 'queenForksKingAndRook': return 0
        case 'bishopForksKingAndRook': return -1
        case 'bishopCheck': return -2
        case 'bishopPinQueenToKing': return -3
        case 'kingGobblesKnight': return -4
        case 'firstMove': return -600
        default: return 0
    }
}

export function grade(fen: FEN) {
    let res = digest(fen)

    function grade_line(line: SnakeLine) {
        let snake = line.split(" ")

        let res = 0
        for (let i = 0; i < snake.length; i++) {
            let s = snake[i] as Snake

            let score = grade_snake(s)

            if (score % 2 === 1) {
                score = -score
            }

            res += score
        }

        return res
    }

    res.sort((a, b) => grade_line(b[0]) - grade_line(a[0]))
    console.log(res)

    return res.slice(0, 1)
}

export function digest(fen: FEN) {
    let dd = drink(fen)

    let res = []

    outer: for (let d of dd) {
        for (let d2 of dd) {
            if (d === d2) {
                continue
            }
            if (d2[1] !== d[1] && d2[1].startsWith(d[1])) {
                continue outer
            }
        }
        res.push(d)
    }

    return res

}

export function drink(fen: FEN) {
    let pos = fen_pos(fen)
    let sss = soup(fen)
    let res: [SnakeLine, SANLine][] = []
    for (let ss of sss) {
        let single_snakes: Snake[] = []
        let sans: SAN[] = []
        let p2 = pos.clone()
        for (let s of ss) {
            sans.push(...play_ucis_and_give_sans(p2, s[1]))
            single_snakes.push(s[0])
        }
        if (sans.length > 0) {
            res.push([single_snakes.join(' '), sans.join(' ')])
        }
    }
    return res
}

/*

let res = [
    [],
    [['hangingRook', [Array]]],
    [['hangingRook', [Array]], ['mateIn1', [Array]]],
    [['hangingRook', [Array]], ['rookExchange', [Array]]],
    [
        ['hangingRook', [Array]],
        ['rookExchange', [Array]],
        ['mateIn1', [Array]]
    ],
    [['rookExchange', [Array]]],
    [['rookExchange', [Array]], ['hangingRook', [Array]]]
]

*/

export function soup(fen: FEN): SoupSnakes {
    let pos = fen_pos(fen);

    let LIMIT = 500
    function step(pos: Position, sofar: SoupSnake = []): SoupSnakes {
        let res: SoupSnakes = [sofar.slice(0)]
        let ss = snakes(pos);
        if (LIMIT-- < 0) {
            return []
        }

        for (let s of ss) {
            const ssnake = s;
            let [snake, ucis] = ssnake

            if (snake === 'firstMove') {
                if (sofar.length % 2 === 0) {
                    continue
                }
            }

            let newPos = play_ucis(pos, ucis);

            res.push(...step(newPos, [...sofar, ssnake]))
        }
        return res
    }
    return step(pos)
}


export function play_ucis(pos: Position, ucis: UCI[]): Position {
    let p2 = pos.clone()
    for (let move of ucis.map(_ => parseUci(_)!)) {
        p2.play(move)
    }
    return p2
}

export function play_ucis_and_give_sans(pos: Position, ucis: UCI[]): SAN[] {
    let sans: SAN[] = []
    for (let move of ucis.map(_ => parseUci(_)!)) {
        sans.push(makeSan(pos, move))
        pos.play(move)
    }
    return sans
}



export type MakeSnakes = (pos: Position) => Snakes | undefined

export function fen_snakes(fen: FEN) {
    return snakes(fen_pos(fen))
}

export function snakes(pos: Position): Snakes[] {
    let res: Snakes[] = []

    for (let f of make_snakes) {
        let s = f(pos)
        if (s !== undefined) {
            res.push(s)
        }
    }
    return res
}


export const hangingRook: MakeSnakes = (pos: Position) => {
    let mm = pos_moves(pos)

    for (let move of mm) {
        if (pos.board.get(move.to)?.role === 'rook' && pos.board.get(move.to)?.color !== pos.turn) {
            let p2 = pos.clone()
            p2.play(move)


            let mm2 = pos_moves(p2)


            for (let move2 of mm2) {
                if (move2.to === move.to) {
                    return undefined
                }
            }

            return ['hangingRook', [makeUci(move)]]
        }
    }
}

export const rookExchange: MakeSnakes = (pos: Position) => {
    
    let mm = pos_moves(pos)

    for (let move of mm) {
        if (pos.board.get(move.from)!.role === 'rook')
        if (pos.board.get(move.to)?.role === 'rook') {
            let p2 = pos.clone()
            p2.play(move)


            let mm2 = pos_moves(p2)


            for (let move2 of mm2) {
                if (move2.to === move.to) {
                    return ['rookExchange', [makeUci(move), makeUci(move2)]]
                }
            }

        }
    }
}


export const kingGobblesKnight: MakeSnakes = (pos: Position) => {
    
    let mm = pos_moves(pos)

    for (let move of mm) {
        if (pos.board.get(move.from)!.role === 'king' && pos.board.get(move.to)?.role === 'knight') {
            let p2 = pos.clone()
            p2.play(move)

            return ['kingGobblesKnight', [makeUci(move)]]
        }
    }
}



export const queenGobblesBishop: MakeSnakes = (pos: Position) => {
    
    let mm = pos_moves(pos)

    for (let move of mm) {
        if (pos.board.get(move.from)!.role === 'queen' && pos.board.get(move.to)?.role === 'bishop') {
            let p2 = pos.clone()
            p2.play(move)

            return ['queenGobblesBishop', [makeUci(move)]]
        }
    }
}


export const bishopGobblesRook: MakeSnakes = (pos: Position) => {
    
    let mm = pos_moves(pos)

    for (let move of mm) {
        if (pos.board.get(move.from)!.role === 'bishop' && pos.board.get(move.to)?.role === 'rook') {
            let p2 = pos.clone()
            p2.play(move)

            return ['bishopGobblesRook', [makeUci(move)]]
        }
    }
}



export const bishopGobblesQueen: MakeSnakes = (pos: Position) => {
    
    let mm = pos_moves(pos)

    for (let move of mm) {
        if (pos.board.get(move.from)!.role === 'bishop' && pos.board.get(move.to)?.role === 'queen') {
            let p2 = pos.clone()
            p2.play(move)

            return ['bishopGobblesQueen', [makeUci(move)]]
        }
    }
}

export const knightGobblesKnight: MakeSnakes = (pos: Position) => {
    
    let mm = pos_moves(pos)

    for (let move of mm) {
        if (pos.board.get(move.from)!.role === 'knight' && pos.board.get(move.to)?.role === 'knight') {
            let p2 = pos.clone()
            p2.play(move)

            return ['knightGobblesKnight', [makeUci(move)]]
        }
    }
}



export const knightGobblesQueen: MakeSnakes = (pos: Position) => {
    
    let mm = pos_moves(pos)

    for (let move of mm) {
        if (pos.board.get(move.from)!.role === 'knight' && pos.board.get(move.to)?.role === 'queen') {
            let p2 = pos.clone()
            p2.play(move)

            return ['knightGobblesQueen', [makeUci(move)]]
        }
    }
}


export const queenForksKingAndRook: MakeSnakes = (pos: Position) => {
    
    let mm = pos_moves(pos)

    for (let move of mm) {
        if (pos.board.get(move.from)!.role === 'queen') {
            let p2 = pos.clone()
            p2.play(move)

            if (p2.isCheck()) {

                let mm2 = pos_moves(p2)

                if (mm2.every(move2 => {
                    let p3 = p2.clone()
                    p3.play(move2)

                    let mm3 = pos_moves(p3)

                    if (mm3.find(m3 =>
                        m3.to === move2.to ||
                        (m3.from === move.to &&
                            pos.board.get(m3.to)?.role === 'rook')
                    )) {
                        return true
                    } else {
                        //console.log(mm2, mm3)
                    }


                })) {
                    return ['queenForksKingAndRook', [makeUci(move)]]
                }
            }
        }
    }
}



export const bishopForksKingAndRook: MakeSnakes = (pos: Position) => {
    
    let mm = pos_moves(pos)

    for (let move of mm) {
        if (pos.board.get(move.from)!.role === 'bishop') {
            let p2 = pos.clone()
            p2.play(move)

            if (p2.isCheck()) {

                let p3s = pos_moves(p2).map(_ => {
                    let p3 = p2.clone()
                    p3.play(_)
                    return p3
                })

                for (let p3 of p3s) {

                    let mm2 = pos_moves(p3)

                    for (let move2 of mm2) {
                        if (move2.from === move.to) {
                            if (pos.board.get(move2.to)?.role === 'rook') {
                                return ['bishopForksKingAndRook', [makeUci(move)]]
                            }
                        }
                    }
                }
            }
        }
    }
}



export const knightForksKingAndQueen: MakeSnakes = (pos: Position) => {
    
    let mm = pos_moves(pos)

    for (let move of mm) {
        if (pos.board.get(move.from)!.role === 'knight') {
            let p2 = pos.clone()
            p2.play(move)

            if (p2.isCheck()) {

                let p3s = pos_moves(p2).map(_ => {
                    let p3 = p2.clone()
                    p3.play(_)
                    return p3
                })

                for (let p3 of p3s) {

                    let mm2 = pos_moves(p3)

                    for (let move2 of mm2) {
                        if (move2.from === move.to) {
                            if (pos.board.get(move2.to)?.role === 'queen') {
                                return ['knightForksKingAndQueen', [makeUci(move)]]
                            }
                        }
                    }
                }
            }
        }
    }
}



export const knightGobblesBishop: MakeSnakes = (pos: Position) => {
    
    let mm = pos_moves(pos)

    for (let move of mm) {
        if (pos.board.get(move.from)!.role === 'knight' && pos.board.get(move.to)?.role === 'bishop') {
            let p2 = pos.clone()
            p2.play(move)

            return ['knightGobblesBishop', [makeUci(move)]]
        }
    }
}


export const knightForksKingAndBishop: MakeSnakes = (pos: Position) => {
    
    let mm = pos_moves(pos)

    for (let move of mm) {
        if (pos.board.get(move.from)!.role === 'knight') {
            let p2 = pos.clone()
            p2.play(move)

            if (p2.isCheck()) {

                let p3s = pos_moves(p2).map(_ => {
                    let p3 = p2.clone()
                    p3.play(_)
                    return p3
                })

                for (let p3 of p3s) {

                    let mm2 = pos_moves(p3)

                    for (let move2 of mm2) {
                        if (move2.from === move.to) {
                            if (pos.board.get(move2.to)?.role === 'bishop') {
                                return ['knightForksKingAndBishop', [makeUci(move)]]
                            }
                        }
                    }
                }
            }
        }
    }
}




export const knightGobblesRook: MakeSnakes = (pos: Position) => {
    
    let mm = pos_moves(pos)

    for (let move of mm) {
        if (pos.board.get(move.from)!.role === 'knight' && pos.board.get(move.to)?.role === 'rook') {
            let p2 = pos.clone()
            p2.play(move)

            return ['knightGobblesRook', [makeUci(move)]]
        }
    }
}


export const knightForksKingAndRook: MakeSnakes = (pos: Position) => {
    
    let mm = pos_moves(pos)

    for (let move of mm) {
        if (pos.board.get(move.from)!.role === 'knight') {
            let p2 = pos.clone()
            p2.play(move)

            if (p2.isCheck()) {

                let p3s = pos_moves(p2).map(_ => {
                    let p3 = p2.clone()
                    p3.play(_)
                    return p3
                })

                for (let p3 of p3s) {

                    let mm2 = pos_moves(p3)

                    for (let move2 of mm2) {
                        if (move2.from === move.to) {
                            if (pos.board.get(move2.to)?.role === 'rook') {
                                return ['knightForksKingAndRook', [makeUci(move)]]
                            }
                        }
                    }
                }
            }
        }
    }
}




export const mateIn1: MakeSnakes = (pos: Position) => {
    for (let move of pos_moves(pos)) {
        let uci = makeUci(move)

        let p2 = pos.clone()
        p2.play(move)

        if (p2.isCheckmate()) {
            return ['mateIn1', [uci]]
        }
    }
}


export const bishopCheck: MakeSnakes = (pos: Position) => {
    
    let mm = pos_moves(pos)

    for (let move of mm) {
        if (pos.board.get(move.from)!.role === 'bishop') {
            let p2 = pos.clone()
            p2.play(move)


            if (p2.isCheck()) {
                return ['bishopCheck', [makeUci(move)]]
            }

        }
    }
}



export const queenCheck: MakeSnakes = (pos: Position) => {
    
    let mm = pos_moves(pos)

    for (let move of mm) {
        if (pos.board.get(move.from)!.role === 'queen') {
            let p2 = pos.clone()
            p2.play(move)


            if (p2.isCheck()) {
                return ['queenCheck', [makeUci(move)]]
            }

        }
    }
}



export const rookCheck: MakeSnakes = (pos: Position) => {
    
    let mm = pos_moves(pos)

    for (let move of mm) {
        if (pos.board.get(move.from)!.role === 'rook') {
            let p2 = pos.clone()
            p2.play(move)


            if (p2.isCheck()) {
                return ['rookCheck', [makeUci(move)]]
            }

        }
    }
}

export const firstMove: MakeSnakes = (pos: Position) => {
    
    let mm = pos_moves(pos)

    for (let move of mm) {
        return ['firstMove', [makeUci(move)]]
    }
}


export const onlyMove: MakeSnakes = (pos: Position) => {
    
    let mm = pos_moves(pos)

    if (mm.length === 1) {
        return ['onlyMove', [makeUci(mm[0])]]
    }
}


export const liquidateQueensAndRooks: MakeSnakes = (pos: Position) => {
    
    let mm = pos_moves(pos)

    for (let move of mm) {
        if (pos.board.get(move.from)!.role === 'queen' && pos.board.get(move.to)?.role === 'rook') {

            let p2 = pos.clone()
            p2.play(move)

            let mm2 = pos_moves(p2)

            for (let move2 of mm2) {
                if (move2.to === move.to && pos.board.get(move2.from)!.role === 'queen') {


                    let p3 = p2.clone()
                    p3.play(move2)

                    let mm3 = pos_moves(p3)

                    for (let move3 of mm3) {

                        if (move3.to === move2.to && pos.board.get(move3.from)!.role === 'rook') {

                            let p4 = p3.clone()
                            p4.play(move3)

                            let mm4 = pos_moves(p4)

                            for (let move4 of mm4) {

                                if (move4.to === move3.to) {
                                    return ['liquidateQueensAndRooks', [makeUci(move), makeUci(move2), makeUci(move3), makeUci(move4)]]
                                }
                            }
                        }

                    }
                }
            }


        }
    }
}


export const hangingRookAfterQueenExchange: MakeSnakes = (pos: Position) => {
    
    let mm = pos_moves(pos)

    for (let move of mm) {
        if (pos.board.get(move.from)!.role === 'queen' && pos.board.get(move.to)?.role === 'queen') {

            let p2 = pos.clone()
            p2.play(move)

            let mm2 = pos_moves(p2)

            for (let move2 of mm2) {
                if (move2.to === move.to && pos.board.get(move2.from)!.role === 'rook') {


                    let p3 = p2.clone()
                    p3.play(move2)

                    let mm3 = pos_moves(p3)

                    for (let move3 of mm3) {

                        if (move3.to === move2.to && pos.board.get(move3.from)!.role === 'rook') {

                            let p4 = p3.clone()
                            p4.play(move3)

                            let mm4 = pos_moves(p4)

                            for (let move4 of mm4) {

                                if (move4.to === move3.to) {
                                    return undefined
                                }
                            }

                            return ['hangingRookAfterQueenExchange', [makeUci(move), makeUci(move2), makeUci(move3)]]
                        }

                    }
                }
            }


        }
    }
}



export const hangingRookOnQueenExchange: MakeSnakes = (pos: Position) => {
    
    let mm = pos_moves(pos)

    for (let move of mm) {
        if (pos.board.get(move.from)!.role === 'queen' && pos.board.get(move.to)?.role === 'rook') {

            let p2 = pos.clone()
            p2.play(move)

            let mm2 = pos_moves(p2)

            for (let move2 of mm2) {
                if (move2.to === move.to && pos.board.get(move2.from)!.role === 'queen') {


                    let p3 = p2.clone()
                    p3.play(move2)

                    let mm3 = pos_moves(p3)

                    for (let move3 of mm3) {

                        if (move3.to === move2.to && pos.board.get(move3.from)!.role === 'rook') {

                            let p4 = p3.clone()
                            p4.play(move3)

                            let mm4 = pos_moves(p4)

                            for (let move4 of mm4) {

                                if (move4.to === move3.to) {
                                    return undefined
                                }
                            }

                            return ['hangingRookOnQueenExchange', [makeUci(move), makeUci(move2), makeUci(move3)]]
                        }

                    }
                }
            }


        }
    }
}



export const bishopPinQueenToKing: MakeSnakes = (pos: Position) => {
    
    let mm = pos_moves(pos)

    outer: for (let move of mm) {
        if (pos.board.get(move.from)!.role === 'bishop') {

            let p2 = pos.clone()
            p2.play(move)

            let mm2 = pos_moves(p2)

            if (mm2.every(move2 => {
                let p3 = p2.clone()
                p3.play(move2)

                let mm3 = pos_moves(p3)

                if (mm3.find(m3 =>
                    m3.to === move2.to ||
                    (m3.from === move.to &&
                    pos.board.get(m3.to)?.role === 'queen')
                )) {
                    return true
                } else {
                    //console.log(mm2, mm3)
                }

            })) {

                return ['bishopPinQueenToKing', [makeUci(move)]]
            }
        }
    }
}





let make_snakes: MakeSnakes[] = [
    mateIn1, 
    hangingRook, 
    rookExchange, 
    rookCheck, 
    onlyMove, 
    bishopGobblesQueen, 
    knightForksKingAndQueen, 
    knightGobblesQueen, 
    knightGobblesKnight, 
    firstMove, 
    liquidateQueensAndRooks,
    knightForksKingAndRook,
    knightGobblesRook,
    knightForksKingAndBishop,
    knightGobblesBishop,
    hangingRookOnQueenExchange,
    hangingRookAfterQueenExchange,
    queenCheck,
    queenGobblesBishop,
    queenForksKingAndRook,
    bishopForksKingAndRook,
    bishopCheck,
    bishopPinQueenToKing,
    kingGobblesKnight
]
import { Chess, Position } from "./chess";
import { squareSet } from "./debug";
import { makeFen, parseFen } from "./fen";
import { makeSan } from "./san";
import { get_king_squares } from "./squareSet";
import { Color, Move, NormalMove, Piece, Role, ROLES, Square } from "./types";
import { opposite } from "./util";

const king_variations = (king: (Square| undefined)[]): (Square | undefined)[][] => {

    const t = (m: number[]) => {
        return (king: (Square | undefined)[]) => m.map(i => king[i])
    }

    let rotate = t([
        0, 3, 6,
        1, 4, 7,
        2, 5, 8]
    )
    let mirror = t([
        6, 7, 8,
        3, 4, 5,
        0, 1, 2])

    let r1 = rotate(king)
    let r2 = rotate(r1)
    let r3 = rotate(r2)

    return [king, r1, r2, r3,  mirror(king), mirror(r1), mirror(r2), mirror(r3)]
}

export function hopefox(fen: string, pattern: string, turn?: Color) {

    let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()

    if (!turn) {
        turn = pos.turn
    }

    let king = get_king_squares(pos.board.king.intersect(pos.board[turn]).singleSquare()!)

    return king_variations(king).some(king => {
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
                        if (p2.pseudo_dests(from).has(sq)) {
                            return true
                        }
                    }
                })

                return n !== undefined
            }

            return true
        })

        return res
    })
}

export function tactics(fen: string) {
    let pos = fen_pos(fen)
    let m1 = matein1(pos)
    let cq = cookqueen(pos)

    let res = []

    if (m1) {
        res.push(['mateIn1', m1])
    }
    if (cq) {
        res.push(['cookqueen', cq])
    }
    return res
}

export function matein1(pos: Position) {
    let res = turn_moves(pos).flatMap(mmate => {
        let [smate, p2] = make_san_and_play(pos, mmate)

        if (p2.isCheckmate()) {
            return smate
        }
        return []
    })
    if (res.length === 1) {
        return res
    }
}

export function xdefenderqueen(pos: Position) {


    return xdefenders(pos).filter(_ => _[0].role === 'queen' && _[2].length === 1).flatMap(_ => {
        let [_a, xqueen, [defender]] = _

        return turn_moves(pos)
        .filter(_ => _.to === defender[1].from)
        .flatMap(xdef => {
            let [sxdef, p2] = make_san_and_play(pos, xdef)

            if (!p2.isCheck()) {
                return []
            }

            return turn_moves(p2)
            .filter(_ => _.to === xdef.to)
            .flatMap(xxdef => {
                let [sxxdef, p3] = make_san_and_play(p2, xxdef)

                return turn_moves(p3)
                .filter(_ => _.to === xqueen.to)
                .map(xqueen => {
                    let [sxqueen, p4] = make_san_and_play(p3, xqueen)

                    return [sxdef, sxxdef, sxqueen]
                })
            })
        })

    })
}

export function cookqueen(pos: Position) {
    let res = role_moves(pos, 'rook').flatMap(mrook => {

        let p2 = pos.clone()
        let srook = makeSan(p2, mrook)
        p2.play(mrook)

        if (!p2.isCheck()) {
            return []
        }

        let rest = role_moves(p2, 'king')
        .filter(_ => _.to === mrook.to)
        .flatMap(mking => {

            let p3 = p2.clone()
            let sking = makeSan(p3, mking)
            p3.play(mking)

            let rest = role_moves(p3, 'queen')
            .filter(_ => p3.board.getRole(_.to) === 'queen')
            .flatMap(mqueen => {

                let p4 = p3.clone()
                let squeen = makeSan(p3, mqueen)
                p4.play(mqueen)

                let recapture = turn_moves(p4)
                .filter(_ => _.to === mqueen.to)


                if (recapture.length === 0) {
                   return squeen
                }
                return []
            })

            if (rest.length === 1) {
                return [[sking, rest[0]]]
            }
            return []
        })

        if (rest.length === 1) {
            return [[srook, ...rest[0]]]
        }
        return []
    })

    if (res.length === 1) {
        return res[0]
    }
}

function turn_captures(pos: Position): [Piece, NormalMove][] {

    return turn_moves(pos).flatMap(xqueen => {

        let [sxqueen, p2] = make_san_and_play(pos, xqueen)

        let p = pos.board.get(xqueen.to)

        if (!p) {
            return []
        }

        return [[p, xqueen]]
    })
}

function turn_moves(pos: Position) {
    let res = []
    let turn = pos.turn

    let rooks = pos.board[turn]

    for (let from of rooks) {
        for (let to of pos.dests(from)) {
            let move = { from, to }
            res.push(move)
        }
    }

    return res
}

function role_moves(pos: Position, role: Role) {
    let res = []
    let turn = pos.turn

    let rooks = pos.board[role].intersect(pos.board[turn])

    for (let from of rooks) {
        for (let to of pos.dests(from)) {
            let move = { from, to }
            res.push(move)
        }
    }

    return res
}

function xdefenders(pos: Position): [Piece, NormalMove, [Piece, NormalMove][]][] {

    return turn_captures(pos).flatMap(pm => {
        let [piece1, x] = pm

        let [xsan, p2] = make_san_and_play(pos, x)

        let res = turn_captures(p2).flatMap(pm2 => {

            let [piece2, xx] = pm2

            if (xx.to === x.to) {
                return [pm2]
            }
            return []
        })

        if (res.length > 0) {
            return [([piece1, x, res] as [Piece, NormalMove, [Piece, NormalMove][]])]
        }
        return []
    })
}


export function fen_pos(fen: string) {
    let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()
    return pos
}


function make_san_and_play(pos: Position, move: Move): [string, Position] {
    let p2 = pos.clone()
    let san = makeSan(pos, move)
    p2.play(move)
    return [san, p2]
}
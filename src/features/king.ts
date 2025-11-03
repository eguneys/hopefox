import { attacks, between } from "../attacks"
import { squareSet } from "../debug"
import { parseFen } from "../fen"
import { fen_pos } from "../hopefox"
import { blocks } from "../hopefox_helper"
import { parse_piece, Pieces } from "../mor3_hope1"
import { makeSan } from "../san"
import { AttackPiece, fen_to_scontext, s_attack_pieces, s_find_sq, s_occupied, SContext } from "../short/mor_short"
import { get_king_squares, SquareSet } from "../squareSet"
import { Square } from "../types"

export type FEN = string

export type Influence = {
    occupy?: Pieces
    attacked_by: AttackLine[]
}

export type AttackLine = Pieces[]

export type SIN = Record<Square, Influence>

export type Gap = {
    sq: Square,
    friend?: Pieces
    covered: Pieces[]
}

export function king(fen: FEN) {

    let pos = fen_pos(fen)

    let s = fen_to_scontext(fen)

    let sin = influences(s)

    let gg =  gaps(s, sin)

    let ee = gg.filter(_ => (_.friend === undefined || _.friend === 'k') && _.covered.length === 0)

    let occupied = s_occupied(s).without(s['k'])

    if (ee.length === 3) {
        let e_sq = ee[0].sq


        if (s['Q']) {
            let qqq = attacks(piece_queen, e_sq, occupied)
            qqq = qqq.intersect(attacks(piece_queen, s['Q'], occupied))
            let qq3 = SquareSet.empty()
            for (let qq of qqq) {
                let qq2 = SquareSet.empty()
                let capturing = sin[qq].attacked_by.filter(_ => is_black(_[0]))
                if (capturing.length === 0) {
                    qq2 = qq2.set(qq, true)
                }
                if (capturing.length === 1 && capturing[0][0] === 'k') {
                    let defending = sin[qq].attacked_by.filter(_ => is_white(_[0]))
                    if (defending.length > 1) {
                        qq2 = qq2.set(qq, true)
                    }
                }

                outer: for (let qq2_i of qq2) {
                    for (let qq_interposing of between(qq2_i, e_sq)) {
                        let interposing = sin[qq_interposing].attacked_by.filter(_ => is_black(_[0]))

                        if (interposing.length > 0) {
                            continue outer
                        }
                    }
                    qq3 = qq3.set(qq2_i, true)
                }
            }

            let f_sq = qq3.singleSquare()

            if (f_sq) {
                return makeSan(pos, { from: s['Q'], to: f_sq })
            }
        }




        for (let R of ['R', 'R2'])
        if (s[R]) {
            let qqq = attacks(piece_rook, e_sq, occupied)
            qqq = qqq.intersect(attacks(piece_rook, s[R], occupied))
            let qq3 = SquareSet.empty()
            for (let qq of qqq) {
                let qq2 = SquareSet.empty()
                let capturing = sin[qq].attacked_by.filter(_ => _.length === 1 && is_black(_[0]))
                if (capturing.length === 0) {
                    qq2 = qq2.set(qq, true)
                }
                if (capturing.length === 1 && capturing[0][0] === 'k') {
                    let defending = sin[qq].attacked_by.filter(_ => is_white(_[0]))
                    if (defending.length > 1) {
                        qq2 = qq2.set(qq, true)
                    }
                }


                outer: for (let qq2_i of qq2) {
                    for (let qq_interposing of between(qq2_i, e_sq)) {
                        let interposing = sin[qq_interposing].attacked_by.filter(_ => _[0] !== 'k' && _[0][0] !== 'p' && is_black(_[0]))

                        if (interposing.length > 0) {
                            if (s[interposing[0][0]] !== qq2_i) {
                                continue outer
                            }
                        }
                    }
                    qq3 = qq3.set(qq2_i, true)
                }
            }


            let f_sq = qq3.singleSquare()

            if (f_sq) {
                return makeSan(pos, { from: s[R], to: f_sq })
            }
        }

    }

    if (ee.length === 4) {

        let e_sq = ee[0].sq
        if (s['Q']) {
            let qqq = attacks(piece_queen, e_sq, occupied)
            qqq = qqq.intersect(attacks(piece_queen, s['Q'], occupied))
            let qq3 = SquareSet.empty()
            for (let qq of qqq) {
                let qq2 = SquareSet.empty()
                let capturing = sin[qq].attacked_by.filter(_ => _.length === 1 && is_black(_[0]))
                if (capturing.length === 0) {
                    qq2 = qq2.set(qq, true)
                }
                if (capturing.length === 1 && capturing[0][0] === 'k') {
                    let defending = sin[qq].attacked_by.filter(_ => is_white(_[0]))
                    if (defending.length > 1) {
                        qq2 = qq2.set(qq, true)
                    }
                }

                outer: for (let qq2_i of qq2) {
                    for (let qq_interposing of between(qq2_i, e_sq)) {
                        let interposing = sin[qq_interposing].attacked_by.filter(_ => is_black(_[0]))

                        if (interposing.length > 0) {
                            if (s[interposing[0][0]] !== qq2_i) {
                                continue outer
                            }
                        }
                    }
                    qq3 = qq3.set(qq2_i, true)
                }
            }

            console.log(squareSet(qq3))
            let f_sq = qq3.singleSquare()

            if (f_sq) {
                return makeSan(pos, { from: s['Q'], to: f_sq })
            }
        }



    }

    if (ee.length === 2) {
        let e_sq = ee[0].sq

        if (s['Q']) {
            let qqq = attacks(piece_queen, e_sq, occupied)
            qqq = qqq.intersect(attacks(piece_queen, s['Q'], occupied))
            let qq3 = SquareSet.empty()
            for (let qq of qqq) {
                let qq2 = SquareSet.empty()
                let capturing = sin[qq].attacked_by.filter(_ => _.length === 1 && is_black(_[0]))
                if (capturing.length === 0) {
                    qq2 = qq2.set(qq, true)
                }
                if (capturing.length === 1 && capturing[0][0] === 'k') {
                    let defending = sin[qq].attacked_by.filter(_ => is_white(_[0]))
                    if (defending.length > 1) {
                        qq2 = qq2.set(qq, true)
                    }
                }

                outer: for (let qq2_i of qq2) {
                    for (let qq_interposing of between(qq2_i, e_sq)) {
                        let interposing = sin[qq_interposing].attacked_by.filter(_ => is_black(_[0]))

                        if (interposing.length > 0) {
                            continue outer
                        }
                    }
                    qq3 = qq3.set(qq2_i, true)
                }
            }

            let f_sq = qq3.singleSquare()

            if (f_sq) {
                return makeSan(pos, { from: s['Q'], to: f_sq })
            }
        }



        for (let R of ['R', 'R2'])
        if (s[R]) {
            let qqq = attacks(piece_rook, e_sq, occupied)
            qqq = qqq.intersect(attacks(piece_rook, s[R], occupied))
            let qq3 = SquareSet.empty()
            for (let qq of qqq) {
                let qq2 = SquareSet.empty()
                let capturing = sin[qq].attacked_by.filter(_ => _.length === 1 && is_black(_[0]))
                if (capturing.length === 0) {
                    qq2 = qq2.set(qq, true)
                }
                if (capturing.length === 1 && capturing[0][0] === 'k') {
                    let defending = sin[qq].attacked_by.filter(_ => is_white(_[0]))
                    if (defending.length > 1) {
                        qq2 = qq2.set(qq, true)
                    }
                }

                outer: for (let qq2_i of qq2) {
                    for (let qq_interposing of between(qq2_i, e_sq)) {
                        let interposing = sin[qq_interposing].attacked_by.filter(_ => _.length === 1 && (_[0] !== 'k' && _[0][0] !== 'p') && is_black(_[0]))

                        if (interposing.length > 0) {
                            if (s[interposing[0][0]] !== qq2_i) {
                                continue outer
                            }
                        }
                    }
                    qq3 = qq3.set(qq2_i, true)
                }

            }

            let f_sq = qq3.singleSquare()

            if (f_sq) {
                return makeSan(pos, { from: s[R], to: f_sq })
            }
        }

    }

    if (ee.length === 1) {
        let e_sq = ee[0].sq

        if (s['N']) {
            let qqq = attacks(piece_knight, e_sq, occupied)
            qqq = qqq.intersect(attacks(piece_knight, s['N'], occupied))
            let qq3 = SquareSet.empty()
            for (let qq of qqq) {
                let qq2 = SquareSet.empty()
                let capturing = sin[qq].attacked_by.filter(_ => is_black(_[0]))
                if (capturing.length === 0) {
                    qq2 = qq2.set(qq, true)
                }
                qq3 = qq3.union(qq2)
            }

            let f_sq = qq3.singleSquare()

            if (f_sq) {
                return makeSan(pos, { from: s['N'], to: f_sq })
            }
        }

        if (s['Q']) {
            let qqq = attacks(piece_queen, e_sq, occupied)
            qqq = qqq.intersect(attacks(piece_queen, s['Q'], occupied))
            let qq3 = SquareSet.empty()
            for (let qq of qqq) {
                let qq2 = SquareSet.empty()
                let capturing = sin[qq].attacked_by.filter(_ => _.length === 1 && is_black(_[0]))
                if (capturing.length === 0) {
                    qq2 = qq2.set(qq, true)
                }
                if (capturing.length === 1 && capturing[0][0] === 'k') {
                    let defending = sin[qq].attacked_by.filter(_ => is_white(_[0]))
                    if (defending.length > 1) {
                        qq2 = qq2.set(qq, true)
                    }
                }

                outer: for (let qq2_i of qq2) {
                    for (let qq_interposing of between(qq2_i, e_sq)) {
                        let interposing = sin[qq_interposing].attacked_by.filter(_ => is_black(_[0]))

                        if (interposing.length > 0) {
                            continue outer
                        }
                    }
                    qq3 = qq3.set(qq2_i, true)
                }
            }

            let f_sq = qq3.singleSquare()

            if (f_sq) {
                return makeSan(pos, { from: s['Q'], to: f_sq })
            }
        }



        for (let R of ['R', 'R2'])
        if (s[R]) {
            let qqq = attacks(piece_rook, e_sq, occupied)
            qqq = qqq.intersect(attacks(piece_rook, s[R], occupied))
            let qq3 = SquareSet.empty()
            for (let qq of qqq) {
                let qq2 = SquareSet.empty()
                let capturing = sin[qq].attacked_by.filter(_ => _.length === 1 && is_black(_[0]))
                if (capturing.length === 0) {
                    qq2 = qq2.set(qq, true)
                }
                if (capturing.length === 1 && capturing[0][0] === 'k') {
                    let defending = sin[qq].attacked_by.filter(_ => is_white(_[0]))
                    if (defending.length > 1) {
                        qq2 = qq2.set(qq, true)
                    }
                }

                outer: for (let qq2_i of qq2) {
                    for (let qq_interposing of between(qq2_i, e_sq)) {
                        let interposing = sin[qq_interposing].attacked_by.filter(_ => is_black(_[0]))

                        if (interposing.length > 0) {
                            if (s[interposing[0][0]] !== qq2_i) {
                                continue outer
                            }
                        }
                    }
                    qq3 = qq3.set(qq2_i, true)
                }
            }

            let f_sq = qq3.singleSquare()

            if (f_sq) {
                return makeSan(pos, { from: s[R], to: f_sq })
            }
        }

    }
}

export function gaps(s: SContext, sin: SIN) {

    let res: Gap[] = []
    let sq = s['k']

    let ss = get_king_squares(sq)

    for (let s of ss) {
        if (s === undefined) {
            continue
        }

        let rr: Gap = { sq: s, covered: [] }

        if (sin[s].occupy !== undefined) {
            if (is_black(sin[s].occupy)) {
                rr.friend = sin[s].occupy
            }
        }

        let aa = sin[s].attacked_by.filter(_ => _.length === 1 && is_white(_[0]))

        rr.covered = aa.map(_ => _[0])

        res.push(rr)
    }

    return res
}

function is_black(c: Pieces) {
    return c.toLowerCase() === c
}

function is_white(c: Pieces) {
    return !is_black(c)
}

function influences(s: SContext) {
    let occupied = s_occupied(s)

    let res: SIN  = {}
    for (let p of Object.keys(s)) {
        let sq = s[p]

        if (res[sq] === undefined) {
            res[sq] = {
                attacked_by: []
            }
        }
        res[sq].occupy = p

        let p_reversed = p[0].toLowerCase() === p[0] ? p.toUpperCase() : p.toLowerCase()

        let aaa: SquareSet = attacks(parse_piece(p_reversed), sq, SquareSet.empty())

        for (let aa of aaa) {
            let pp2 = is_sliding_piece(p) ? between(sq, aa).intersect(occupied) : []

            if (res[aa] === undefined) {
                res[aa] = {
                    attacked_by: []
                }
            }

            res[aa].attacked_by.push([sq, ...pp2].flatMap(_ => s_find_sq(s, _) ?? []))
        }
    }

    for (let sq of SquareSet.full()) {
        if (res[sq] === undefined) {
            res[sq] = {
                attacked_by: []
            }
        }
    }

    return res
}


let piece_w_pawn = parse_piece('P')
let piece_b_pawn = parse_piece('p')
let piece_queen = parse_piece('q')
let piece_bishop = parse_piece('b')
let piece_rook = parse_piece('r')
let piece_knight = parse_piece('n')
let piece_king = parse_piece('k')

const is_sliding_piece = (p: Pieces) => {
    return 'rqb'.includes(p[0].toLowerCase())
}
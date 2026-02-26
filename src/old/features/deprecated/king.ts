import { attacks, between } from "../attacks"
import { squareSet } from "../debug"
import { parseFen } from "../fen"
import { fen_pos, pos_moves } from "../hopefox"
import { PositionManager } from "../hopefox_c"
import { blocks } from "../hopefox_helper"
import { Pieces } from "../mor3_hope1"
import { makeSan } from "../san"
import { AttackPiece, fen_to_scontext, parse_piece, s_attack_pieces, s_find_sq, s_occupied, SContext } from "../short/mor_short"
import { get_king_squares, SquareSet } from "../squareSet"
import { Move, Square } from "../types"

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
    covered2: [Pieces, Pieces][]
}

let m = await PositionManager.make()


export function king1(fen: FEN) {

    let pos = m.create_position(fen)

    let s = fen_to_scontext(fen)

    let sin = influences(s)
    let coverage_initial = gaps_coverage(s, sin)

    let mm = m.get_legal_moves(pos)

    outer: for (let im of mm) {
        m.make_move(pos, im)

        let fen = m.get_fen(pos)

        let s = fen_to_scontext(fen)
        let sin = influences(s)
        let coverage2 = gaps_coverage(s, sin)

        m.unmake_move(pos, im)


        /*
        let a = m.make_san(pos, im)
        if (a.includes('#')) {
            console.log(a)
        }
            */

        if (coverage2.zero.length === 1) {
            let cc = coverage2.zero[0]

            if (cc.covered2.length === 1) {
                if (cc.covered2[0][1]=== 'k') {
                } else {
                    continue outer
                }
            } else {
                continue outer
            }
        } else if (coverage2.zero.length === 0) {
        } else {
            continue outer
        }

        let direct = coverage2.direct
        if (direct.covered.length > 0) {

            let from = s[direct.covered[0]]
            let to = direct.sq

            for (let i of between(from, to)) {
                let interpose = sin[i].attacked_by.filter(_ => _.length === 1 && is_black(_[0]))
                if (interpose.length === 0) {

                } else if (interpose.length === 1) {
                    if (interpose[0][0] !== 'k' && interpose[0][0][0] !== 'p') {
                        continue outer
                    }
                } else if (interpose.filter(_ => _[0][0] !== 'k' && interpose[0][0][0] !== 'p').length > 0) {
                    continue outer
                }
            }

            let b_captures = sin[from].attacked_by.filter(_ => _.length === 1 && is_black(_[0]))
            let w_captures = sin[from].attacked_by.filter(_ => _.length === 1 && is_white(_[0]))

            if (b_captures.length === 1) {
                if (b_captures[0][0] === 'k') {
                    if (w_captures.length === 0) {
                        continue outer
                    }
                } else {
                    continue outer
                }
            } else if (b_captures.length > 1) {
                continue outer
            }

            return m.make_san(pos, im)
        }
    }
}

function gaps_coverage(s: SContext, sin: SIN) {

    let gg =  gaps(s, sin)

    let direct = gg.find(_ => _.friend === 'k')!

    let zero= gg.filter(_ => _.friend === undefined && _.covered.length === 0)

    let single = gg.filter(_ => _.friend === undefined && _.covered.length === 1)
    let single2 = gg.filter(_ => _.friend === undefined && _.covered2.length === 1)

    return {
        direct,
        zero,
        single,
        single2
    }
}



export function king(fen: FEN) {

    let pos = fen_pos(fen)

    let s = fen_to_scontext(fen)

    let sin = influences(s)

    let gg =  gaps(s, sin)

    let ee = gg.filter(_ => (_.friend === undefined || _.friend === 'k') && _.covered.length === 0)

    let ee_single_covered = gg.filter(_ => (_.friend === undefined || _.friend === 'k') && _.covered.length === 1)
    let ee_single_covered2 = gg.filter(_ => (_.friend === undefined || _.friend === 'k') && _.covered2.length === 1)

    let occupied = s_occupied(s).without(s['k'])

    type SAN = string

    let in_res: Record<Square, Move[]> = {}

        if (s['N']) {

            for (let e of ee) {
                let e_sq = e.sq

                let ll: Move[] = []

                let qqq = attacks(piece_knight, e_sq, occupied)
                qqq = qqq.intersect(attacks(piece_knight, s['N'], occupied))
                let qq3 = SquareSet.empty()
                for (let qq of qqq) {
                    let fs = s_find_sq(s, qq)
                    if (fs !== undefined && is_white(fs)) {
                        continue
                    }

                    let qq2 = SquareSet.empty()
                    let capturing = sin[qq].attacked_by.filter(_ => _.length === 1 && is_black(_[0]))
                    if (capturing.length === 0) {
                        qq2 = qq2.set(qq, true)
                    }
                    qq3 = qq3.union(qq2)
                }

                let f_sq = qq3.singleSquare()

                if (f_sq) {
                    ll.push({ from: s['N'], to: f_sq })
                }

                if (in_res[e_sq] === undefined) {
                    in_res[e_sq] = []
                }
                in_res[e_sq].push(...ll)
            }

        }


    for (let R of Object.keys(s)) {
        if (!is_white(R) || !is_sliding_piece(R)) {
            continue
        }



        for (let e of ee) {
            let e_sq = e.sq

            let ll: Move[] = []

            let piece = parse_piece(R)

            let qqq = attacks(piece, e_sq, occupied)
            qqq = qqq.intersect(attacks(piece, s[R], occupied))
            let qq3 = SquareSet.empty()
            for (let qq of qqq) {
                let fs = s_find_sq(s, qq)
                if (fs !== undefined && is_white(fs)) {
                    continue
                }

                let sin_qq_attacked_by = sin[qq].attacked_by.filter(_ => _.length === 1 || (_.length === 2 && _[1] === R))

                let qq2 = SquareSet.empty()
                let capturing = sin_qq_attacked_by.filter(_ => is_black(_[0]))
                if (capturing.length === 0) {
                    qq2 = qq2.set(qq, true)
                }
                if (capturing.length === 1 && capturing[0][0] === 'k') {
                    let defending = sin_qq_attacked_by.filter(_ => is_white(_[0]))
                    if (defending.length > 1) {
                        qq2 = qq2.set(qq, true)
                    }
                }

                qq3 = qq3.union(qq2)
            }

            //console.log(squareSet(qq3))
            let qq4 = SquareSet.empty()
            outer: for (let qq2_i of qq3) {
                for (let qq_interposing of between(qq2_i, e_sq)) {
                    let interposing = sin[qq_interposing].attacked_by.filter(_ => _.length === 1 && _[0][0] !== 'p' && _[0] !== 'k' && is_black(_[0]))

                    if (interposing.length > 0) {
                        if (s[interposing[0][0]] !== qq2_i) {
                            continue outer
                        }
                    }
                }
                qq4 = qq4.set(qq2_i, true)
            }



            for (let f_sq of qq4) {
                ll.push({ from: s[R], to: f_sq })
            }

            if (in_res[e_sq] === undefined) {
                in_res[e_sq] = []
            }
            in_res[e_sq].push(...ll)
        }
    }

    let no_good_sans: SAN[] = []

    for (let _sq of Object.keys(in_res)) {
        let e_sq = parseInt(_sq)
        for (let to_move of in_res[e_sq])
        for (let e1_single of ee_single_covered) {

            let R = e1_single.covered[0]

            if (s[R] !== to_move.from) {
                continue
            }
            if (e1_single.covered2[0] !== undefined) {
                if (e1_single.covered2[0][1] === R) {
                    continue
                }
            }

            if (!attacks(parse_piece(R), e1_single.sq, occupied).has(to_move.to)) {
                no_good_sans.push(makeSan(pos, to_move))
            }
        }
    }


    let by_san: Record<SAN, Square[]> = {}

    for (let i_sq of Object.keys(in_res)) {
        let sq = parseInt(i_sq)
        in_res[sq].map(_ => makeSan(pos, _))
            .filter(_ => !no_good_sans.includes(_))
            .forEach(_ => by_san[_] = [...(by_san[_] ?? []), sq])
    }

    if (Object.keys(by_san).length === 0) {
        return undefined
    }

    //console.log(by_san, res)
    let key = Object.keys(by_san)[0]
    let max_nb = by_san[key].length

    for (let san of Object.keys(by_san)) {

        if (by_san[san].length > max_nb) {
            key = san
            max_nb = by_san[key].length
        }
    }
    return key
}

export function gaps(s: SContext, sin: SIN) {

    let res: Gap[] = []
    let sq = s['k']

    let ss = get_king_squares(sq)

    for (let s of ss) {
        if (s === undefined) {
            continue
        }

        let rr: Gap = { sq: s, covered: [], covered2: [] }

        if (sin[s].occupy !== undefined) {
            if (is_black(sin[s].occupy)) {
                rr.friend = sin[s].occupy
            }
        }

        let aa = sin[s].attacked_by.filter(_ => _.length === 1 && is_white(_[0]))

        rr.covered = aa.map(_ => _[0])

        let aa2 = sin[s].attacked_by.filter(_ => _.length === 2 && is_white(_[0]))

        rr.covered2 = aa2.map(_ => [_[0], _[1]])



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

        //let p_reversed = p[0].toLowerCase() === p[0] ? p.toUpperCase() : p.toLowerCase()

        let aaa: SquareSet = attacks(parse_piece(p), sq, SquareSet.empty())

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
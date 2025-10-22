import { attacks as js_attacks } from "../attacks";
import { between } from "../attacks";
import { Chess } from "../chess";
import { squareSet } from "../debug";
import { EMPTY_FEN, makeFen, parseFen } from "../fen";
import { piece_to_c, PositionManager } from "../hopefox_c";
import { type FEN, type Pieces } from "../mor3_hope1";
import { arr_shuffle } from "../random";
import { SquareSet } from "../squareSet";
import { Color, Piece, Role, Square } from "../types";
import { squareFile, squareFromCoords, squareRank } from "../util";

let m = await PositionManager.make()

const attacks = (p: Piece, sq: Square, occupied: SquareSet) => {
    return m.attacks(piece_to_c(p), sq, occupied)
    //return js_attacks(p, sq, occupied)
}

type QContext = Record<Pieces, SquareSet>

export function l_attack_pieces(l: AttackPiece[]) {
    let q = l_qcontext(l)

    //q = fen_to_qcontext("3r4/p1p2kpp/4rn2/1p6/2N1P3/3n1P2/PB4PP/R2R2K1")
    //q = fen_to_qcontext("2r4k/1p3pR1/p1q1pN1p/3pPn1P/P2P4/1P1Q3R/1r1B1P2/7K b - - 0 30")

    let L = l.flatMap(l_attack_lines)

    L = L.sort((a, b) => b.length - a.length)

    let res = l_solve(q, 0, L)

    let res_out =  [...res.map(_ => q_fen_singles(_))]

    let v_out = res_out.map(_ => `https://lichess.org/editor/${_.split(' ')[0]}`)

    return v_out
}

function q_occupied(q: QContext) {
    let res = SquareSet.empty()
    for (let key of Object.keys(q)) {

        let qq = q[key].singleSquare()
        if (qq !== undefined) {
            res = res.with(qq)
        }
    }
    return res
}

function l_attack_lines(l: AttackPiece) {

    let res: AttackLine[] = []

    let {
        p1,
        attacks,
        blocked_attacks } = l

    if (attacks.length === 0 && blocked_attacks.length === 0) {
        res.push([p1])
    }

    for (let aa of attacks) {
        res.push([p1, aa])
    }

    for (let bb of blocked_attacks) {
        res.push([p1, bb[0], bb[1]])
    }
    return res
}

type LCC = 'ok' | QContext[] | 'fail'

function l_cc3(q: QContext, l: AttackLine, L: AttackLine[]): LCC {


    let l0 = l_cc(q, l, L)

    if (l0 !== 'ok') {
        return l0
    }



    let [p1, a1, a2] = l

    if (a1 === undefined || a2 === undefined) {
        return 'fail'
    }

    let p1p = parse_piece(p1)

    if (q[p1] === undefined || q[a1] === undefined) {
        return 'fail'
    }

    let p1ss = q[p1]
    let a1ss = q[a1]
    let a2ss = q[a2]

    let p1s = q[p1].singleSquare()!
    let a1s = q[a1].singleSquare()!
    let a2s = q[a2].singleSquare()
    let occupied = q_occupied(q)

    if (a2s !== undefined) {
        if (attacks(p1p, p1s, occupied.without(a1s)).has(a2s)) {
            return 'ok'
        } else {
            return 'fail'
        }
    } else {
        if (a2ss.isEmpty()) {
            return 'fail'
        }

        let new_a2ss = 
            attacks(p1p, p1s, occupied.without(a1s)).diff(
                attacks(p1p, p1s, occupied))
                .intersect(a2ss)


        if (a2ss.equals(new_a2ss)) {

            let res: QContext[] = []
            for (let a2s of a2ss) {

                let q2 = { ...q }
                q_place_piece(q2, a2, a2s)

                let a_lines = between(p1s, a2s).without(a1s)
                q_empty_lines(q2, a_lines)

                q_place_piece_exclude_bys(q2, a2, L)

                q_place_piece_exclude_orders(q2, a2)

                res.push(q2)

            }

            return res

        }

        let q2 = { ...q }
        q_place_set(q2, a2, new_a2ss)

        return [q2]
    }

}

function l_cc(q: QContext, l: AttackLine, L: AttackLine[]): LCC {

    let [p1, a1] = l

    if (a1 === undefined) {
        return 'fail'
    }

    let p1p = parse_piece(p1)

    if (q[p1] === undefined || q[a1] === undefined) {
        return 'fail'
    }

    let p1ss = q[p1]
    let a1ss = q[a1]

    let p1s = q[p1].singleSquare()
    let a1s = q[a1].singleSquare()
    let occupied = q_occupied(q)

    if (p1s !== undefined) {
        if (a1s !== undefined) {
            if (attacks(p1p, p1s, occupied).has(a1s)) {
                return 'ok'
            } else {
                return 'fail'
            }
        } else {

            if (a1ss.isEmpty()) {
                return 'fail'
            }

            let new_a1ss = attacks(p1p, p1s, occupied).intersect(a1ss)

            if (a1ss.equals(new_a1ss)) {

                let res: QContext[] = []
                for (let a1s of a1ss) {

                    let q2 = {...q}
                    q_place_piece(q2, a1, a1s)


                    let a_lines = between(p1s, a1s)
                    q_empty_lines(q2, a_lines)

                    q_place_piece_exclude_bys(q2, a1, L)

                    q_place_piece_exclude_orders(q2, a1)

                    res.push(q2)

                }

                return res

            }

            let q2 = {...q}
            q_place_set(q2, a1, new_a1ss)

            return [q2]
        }
    } else {


        let res: QContext[] = []
        for (let p1s of p1ss) {

            let a1ss2 = attacks(p1p, p1s, occupied).intersect(a1ss)

            if (a1ss2.isEmpty()) {
                continue
            }

            let q2 = { ... q}
            q_place_piece(q2, p1, p1s)
            q_place_set(q2, a1, a1ss2)


            q_place_piece_exclude_bys(q2, p1, L)

            q_place_piece_exclude_orders(q2, p1)

            res.push(q2)
        }

        if (res.length === 0) {
            return 'fail'
        }
        return res
    }
}

function q_empty_lines(q: QContext, lines: SquareSet) {
    for (let key of Object.keys(q)) {
        q[key] = q[key].diff(lines)
    }
}

function q_place_set(q: QContext, p1: Pieces, sqs: SquareSet) {
    q[p1] = sqs
}

function l_cc0(q: QContext, l: AttackLine, ls: AttackLine[]): LCC {

    let [p1] = l
     
    let p1p = parse_piece(p1)

    let p1s = q[p1].singleSquare()

    if (p1s === undefined) {
        return 'ok'
    }

    let occupied = q_occupied(q)

    let aa = attacks(p1p, p1s, occupied)

    let all = ls.filter(_ => _[0] === p1)

    for (let a1s of aa) {
        let a1p = q_find_sq(q, a1s)

        if (a1p) {
            if (!all.some(_ => _[1] === a1p)) {
                return 'fail'
            }
        }
    }

    return 'ok'
}

function q_find_sq(q: QContext, sq: Square) {
    for (let p of Object.keys(q)) {
        if (q[p].singleSquare() === sq) {
            return p
        }
    }
}

function q_place_piece(q: QContext, p1: Pieces, sq: Square) {
    let sqs = SquareSet.fromSquare(sq)

    q[p1] = sqs

    for (let key of Object.keys(q)) {
        if (key !== p1) {
            q[key] = q[key]!.without(sq)
        }
    }
}

function l_cc1(q: QContext, p1: Pieces, L: AttackLine[]): LCC {

    if (q[p1] === undefined) {
        return 'fail'
    }

    let p1s = q[p1].singleSquare()

    if (p1s !== undefined) {
        return 'ok'
    }

    let res: QContext[] = []
    for (let p1s of q[p1]) {
        let q2 = { ...q }
        q_place_piece(q2, p1, p1s)


        q_place_piece_exclude_bys(q2, p1, L)

        q_place_piece_exclude_orders(q2, p1)

        res.push(q2)
    }
    return res
}

function q_place_piece_exclude_orders(q: QContext, p1: Pieces) {
    let p = p1[0]
    let n = parseInt(p1[1] ?? '0')

    let pp = Object.keys(q).filter(_ => _ !== p1 && _[0] === p)

    let sq = q[p1].singleSquare()!

    let sq_file = squareFile(sq)
    let sq_rank = squareRank(sq)

    let rr = SquareSet.empty()

    /*
    for (let i = 0; i < sq; i++) {
        rr = rr.union(SquareSet.fromSquare(i))
    }
        */

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            if (i < sq_rank || (i === sq_rank &&  j >= sq_file)) {
                rr = rr.union(SquareSet.fromSquare(squareFromCoords(j, i)!))
            }

        }
    }
    rr = rr.without(sq)

    let rr2 = rr.complement().without(sq)

    for (let p2 of pp) {

        let n2 = parseInt(p2[1] ?? '0')

        if (n2 < n) {
            q[p2] = q[p2].intersect(rr2)
        } else {
            q[p2] = q[p2].intersect(rr)
        }
    }
}

function q_place_piece_exclude_bys(q: QContext, p1: Pieces, L: AttackLine[]) {

    let attacked_by = L.filter(_ =>
        _.length === 1 ? false : _.length === 2 ? _[1] === p1 : (_[1] === p1 || _[2] === p1)
    )

    let frees = Object.keys(q).filter(_ => _ !== p1 && !attacked_by.find(a => a[0] === _))

    let occupied = q_occupied(q)

    let p1s = q[p1].singleSquare()!

    let qq = attacks(parse_piece('q'), p1s, occupied)
    let bb = attacks(parse_piece('b'), p1s, occupied)
    let nn = attacks(parse_piece('n'), p1s, occupied)
    let rr = attacks(parse_piece('r'), p1s, occupied)

    let pp = attacks(parse_piece('p'), p1s, occupied)
    let PP = attacks(parse_piece('P'), p1s, occupied)

    for (let free of frees) {

        /*
        if (free[0] === 'p') {
            q[free] = q[free].diff(PP)
        }
        if (free[0] === 'P') {
            q[free] = q[free].diff(pp)
        }
            */

        if (free[0].toLowerCase() === 'q') {
            q[free] = q[free].diff(qq)
        }

        if (free[0].toLowerCase() === 'r') {
            q[free] = q[free].diff(rr)
        }

        if (free[0].toLowerCase() === 'n') {
            q[free] = q[free].diff(nn)
        }

        if (free[0].toLowerCase() === 'b') {
            q[free] = q[free].diff(bb)
        }
    }
}

function q_duplicate_check(q: QContext) {
    for (let p1 of Object.keys(q)) {
        for (let p2 of Object.keys(q)) {
            if (p1 !== p2) {
                if (q[p1].singleSquare() !== undefined) {
                    if (q[p1].equals(q[p2])) {
                        return true
                    }
                }
            }
        }
    }
    return false
}

const x_r = 59
const x_n2 = 19
const x_R2 = 3
const x_R = 0
function* l_solve(q: QContext, i: number, L: AttackLine[], i_cap = L.length): Generator<QContext> {
    if (i >= i_cap) {

        if (q_duplicate_check(q)) {
            return
        }

        yield q
        return
    }

    let ok: LCC = 'fail'
    let l = L[i]
    if (l.length === 1) {
        ok = l_cc1(q, l[0], L)
    } else if (l.length === 2) {
        ok = l_cc(q, l, L)
    } else {
        ok = l_cc3(q, l, L)
    }

    if (ok === 'fail') {
        return
    }

    if (ok === 'ok') {

        let ok2 = l_cc0(q, L[i], L)

        if (ok2 === 'fail') {
            return
        }

        yield * l_solve(q, i + 1, L)
    } else {
        for (const next of ok) {
            yield * l_solve(next, 0, L)
        }
    }
}


function l_expand_q(ll: AttackPiece[], q: QContext) {
    let lines = ll.flatMap(l_attack_lines)

    let occupied = q_occupied(q)

    let res: QContext[] = [q]

    for (let line of lines) {
        if (line.length === 2) {

            let [p1, p2] = line


            for (let sq of q[p1]) {

                let qq: QContext = {...q}

                let aa = attacks(parse_piece(p1), sq, occupied)

                qq[p1] = SquareSet.fromSquare(sq)
                qq[p2] = qq[p2].intersect(aa)
            }
        }
    }
}

function fen_to_qcontext(fen: FEN) {
    fen = fen.split(' ')[0]

    let res: QContext = {}
    let rank = 7
    for (let line of fen.split('/')) {
        let file = 0
        for (let ch of line) {
            if (is_pieces(ch)) {
            let p1 = parse_piece(ch)

            let sq = squareFromCoords(file, rank)
            if (sq !== undefined) {

                let chi = ch
                let i = 2
                while (res[chi] !== undefined) {
                    chi = ch + i
                    i++
                }
                res[chi] = SquareSet.fromSquare(sq)
            }
            file+= 1
            } else {
                file += parseInt(ch)
                continue
            }
        }
        rank -= 1
    }
    return res
}

function l_qcontext(l: AttackPiece[]) {
    let res: QContext = {}

    l.forEach(l => {
        res[l.p1] = SquareSet.full()

        if (l.p1[0] === 'p' || l.p1[0] === 'P') {
            res[l.p1] = SquareSet.full().diff(SquareSet.backranks())
        }
    })
    return res
}

export function mor_long(rules: string) {
    return rules.split('\n').map(parse_attack_piece)
}

function match_attacks(rule: string) {

    let res = rule.match(/^\+(\w*)$/)

    if (res) {
        if (res[1] === 'Z' || res[1] === 'z') {
            return undefined
        }
        return res[1]
    }

}

function match_attacked_by(rule: string) {

    let res = rule.match(/^(\w*)\+$/)

    if (res) {
        if (res[1] === 'Z' || res[1] === 'z') {
            return undefined
        }
        return res[1]
    }


}

function match_blocks(rule: string): [Pieces, Pieces] | undefined {

    let res = rule.match(/^(\w*)\+\|(\w*)$/)

    if (res) {
        return [res[1], res[2]]
    }


}
function match_blocked_attacks(rule: string): [Pieces, Pieces] | undefined {

    let res = rule.match(/^\+(\w*)\/(\w*)$/)

    if (res) {
        return [res[1], res[2]]
    }


}

function match_blocked_attacked_by(rule: string): [Pieces, Pieces] | undefined {

    let res = rule.match(/^(\w*)\+\/(\w*)$/)

    if (res) {
        return [res[1], res[2]]
    }


}

function parse_attack_piece(rule: string) {

    let [p1, ...res] = rule.split(' ')

    let attacks: Pieces[] = []
    let attacked_by: Pieces[] = []
    let blocks: [Pieces, Pieces][] = []
    let blocked_attacks: [Pieces, Pieces][] = []
    let blocked_attacked_by: [Pieces, Pieces][] = []

    res.forEach(rule => {
        let aa = match_attacks(rule)

        if (aa) {
            attacks.push(aa)
            return
        }
        let bb = match_attacked_by(rule)

        if (bb) {
            attacked_by.push(bb)
            return
        }

        let cc = match_blocks(rule)

        if (cc) {
            blocks.push(cc)
            return
        }


        let dd = match_blocked_attacks(rule)

        if (dd) {
            blocked_attacks.push(dd)
            return
        }

        let ee = match_blocked_attacked_by(rule)

        if (ee) {
            blocked_attacked_by.push(ee)
            return
        }
    })

    return {
        p1,
        attacks,
        attacked_by,
        blocks,
        blocked_attacks,
        blocked_attacked_by
    }
}

type SContext = Record<Pieces, Square>

export function mor_short(fen: FEN) {

    let cx =  fen_to_scontext(fen)

    return s_attack_pieces(cx)
}

export function print_a_piece(a: AttackPiece) {

    const attacks_str = (s: Pieces) => `+${s}`
    const attacked_by_str = (s: Pieces) => `${s}+`
    const blocks_str = (s: [Pieces, Pieces]) => `${s[0]}+|${s[1]}`
    const blocked_attacks_str = (s: [Pieces, Pieces]) => `+${s[0]}/${s[1]}`
    const blocked_attacked_by_str = (s: [Pieces, Pieces]) => `${s[0]}+/${s[1]}`

    let p1 = a.p1

    let zero_attacked_by_lower = !a.attacked_by.find(_ => _.toLowerCase() === _)
        && !a.blocked_attacked_by.find(_ => _[0].toLowerCase() === _[0])
        && !a.blocks.find(_ => _[0].toLowerCase() === _[0])
    let zero_attacked_by_upper = !a.attacked_by.find(_ => _.toLowerCase() !== _) 
        && !a.blocked_attacked_by.find(_ => _[0].toLowerCase() !== _[0])
        && !a.blocks.find(_ => _[0].toLowerCase() !== _[0])

    let attacks = a.attacks.map(attacks_str).join(' ')
    let attacked_by = a.attacked_by.map(attacked_by_str).join(' ')
    let blocks = a.blocks.map(blocks_str).join(' ')
    let blocked_attacks = a.blocked_attacks.map(blocked_attacks_str).join(' ')
    let blocked_attacked_by = a.blocked_attacked_by.map(blocked_attacked_by_str).join(' ')

    let res = [p1]

    if (zero_attacked_by_lower) {
        res.push('z+')
    }
    if (zero_attacked_by_upper) {
        res.push('Z+')
    }

    if (attacks !== '') {
        res.push(attacks)
    }

    if (attacked_by !== '') {
        res.push(attacked_by)
    }

    if (blocks !== '') {
        res.push(blocks)
    }

    if (blocked_attacks !== '') {
        res.push(blocked_attacks)
    }

    if (blocked_attacked_by !== '') {
        res.push(blocked_attacked_by)
    }

    return res.join(' ')
}

type AttackLine = [Pieces] | [Pieces, Pieces] | [Pieces, Pieces, Pieces]

type AttackPiece = {
    p1: Pieces
    attacks: Pieces[]
    attacked_by: Pieces[]
    blocks: [Pieces, Pieces][]
    blocked_attacks: [Pieces, Pieces][]
    blocked_attacked_by: [Pieces, Pieces][]
}

function s_attack_pieces(s: SContext) {
    let res: AttackPiece[] = []
    let lines = s_attacks(s)

    for (let p1 of Object.keys(s)) {
        let attacks = []
        let attacked_by = []
        let blocks: [Pieces, Pieces][] = []
        let blocked_attacks: [Pieces, Pieces][] = []
        let blocked_attacked_by: [Pieces, Pieces][] = []


        for (let line of lines) {
            if (line[1] === undefined) {

            } else if (line[0] === p1) {
                if (line.length === 2) {
                    attacks.push(line[1])
                } else {
                    blocked_attacks.push([line[1], line[2]!])
                }
            } else if (line[1] === p1) {
                if (line.length === 2) {
                    attacked_by.push(line[0])
                } else {
                    blocks.push([line[0], line[2]!])
                }
            } else if (line[2] === p1) {
                blocked_attacked_by.push([line[0], line[1]])
            }
        }
        res.push({
            p1,
            attacks,
            attacked_by,
            blocks,
            blocked_attacks,
            blocked_attacked_by
        })
    }

    return res
}

function s_attacks(s: SContext) {
    let res: AttackLine[] = []
    let occupied = s_occupied(s)

    for (let piece1 of Object.keys(s)) {
        let p1 = parse_piece(piece1)
        let sq = s[piece1]

        let attacks1 = attacks(p1, sq, occupied)
        for (let a1 of attacks1) {
            for (let piece2 of Object.keys(s)) {
                if (s[piece2] === a1) {
                    let sq2 = s[piece2]

                    let occupied2 = occupied.without(sq2)

                    let attacks2 = attacks(p1, sq, occupied2).diff(attacks1)

                    let i_piece
                    for (let a2 of attacks2) {
                        for (let piece3 of Object.keys(s)) {
                            if (s[piece3] === a2) {
                                let sq3 = s[piece3]
                                i_piece = piece3
                            }
                        }
                    }

                    if (i_piece !== undefined) {
                        res.push([piece1, piece2, i_piece])
                    } else {
                        res.push([piece1, piece2])
                    }
                }
            }
        }
    }

    return res
}

function s_occupied(s: SContext) {
    let res = SquareSet.empty()

    for (let key of Object.keys(s)) {
        res = res.set(s[key], true)
    }
    return res
}

function fen_to_scontext(fen: FEN) {
    fen = fen.split(' ')[0]

    let res: SContext = {}
    let rank = 7
    for (let line of fen.split('/')) {
        let file = 0
        for (let ch of line) {
            if (is_pieces(ch)) {
            let p1 = parse_piece(ch)

            let sq = squareFromCoords(file, rank)
            if (sq !== undefined) {

                let chi = ch
                let i = 2
                while (res[chi] !== undefined) {
                    chi = ch + i
                    i++
                }
                res[chi] = sq
            }
            file+= 1
            } else {
                file += parseInt(ch)
                continue
            }
        }
        rank -= 1
    }
    return res
}

const pieces_to_role: Record<string, Role> = {
    'r': 'rook',
    'n': 'knight',
    'b': 'bishop',
    'p': 'pawn',
    'q': 'queen',
    'k': 'king',
}

function is_pieces(pieces: string): pieces is Pieces {
    return pieces_to_role[pieces.toLowerCase()] !== undefined
}

export function parse_piece(pieces: Pieces): Piece {
    const color_pieces = (p: Pieces): Color => p.toLowerCase() === p ? 'black': 'white'

    let color = color_pieces(pieces)
    let role = pieces_to_role[pieces.toLowerCase()
        .replace(/[2345678]/, '')
    ]

    return {
        color,
        role
    }
}



let empty_board = Chess.fromSetupUnchecked(parseFen(EMPTY_FEN).unwrap())
export function q_fen_singles(q: QContext, turn: Color = 'white') {
    let res = empty_board.clone()
    res.turn = turn

    for (let p of Object.keys(q)) {
        let sq = q[p]?.first()
        if (sq !== undefined) {
            for (let k of Object.keys(q)) {
                q[k] = q[k]?.without(sq)
            }
            res.board.set(sq, parse_piece(p))
        }
    }

    return makeFen(res.toSetup())
}


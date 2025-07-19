import { attacks } from "./attacks"
import { Line, MoveAttackSentence, OPPONENT_PIECE_NAMES, parse_line_recur, parse_piece, parse_rules, Pieces, PLAYER_PIECE_NAMES, StillAttackSentence } from "./mor3_hope1"
import { extract_g_board, g_fen_singles, g_occupied, GBoard, gboard_exclude } from "./mor_gen2"
import { SquareSet } from "./squareSet"
import { Square } from "./types"

export function mor_gen6(text: string) {

    let root = parse_rules(text)
    parse_line_recur(root)

    let constraints = gen_cc(root)
    let board = extract_g_board(text)

    /*
    let res = solve({
        after: board,
    }, constraints, constraints)
    let res_out = res.map(_ => g_fen_singles(_.after))
    */

    let gg = { after: board }

    let res = solve_gen(gg, constraints, constraints)

    let res_out = [...res.take(100).map(_ => g_fen_singles(_.after))]
    res_out = res_out.map(_ => `https://lichess.org/editor/${_.split(' ')[0]}`)

    return res_out

}

const no_constraint: Constraint = (q: GGBoard) => 'ok'

type CRSkipReset =  { type: 'skip_reset', gg: GGBoard[] }
type CResult = GGBoard[] | 'ok' | 'fail' | CRSkipReset

type Constraint = (q: GGBoard) => CResult

function is_skip_reset(c: CResult): c is CRSkipReset {
    if (Array.isArray(c)) {
        return false
    }
    if (c === 'ok' || c === 'fail') {
        return false
    }
    return true
}

type CCNode = {
    cc: Constraint,
    children: CCNode[]
}

function gen_cc(line: Line): CCNode {


    if (line.sentence.precessor === '.') {
        return {
            cc: no_constraint,
            children: line.children.map(gen_cc),
        }
    }

    if (line.sentence.precessor === 'A') {

        let sentence = line.sentence

        return {
            cc: (q: GGBoard) => {

                let res = gen_cc_move_a()(q)

                if (Array.isArray(res)) {
                    return { type: 'skip_reset', gg: res }
                }
                return 'fail'

            },
            children: line.children.map(gen_cc)
        }
    }

    if (line.sentence.precessor === 'E') {

        if (line.sentence.type !== 'move_attack') {
            throw 'E has to be move attack'
        }

        let sentence = line.sentence
        let rr = gen_cc_move_attack(line.sentence)

        return {
            cc: (q: GGBoard) => {

                let res = gen_cc_move(sentence.move)(q)

                /*
                if (q.after['Q']?.singleSquare() === 34) {
                    if (q.after['K']?.singleSquare() === 27) {
                        console.log('yay')
                    }
                }
                    */

                if (res === 'ok' || is_skip_reset(res)) {
                    throw 'gen_cc_move should return a list not ok'
                }
                if (res === 'fail') {
                    return 'fail'
                } 

                let has_ok = false
                let res_out: GGBoard[] = []
                outer: for (let q of res) {
                    let rr_out = []
                    for (let r of rr) {
                        let res = r(q)
                        if (res === 'fail') {
                            continue outer
                        } else if (res === 'ok') {
                            continue
                        } else if (is_skip_reset(res)) {
                            continue
                        } else {
                            rr_out.push(...res)
                        }
                    }
                    if (rr_out.length === 0) {
                        has_ok = true
                        res_out.push(...res)
                    }
                    res_out.push(...rr_out)
                }
                if (res_out.length === 0) {
                    return has_ok ? 'ok' : 'fail'
                }
                // TODO might need to return a tuple
                if (has_ok) {
                    return { type: 'skip_reset', gg: res_out }
                }
                return res_out

            },
            children: line.children.map(gen_cc)
        }
    }

    if (line.sentence.type === 'g_still_attack') {
        let rr = line.sentence.attacks.flatMap(gen_cc_still_attack)
        return {
            cc: (q: GGBoard) => {
                for (let r of rr) {
                    let res = r(q)
                    if (res === 'fail') {
                        return 'fail'
                    } else if (res === 'ok') {
                        continue
                    } else {
                        return res
                    }
                }
                return 'ok'
            },
            children: line.children.map(gen_cc),
        }
    }

    // G R= 
    if (line.sentence.type === 'move_attack') {
        let rr = gen_cc_move_attack(line.sentence)[0]
        return {
            cc: (q: GGBoard) => {
                return rr(q)
            },
            children: line.children.map(gen_cc),
        }
    }



    throw 'No CCNode for Line'
}

function gen_cc_move_a(): Constraint {

    let opp = OPPONENT_PIECE_NAMES
    return (gg: GGBoard) => {

        let res: GGBoard[] = []
        for (let p1 of opp) {
            let rr = gen_cc_move(p1)(gg)
            if (rr === 'fail' || rr === 'ok' || is_skip_reset(rr)) {
                continue
            }
            res.push(...rr)
        }
        return res
    }
}

function gen_cc_move(piece: Pieces): Constraint {

    let p1 = parse_piece(piece)

    return (gg: GGBoard) => {

        let after = gg.after

        if (after[piece] === undefined) {
            return 'fail'
        }

        let occupied = g_occupied(after)

        let res: GGBoard[] = []
        for (let p1s of after[piece]) {

            let a1s = attacks(p1, p1s, occupied)


            let move: [Pieces, Square] = [piece, p1s]

            let gg2: GGBoard = {
                before: gg_deep_clone(gg),
                after: {...gg.after},
                move
            }

            gg_place_piece(gg2.before!, piece, p1s)

            let path = gg_move_path(gg2).join(' ')

            let record = gg_zero(gg2).record
            if (record && record[path]) {
                gg_place_set(gg2, piece, record[path])
            } else {
                gg_place_set(gg2, piece, a1s)
            }


            res.push(gg2)
        }

        return res
    }

}

function gen_cc_move_attack(sentence: MoveAttackSentence) {
    let res: Constraint[] = []

    let p1 = sentence.move

    res.push(vae_moves(p1))

    for (let a1 of sentence.attacked_by) {
        res.push(vae_attacks(a1, p1))
    }
    for (let a1 of sentence.attack) {
        res.push(vae_attacks(p1, a1))
    }
    for (let a1 of sentence.blocked) {
        res.push(vae_blocks(...a1))
    }



    return res
}

function vae_moves(p1: Pieces) {
    return (gg: GGBoard) => {
        if (gg.move === undefined) {
            return 'fail'
        }
        if (gg.move[0] !== p1) {
            return 'fail'
        }
        return 'ok'
    }
}


function gen_cc_still_attack(sentence: StillAttackSentence) {
    let res: Constraint[] = []

    let p1 = sentence.piece
    for (let a1 of sentence.attacked_by) {
        res.push(vae_attacks(a1, p1))
    }
    for (let a1 of sentence.attack) {
        res.push(vae_attacks(p1, a1))
    }
    for (let a1 of sentence.blocked) {
        res.push(vae_blocks(...a1))
    }

    if (sentence.zero_attack) {
        res.push(vae_zero_attack(p1, PLAYER_PIECE_NAMES))
    }

    if (sentence.zero_defend) {
        res.push(vae_zero_attack(p1, OPPONENT_PIECE_NAMES))
    }

    return res
}

function vae_zero_attack(p1: Pieces, pieces: Pieces[]): Constraint {

    return (gg: GGBoard) => {

        let q = gg.after

        let occupied = g_occupied(q)


        let p1ss = q[p1]
        if (p1ss === undefined) {
            return 'fail'
        }

        let p1s = p1ss.singleSquare()

        for (let a1 of pieces) {
            if (a1 === p1) {
                continue
            }

            let a1ss = q[a1]

            if (a1ss === undefined) {
                continue
            }
            let a1p = parse_piece(a1)
            let a1s = a1ss.singleSquare()

            if (p1s !== undefined) {

                if (a1s !== undefined) {
                    if (attacks(a1p, a1s, occupied).has(p1s)) {
                        return 'fail'
                    }
                } else {
                    let new_a1ss = SquareSet.empty()

                    for (let a1s of a1ss) {
                        if (!attacks(a1p, a1s, occupied).has(p1s)) {
                            new_a1ss = new_a1ss.set(a1s, true)
                        }
                    }

                    if (new_a1ss.isEmpty()) {
                        return 'fail'
                    }

                    if (new_a1ss.equals(a1ss)) {

                        let res: GGBoard[] = []
                        for (let a1s of new_a1ss) {

                            let gg2 = {
                                before: gg_deep_clone(gg),
                                after: { ...gg.after }
                            }

                            gg_place_piece(gg2, a1, a1s)

                            res.push(gg2)

                        }

                        return res
                    }


                    let gg2 = {
                        before: gg_deep_clone(gg),
                        after: { ...gg.after }
                    }

                    gg_place_set(gg2, a1, new_a1ss)

                    return [gg2]

                }
            } else {

                let res: GGBoard[] = []
                for (let p1s of p1ss) {

                    let gg2 = {
                        before: gg_deep_clone(gg),
                        after: { ...gg.after }
                    }

                    gg_place_piece(gg2, p1, p1s)

                    res.push(gg2)
                }

                if (res.length === 0) {
                    return 'fail'
                }
                return res
            }
    }

        return 'ok'
    }
}

function vae_blocks(p1: Pieces, a1: Pieces, t1: Pieces): Constraint {
    let p1p = parse_piece(p1)
    let t1p = parse_piece(t1)
    let a1p = parse_piece(a1)

    return (gg: GGBoard) => {

        let q = gg.after

        if (q[p1] === undefined || q[a1] === undefined || q[t1] === undefined) {
            return 'fail'
        }

        let p1ss = q[p1]
        let a1ss = q[a1]
        let t1ss = q[a1]

        let p1s = q[p1].singleSquare()
        let a1s = q[a1].singleSquare()
        let t1s = q[t1].singleSquare()
        let occupied = g_occupied(q)

        if (p1s !== undefined) {
            if (t1s !== undefined) {

                let a1sstt1 = attacks(p1p, p1s, occupied.without(t1s)).diff(attacks(p1p, p1s, occupied.with(t1s)))

                if (a1s !== undefined) {
                    if (a1sstt1.has(a1s)) {
                        return 'ok'
                    } else {
                        return 'fail'
                    }
                } else {

                    if (a1sstt1.isEmpty()) {
                        return 'fail'
                    }


                    let new_a1ss = a1sstt1.intersect(a1ss)

                    if (a1sstt1.equals(new_a1ss)) {

                        let res: GGBoard[] = []
                        for (let a1s of a1sstt1) {

                            let gg2 = {
                                before: gg_deep_clone(gg),
                                after: { ...gg.after }
                            }

                            gg_place_piece(gg2, a1, a1s)

                            res.push(gg2)

                        }

                        return res

                    }

                    let gg2 = {
                        before: gg_deep_clone(gg),
                        after: { ...gg.after }
                    }

                    gg_place_set(gg2, a1, new_a1ss)

                    return [gg2]
                }
            } else {

                let res: GGBoard[] = []
                for (let t1s of t1ss) {

                    let a1sstt1 = attacks(p1p, p1s, occupied.without(t1s)).diff(attacks(p1p, p1s, occupied.with(t1s)))
                    
                    a1sstt1 = a1sstt1.intersect(a1sstt1)

                    if (a1sstt1.isEmpty()) {
                        continue
                    }

                    let gg2 = {
                        before: gg_deep_clone(gg),
                        after: { ...gg.after }
                    }

                    gg_place_piece(gg2, t1, t1s)
                    gg_place_set(gg2, a1, a1sstt1)

                    res.push(gg2)
                }

                if (res.length === 0) {
                    return 'fail'
                }
                return res
            }
        } else {

            if (t1s !== undefined) {

                let res: GGBoard[] = []
                for (let p1s of p1ss) {

                    let a1sstt1 = attacks(p1p, p1s, occupied.without(t1s)).diff(attacks(p1p, p1s, occupied.with(t1s)))
                    
                    a1sstt1 = a1sstt1.intersect(a1sstt1)

                    if (a1sstt1.isEmpty()) {
                        continue
                    }

                    let gg2 = {
                        before: gg_deep_clone(gg),
                        after: { ...gg.after }
                    }

                    gg_place_piece(gg2, p1, p1s)
                    gg_place_set(gg2, a1, a1sstt1)

                    res.push(gg2)
                }

                if (res.length === 0) {
                    return 'fail'
                }
                return res
            } else {

                let res: GGBoard[] = []
                for (let p1s of p1ss)
                    for (let t1s of t1ss) {

                        let a1sstt1 = attacks(p1p, p1s, occupied.without(t1s)).diff(attacks(p1p, p1s, occupied.with(t1s)))

                        a1sstt1 = a1sstt1.intersect(a1sstt1)

                        if (a1sstt1.isEmpty()) {
                            continue
                        }

                        let gg2 = {
                            before: gg_deep_clone(gg),
                            after: { ...gg.after }
                        }

                        gg_place_piece(gg2, p1, p1s)
                        gg_place_piece(gg2, t1, t1s)
                        gg_place_set(gg2, a1, a1sstt1)

                        res.push(gg2)
                    }

                if (res.length === 0) {
                    return 'fail'
                }
                return res
            }


        }


    }

}

function vae_attacks(p1: Pieces, a1: Pieces): Constraint {

    let p1p = parse_piece(p1)
    let a1p = parse_piece(a1)

    return (gg: GGBoard) => {

        let q = gg.after

        if (q[p1] === undefined || q[a1] === undefined) {
            return 'fail'
        }

        let p1ss = q[p1]
        let a1ss = q[a1]

        let p1s = q[p1].singleSquare()
        let a1s = q[a1].singleSquare()
        let occupied = g_occupied(q)

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

                    let res: GGBoard[] = []
                    for (let a1s of a1ss) {

                        let gg2 = {
                            before: gg_deep_clone(gg),
                            after: {...gg.after}
                        }

                        gg_place_piece(gg2, a1, a1s)

                        res.push(gg2)

                    }

                    return res

                }

                let gg2 = {
                    before: gg_deep_clone(gg),
                    after: {...gg.after}
                }

                gg_place_set(gg2, a1, new_a1ss)

                return [gg2]
            }
        } else {


            let res: GGBoard[] = []
            for (let p1s of p1ss) {

                let a1ss2 = attacks(p1p, p1s, occupied).intersect(a1ss)

                if (a1ss2.isEmpty()) {
                    continue
                }

                let gg2 = {
                    before: gg_deep_clone(gg),
                    after: {...gg.after}
                }

                gg_place_piece(gg2, p1, p1s)
                gg_place_set(gg2, a1, a1ss2)

                res.push(gg2)
            }

            if (res.length === 0) {
                return 'fail'
            }
            return res
        }
    }
}

type GPath = string // Pieces[].join(' ')

type GMoveRecord = Record<GPath, SquareSet>

type GGBoard = {
    record?: GMoveRecord
    before?: GGBoard
    after: GBoard
    move?: [Pieces, Square]
}

function gg_move_path(g: GGBoard) {
    let res = []

    while (g.before !== undefined) {
        if (g.move) {
            res.unshift(g.move[0])
        }
        g = g.before
    }
    return res
}

function gg_zero(g: GGBoard) {
    while (g.before !== undefined) {
        g = g.before
    }

    return g
}


function gg_set_record(g: GGBoard, record: GMoveRecord) {
    gg_zero(g).record = record
}

function gg_place_set(g: GGBoard, p1: Pieces, sqs: SquareSet) {
    while (true) {
        g.after[p1] = sqs
        if (g.move) {
            if (g.move[0] === p1) {
                let record = { ...gg_zero(g).record }
                let path = gg_move_path(g)

                record[path.join(' ')] = sqs

                gg_set_record(g, record)


                break
            }
        }
        if (g.before === undefined) {
            break
        }
        g = g.before
    }
}

function gg_place_piece(g: GGBoard, p1: Pieces, sq: Square) {
    let sqs = SquareSet.fromSquare(sq)

    while (true) {
        g.after[p1] = sqs

        for (let key of Object.keys(g.after)) {
            if (key !== p1) {
                g.after[key] = g.after[key]!.without(sq)
            }
        }

        if (g.move) {
            if (g.move[0] === p1) {

                let record = { ...gg_zero(g).record }
                let path = gg_move_path(g)

                record[path.join(' ')] = sqs

                gg_set_record(g, record)

                break
            }
        }
        if (g.before === undefined) {
            break
        }
        g = g.before
    }
}


function* solve_gen(gg: GGBoard, ic: CCNode, rootC: CCNode): Generator<GGBoard> {
    let ok = ic.cc(gg)
    if (ok === 'fail') {
        return
    } else if (ok === 'ok') {
        if (ic.children.length === 0) {
            yield gg
        } else {
            for (const child of ic.children) {
                yield * solve_gen(gg, child, rootC)
            }
        }
    } else if (is_skip_reset(ok)) {
        if (ic.children.length === 0) {
            yield* ok.gg
        }
        for (const next of ok.gg) {
            for (const child of ic.children) {
                yield* solve_gen(next, child, rootC)
            }
        }
    } else {
        for (const next of ok) {
            yield * solve_gen(gg_zero(next), rootC, rootC)
        }
    }
}



/*
function solve(gg: GGBoard, ic: CCNode, rootC: CCNode): GGBoard[] {
    let res: GGBoard[] = []

    let ok = ic.cc(gg)
    if (ok === 'fail') {
        return []
    } else if (ok === 'ok') {
        if (ic.children.length === 0) {
            return [gg]
        }
        return ic.children.flatMap(ic => solve(gg, ic, rootC))
    } else {
        return ok.flatMap(ok => solve(gg_zero(ok), rootC, rootC))
    }

    return res
}
    */

function gg_deep_clone(gg: GGBoard): GGBoard {
    return {
        record: gg.record ? { ... gg.record } : undefined,
        after: { ...gg.after },
        move: gg.move,
        before: gg.before ? gg_deep_clone(gg.before) : undefined,
    }
}

function gg_equals(ok: GGBoard, cok: GGBoard) {
    if (ok.before === undefined) {
        if (cok.before !== undefined) {
            return false
        }
    } else {
        if (cok.before === undefined) {
            return false
        } else if (!gg_equals(ok.before, cok.before))
            return false
        }
    return g_equals(ok.after, cok.after) && ok.move === cok.move
}

function g_equals(a: GBoard, b: GBoard) {
    for (let key of Object.keys(a)) {
        if (a[key] !== b[key]) {
            return false
        }
    }
    for (let key of Object.keys(b)) {
        if (a[key] !== b[key]) {
            return false
        }
    }
    return true
}

function g_exclude_single_square(g: GBoard, p: Pieces, capture = false) {
    let sq = g[p]!.singleSquare()!

    for (let key of Object.keys(g)) {
        if (key !== p) {
            g[key] = g[key]?.without(sq)
            if (capture) {
                if (g[key]?.isEmpty()) {
                    delete g[key]
                }
            }
        }
    }
}
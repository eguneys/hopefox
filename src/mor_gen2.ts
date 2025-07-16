import { setUncaughtExceptionCaptureCallback } from "process";
import { attacks, between, queenAttacks } from "./attacks";
import { Board } from "./board";
import { Chess } from "./chess";
import { squareSet } from "./debug";
import { EMPTY_FEN, makeFen, parseFen } from "./fen";
import { c_to_piece, MoveC, piece_to_c, PieceC, W_PIECES } from "./hopefox_c";
import { extract_pieces, FEN, Line, MoveAttackSentence, OPPONENT_PIECE_NAMES, parse_line_recur, parse_piece, parse_rules, ParsedSentence, PIECE_NAMES, Pieces, PLAYER_PIECE_NAMES, StillAttackSentence } from "./mor3_hope1";
import { m } from './mor3_hope1'
import { SquareSet } from "./squareSet";
import { Color, Move, Piece, Square } from "./types";
import { mor_nogen, mor_nogen_find_san } from "./mor_nogen1";
import { arr_shuffle, rnd_int } from "./random";

export function mor_gen2(text: string, fen?: FEN) {

    let root = parse_rules(text)
    parse_line_recur(root)


    let res = gen_node(root)

    let gboard = extract_g_board(text)


    let gen_root = {
        data: {
            path: [],
            move: undefined,
            before: gboard,
            after: gboard
        }
    }

    gen_node_expand(res, [gen_root])

    let bb = gen_node_collapse_board(res)

    //bb = arr_shuffle(bb)
    bb = bb.slice(0, 100)
    bb = bb.flatMap(gboard_collapse_many)
    //bb = arr_shuffle(bb)
    bb = bb.slice(0, 10000)

    let res_out = bb.map(_ => g_fen_singles(_))

    console.log(res_out.slice(0, 10))
    console.log('is ok', res_out.includes("8/5k2/4q3/8/8/8/r7/Q1KB4 w - - 0 1"))
    console.log('nogenfindsan', mor_nogen_find_san(text, "8/5k2/4q3/8/8/8/r7/Q1KB4 w - - 0 1"))

    let [a, b, c] = [0, 0, 0]
    a = res_out.length
    res_out = res_out.filter(valid_fen)
    b = res_out.length
    res_out = res_out.filter(_ => mor_nogen_find_san(text, _))
    c = res_out.length

    console.log(a, b, c)

    return res_out
}

function node_leaves(res: GenNode): GenNode[] {
    if (res.children.length === 0) {
        return [res]
    }
    return res.children.flatMap(node_leaves)
}

function gen_node_collapse_board(res: GenNode) {
    function step(res: GenExpansionNode[]) {
        return res.map(gen_node_collapse_board2)
    }

    let cc = node_leaves(res).flatMap(_ => step(_.res))

    return cc
}

function gen_node_collapse_board2(res: GenExpansionNode) {

    let ress: GenExpansionNode[] = [res]
    let e = res.parent
    while (e !== undefined) {
        ress.push(e)
        e = e.parent
    }

    return ress.reduce((a, b) => gboard_compose_move(a, b.data.after, b.data.move), ress[0].data.before)
}

function gen_node(root: Line): GenNode {
    let sentence = root.sentence
    let children = root.children.map(gen_node)

    return {
        sentence,
        children,
        res: [],
        children_resolved: false,
        line: root
    }
}


type GenNode = {
    sentence: ParsedSentence
    children: GenNode[]
    res: GenExpansionNode[]
    children_resolved: boolean
    line: Line
}

type GenExpansionNode = {
    parent?: GenExpansionNode
    data: GenExpansion
}

type GenExpansion = {
    before: GBoard
    after: GBoard
    path: FromMove[]
    move?: FromMove
}

type FromMove = {
    from: Square
    piece: Pieces
}

type GConstraint = (pex: GenExpansion) => GenExpansion[]

export type GenSquareSet = SquareSet | undefined
export type GBoard = Record<Pieces, GenSquareSet>


export function extract_g_board(text: string) {
    let pieces = extract_pieces(text)

    let res: GBoard = {}
    
    for (let key of PIECE_NAMES) {
        if (pieces.includes(key)) {
            res[key] = SquareSet.full()
        } else {
            //res[key] = undefined
        }
    }

    return res
}



function gen_node_expand(node: GenNode, pp_parent: GenExpansionNode[]): GenExpansionNode[] {

    let res: GenExpansionNode[] = []

    let cc = resolve_cc(node.sentence)

    for (let p_parent of pp_parent) {

        let eqq = ge_expand_precessor(node.sentence, p_parent)

        eqq = eqq.flatMap(cc)
        for (let eq of eqq)
            res.push({
                parent: p_parent,
                data: eq
            })
    }

    if (res.length === 0) {
        node.children_resolved = false
        node.res = []
        return node.res
    }

    //res = arr_shuffle(res)
    console.log(node.sentence.type, res.length)
    /*
    if (res.length > 30000) {
        res = res.slice(0, 1000)
    } else if (res.length > 20000) {
        res = res.slice(0, 5000)
    } else if (res.length > 5000) {
        res = res.slice(0, 8000)
    }
        */
    res = res.slice(0, 50000)

    let lqq = res
    let mls: Map<string, GenExpansionNode[]> = new Map()

    for (let lq of lqq) {
        let m = lq.data.path.join(' ')
        if (!mls.has(m)) {
            mls.set(m, [])
        }
        mls.get(m)!.push(lq)
    }

    if (node.sentence.precessor === 'E' || node.sentence.precessor === '.' || node.sentence.precessor === 'G') {

        for (let [ms, lqq] of mls) {

            let aqq = lqq
            let yes_qq = []
            let no_qq = []
            for (let c of node.children) {

                let resolved = c.children_resolved
                let res = c.res
                c.res = []

                let eqq = gen_node_expand(c, lqq)

                if (c.children_resolved) {
                    for (let p of lqq) {
                        if (eqq.find(_ => _ === p || _.parent === p)) {
                            yes_qq.push(p)
                        } else {
                            no_qq.push(p)
                        }
                    }
                    lqq = no_qq
                }

                c.res = c.res.concat(res)
                //c.res.push(...res)

                if (resolved) {
                    c.children_resolved = true
                }


            }

            if (node.children.length === 0) {
                //node.res.push(...res)
                node.res = node.res.concat(res)
                node.children_resolved = true
                break
            }

            if (yes_qq.length > 0) {
                //node.res.push(...yes_qq)
                node.res = node.res.concat(yes_qq)
                node.children_resolved = true
                //break
            }
        }

    } else if (node.sentence.precessor === 'A') {

        node.res = []
        let coverage_done = []
        for (let [ms, lqq] of mls) {
            let aqq = lqq
            for (let c of node.children) {

                let resolved = c.children_resolved
                let res = c.res
                c.res = []

                let eqq = gen_node_expand(c, lqq)

                if (c.children_resolved) {
                    lqq = lqq.filter(p => !eqq.find(_ => _ === p || _.parent === p))
                }

                //c.res.push(...res)
                c.res = c.res.concat(res)
                if (resolved) {
                    c.children_resolved = true
                }


            }

            if (node.children.length > 0 && lqq.length !== 0) {
            } else {
                coverage_done.push(aqq)
            }
        }



        if (coverage_done.length > 0) {
            node.res = coverage_done.flat()
            node.children_resolved = true
        }
    } else {
        node.children_resolved = true
    }

    return node.res
}


function ge_expand_precessor(sentence: ParsedSentence, p: GenExpansionNode): GenExpansion[] {
    if (['E', 'A', '*'].includes(sentence.precessor)) {
        let path = p.data.path.slice(0)
        if (p.data.move !== undefined) {
            path.push(p.data.move)
        }

        let ee: [FromMove, GBoard][]
        if (sentence.precessor === 'E') {
             ee = ge_legal_moves_for_pieces(p.data.after, PLAYER_PIECE_NAMES)
        } else {
            ee = ge_legal_moves_for_pieces(p.data.after, OPPONENT_PIECE_NAMES)
        }

        return ee.map(([move, after]) => ({
            path,
            move,
            before: p.data.after,
            after
        }))

    } else {
        return [p.data]
    }
}

function ge_legal_moves_for_pieces(board: GBoard, pieces: Pieces[]) {

    let res: [FromMove, GBoard][] = []
    for (let p of pieces) {
        let p1 = piece_to_c(parse_piece(p))
        if (board[p] !== undefined) {

            for (let sq of board[p]) {

                let tos = m.attacks(p1, sq, SquareSet.empty())

                let after = {...board}
                after[p] = tos
                res.push([{ from: sq, piece: p }, after])
            }
        }
    }

    return res
}

function ge_make_move(board: GBoard, move: Move) {
    for (let p of Object.keys(board)) {
        if (board[p] === undefined) {
            continue
        }
        let sq = board[p].singleSquare()
        if (sq === undefined) {
            if (board[p].has(move.from)) {
                board[p] = board[p].with(move.to)
            }
            board[p] = board[p].without(move.from)
        } else if (sq === move.to) {
            board[p] = undefined
        } else if (sq === move.from) {
            board[p] = SquareSet.fromSquare(move.to)
        }
    }
    return board
}


const pcc_no_constraint = (exp: GenExpansion) => [exp]

function resolve_cc(sentence: ParsedSentence): GConstraint {

    if (sentence.type === 'move_attack') {
        return pcc_move_attack(sentence)
    } else if (sentence.type === 'still_attack') {
        return pcc_still_attack(sentence)
    } else if (sentence.type === 'g_still_attack') {
        let aa = sentence.attacks.map(_ => pcc_still_attack(_))
        return (exp: GenExpansion) => {
            return gexp_compose_maps(aa.map(_ => _(exp)))
        }
    }
    return pcc_no_constraint
}

function gexp_compose_maps(aas: GenExpansion[][]) {
    let res = []

    while (true) {
        let aa1 = aas.pop()
        let aa2 = aas.pop()

        if (!aa1) {
            break
        } else if (!aa2) {
            res.push(...aa1)
        } else {
            res.push(...gexp_compose(aa1, aa2))
        }
    }
    return res
}

function gexp_compose(a: GenExpansion[], b: GenExpansion[]) {
    let res: GenExpansion[] = []

    for (let a1 of a) {
        for (let b1 of b) {

            let c1 = gexp_compose2(a1, b1)
            if (c1) {
                res.push(c1)
            }
        }
    }

    return res
}

function gexp_compose2(a: GenExpansion, b: GenExpansion): GenExpansion | undefined {

    let res: GBoard = {}
    for (let key of Object.keys(a.after)) {
        let aa = a.after[key]
        let bb = b.after[key]

        if (aa === undefined || bb === undefined) {
            continue
        }

        let cc = aa.intersect(bb)

        if (cc.isEmpty()) {
            return undefined
        }

        res[key] = cc

    }

    return {
        before: a.before,
        after: res,
        path: a.path
    }
}

function gboard_compose2(a: GBoard, b: GBoard) {

    let res: GBoard = {}
    for (let key of Object.keys(a)) {
        if (a[key] !== undefined && b[key] !== undefined) {

                res[key] = a[key].intersect(b[key])
        } else if (a[key] !== undefined) {
            res[key] = a[key]
        } else if (b[key] !== undefined) {
            res[key] = b[key]
        }
    }

    return res
}

function gboard_compose_move(a: GBoard, b: GBoard, move?: FromMove) {

    let res: GBoard = {}
    for (let key of Object.keys(b)) {

        if (move && key === move.piece) {
            res[key] = SquareSet.fromSquare(move.from)
            //res[key] = b[key]
        } else if (a[key] !== undefined && b[key] !== undefined) {
            res[key] = a[key].intersect(b[key])
        //} else if (a[key] !== undefined) {
            //res[key] = a[key]
        } else if (b[key] !== undefined) {
            res[key] = b[key]
        }
    }


    // capture
    if (move) {
        for (let key of Object.keys(a)) {
            if (b[key] === undefined && a[key] !== undefined) {
                res[key] = a[key]
            }
        }
    }

    return res
}

function place_piece(ax: GBoard, p1: Pieces, p1s: Square) {
    for (let key of Object.keys(ax)) {
        ax[key] = ax[key]?.without(p1s)
        if (ax[key]?.isEmpty()) {
            if (key !== p1) {
                delete ax[key]
            }
        }
    }

    ax[p1] = SquareSet.fromSquare(p1s)
    return true
}

function g_occupied(ax: GBoard) {
    let res = SquareSet.empty()
    
    for (let key of Object.keys(ax)) {
        let sq = ax[key]?.singleSquare()
        if (sq !== undefined) {
            res = res.set(sq, true)
        }
    }
    return res
}


function pcc_move_attack(res: MoveAttackSentence) {

    let piece = parse_piece(res.move)
    let attacks1 = res.attack.map(parse_piece)
    let blocked = res.blocked.map(([a, b, c]) => [parse_piece(a), parse_piece(b), parse_piece(c)])
    let unblocked = res.unblocked.map(([a, b]) => [parse_piece(a), parse_piece(b)])

    let attacked_by = res.attacked_by.map(parse_piece)

    let undefended_by = res.undefended_by.map(parse_piece)

    let zero_defend = res.zero_defend
    let zero_attack = res.zero_attack

    let is_mate = res.is_mate

    let p1 = piece_to_c(parse_piece(res.move))

    return (gexp: GenExpansion) => {

        if (gexp.move === undefined) {
            return []
        }

        let p1ss = gexp.after[res.move]

        const move = gexp.move

        if (p1ss === undefined) {
            return []
        }

        if (gexp.move.piece !== res.move) {
            return []
        }

        if (!gexp.before[res.move]?.has(gexp.move.from)) {
            return []
        }

        let rexx: GenExpansion[] = []


        let abx = { ...gexp.after }

        place_piece(abx, res.move, move.from)


        outer: for (let p1s of p1ss) {



            let before = gexp.before
            let ax = { ...abx }

            let occupied = g_occupied(ax)

            place_piece(ax, res.move, p1s)


            for (let i = 0; i < res.attacked_by.length; i++) {
                let a1 = piece_to_c(parse_piece(res.attacked_by[i]))
                let a1ss = ax[res.attacked_by[i]]
                if (a1ss === undefined) {
                    continue outer
                }

                let new_a1s = SquareSet.empty()

                for (let a1s of a1ss) {
                    if (attacks_c(a1, a1s, occupied).has(p1s)) {
                        new_a1s = new_a1s.set(a1s, true)
                    }
                }

                if (new_a1s.isEmpty()) {
                    continue outer
                }

                ax[res.attacked_by[i]] = new_a1s
            }


            for (let i = 0; i < res.attack.length; i++) {
                let a1p = res.attack[i]
                let a1 = piece_to_c(parse_piece(res.attack[i]))
                let a1ss = ax[res.attack[i]]

                if (a1ss === undefined) {
                    continue outer
                }

                let a1ss_s = a1ss.singleSquare()
                if (a1ss_s !== undefined) {

                    if (attacks_c(p1, p1s, occupied).has(a1ss_s)) {
                        if (!(move.from === a1ss_s)) {
                            continue
                        }
                    }

                    continue outer
                }

                let new_a1s = SquareSet.empty()
                for (let a1s of a1ss) {
                    if (attacks_c(p1, p1s, occupied).has(a1s)) {
                        if (!occupied.has(a1s)) {
                            if (!(move.from === a1s)) {
                                new_a1s = new_a1s.set(a1s, true)
                            }
                        }
                    }
                }

                if (new_a1s.isEmpty()) {
                    continue outer
                }

                ax[res.attack[i]] = new_a1s
            }

            if (res.zero_defend) {
                for (let d1 of get_Lower(ax)) {

                    let d1c = piece_to_c(parse_piece(d1))

                    if (ax[d1] === undefined) {
                        continue
                    }

                    let new_d1s = SquareSet.empty()
                    for (let d1s of ax[d1]) {
                        if (!attacks_c(d1c, d1s, occupied).has(p1s)) {
                            new_d1s = new_d1s.set(d1s, true)
                        }
                    }

                    if (new_d1s.isEmpty()) {
                        continue outer
                    }


                    ax[d1] = new_d1s
                }
            }

            if (res.zero_attack) {

                for (let a1 of get_Upper(ax)) {

                    let a1c = piece_to_c(parse_piece(a1))

                    if (ax[a1] === undefined) {
                        continue
                    }

                    let new_a1s = SquareSet.empty()
                    for (let a1s of ax[a1]) {
                        if (!attacks_c(a1c, a1s, occupied).has(p1s)) {
                            new_a1s = new_a1s.set(a1s, true)
                        }
                    }

                    if (new_a1s.isEmpty()) {
                        continue outer
                    }


                    ax[a1] = new_a1s
                }
            }

            rexx.push({
                before,
                after: ax,
                path: gexp.path,
                move: gexp.move
            })
        }


        for (let i = 0; i < res.blocked.length; i++) {
            let rexx2 = rexx
            rexx = []
            outer: for (let gexp of rexx2) {

                let before = gexp.before
                let ax = { ...gexp.after }



                let pu1 = piece_to_c(blocked[i][0])
                let [u1, u2, u3] = res.blocked[i]

                let u1ss = ax[u1]
                let u2ss = ax[u2]
                let u3ss = ax[u3]

                if (u1ss === undefined || u2ss === undefined || u3ss === undefined) {
                    continue outer
                }


                for (let u1s of u1ss) {

                    let ax1 = { ...ax }
                    if (!place_piece(ax1, u1, u1s)) {
                        continue
                    }

                    for (let u2s of u2ss) {
                        let ax2 = { ...ax1 }
                        if (!place_piece(ax2, u2, u2s)) {
                            continue
                        }

                        let new_u3s = SquareSet.empty()

                        for (let u3s of u3ss) {

                            let ax3 = { ...ax2 }
                            if (!place_piece(ax3, u3, u3s)) {
                                continue
                            }

                            let occupied = SquareSet.empty()
                            occupied = occupied.set(u1s, true)
                            occupied = occupied.set(u2s, true)
                            occupied = occupied.set(u3s, true)

                            if (attacks_c(pu1, u1s, occupied.without(u3s)).has(u2s) &&
                                !attacks_c(pu1, u1s, occupied).has(u2s)) {

                                new_u3s = new_u3s.set(u3s, true)

                            }
                        }

                        if (new_u3s.isEmpty()) {
                            continue outer
                        }

                        let u3s_s = new_u3s.singleSquare()

                        if (u3s_s !== undefined) {
                            place_piece(ax2, u3, u3s_s)
                        } else {
                            ax2[u3] = new_u3s
                        }


                        rexx.push({
                            before,
                            after: ax2,
                            path: gexp.path,
                            move: move
                        })
                    }
                }
            }
        }




        for (let i = 0; i < res.unblocked.length; i++) {

            let [u3, u2] = res.unblocked[i]
            let u3p = unblocked[i][0]
            let u2p = unblocked[i][1]

            let rexx2 = rexx
            rexx = []
            outer: for (let gexp of rexx2) {

                let before = gexp.before
                let ax = { ...gexp.after }
                let occupied = g_occupied(ax)

                let u3ss = ax[u3]
                let u2ss = ax[u2]

                if (u2ss === undefined || u3ss === undefined) {
                    continue outer
                }

                for (let u2s of u2ss) {

                    let ax2 = { ...ax }
                    if (!place_piece(ax2, u2, u2s)) {
                        continue
                    }

                    let new_u3s = SquareSet.empty()

                    for (let u3s of u3ss) {

                        let ax3 = { ...ax2 }
                        if (!place_piece(ax3, u3, u3s)) {
                            continue
                        }

                        if (attacks(u3p, u3s, occupied).has(u2s) &&
                            between(u3s, u2s).has(move.from)) {
                            new_u3s = new_u3s.set(u3s, true)
                        }
                    }
                    if (new_u3s.isEmpty()) {
                        continue outer
                    }

                    ax2[u3] = new_u3s

                    rexx.push({
                        before,
                        after: ax2,
                        path: gexp.path,
                        move: move
                    })
                }
            }
        }



        return rexx
    }
}


function pcc_still_attack(res: StillAttackSentence) {

    let piece = parse_piece(res.piece)
    let attacks1 = res.attack.map(parse_piece)
    let blocked = res.blocked.map(([a, b, c]) => [parse_piece(a), parse_piece(b), parse_piece(c)])
    let unblocked = res.unblocked.map(([a, b]) => [parse_piece(a), parse_piece(b)])

    let attacked_by = res.attacked_by.map(parse_piece)

    let double_blocked = res.double_blocked.map(([a, b, c]) => [parse_piece(a), parse_piece(b), parse_piece(c)])

    let undefended_by = res.undefended_by.map(parse_piece)

    let zero_defend = res.zero_defend
    let zero_attack = res.zero_attack

    let is_mate = res.is_mate

    let p1 = piece_to_c(parse_piece(res.piece))

    return (gexp: GenExpansion) => {

        let p1ss = gexp.after[res.piece]


        if (p1ss === undefined) {
            return []
        }

        let rexx: GenExpansion[] = []

        outer: for (let p1s of p1ss) {

            let before = gexp.before
            let ax = {...gexp.after}

            let occupied = g_occupied(ax)

            for (let key of Object.keys(ax)) {
                ax[key] = ax[key]?.without(p1s)
                if (ax[key]?.isEmpty()) {
                    if (key !== res.piece) {
                        continue outer
                    }
                }
            }

            ax[res.piece] = SquareSet.fromSquare(p1s)


            for (let i = 0; i < res.attacked_by.length; i++) {
                let a1 = piece_to_c(parse_piece(res.attacked_by[i]))
                let a1ss = ax[res.attacked_by[i]]
                if (a1ss === undefined) {
                    continue outer
                }

                let new_a1s = SquareSet.empty()

                for (let a1s of a1ss) {
                    if (attacks_c(a1, a1s, occupied).has(p1s)) {
                        new_a1s = new_a1s.set(a1s, true)
                    }
                }

                if (new_a1s.isEmpty()) {
                    continue outer
                }

                ax[res.attacked_by[i]] = new_a1s
            }



            for (let i = 0; i < res.attack.length; i++) {
                let a1 = piece_to_c(parse_piece(res.attack[i]))
                let a1ss = ax[res.attack[i]]
                if (a1ss === undefined) {
                    continue outer
                }

                let new_a1s = SquareSet.empty()
                for (let a1s of a1ss) {
                    if (attacks_c(p1, p1s, occupied).has(a1s)) {
                        if (!occupied.has(a1s)) {
                            new_a1s = new_a1s.set(a1s, true)
                        }
                    }
                }

                if (new_a1s.isEmpty()) {
                    continue outer
                }


                ax[res.attack[i]] = new_a1s
            }


            if (res.zero_defend) {
                for (let d1 of get_Upper(ax)) {

                    let d1c = piece_to_c(parse_piece(d1))

                    if (ax[d1] === undefined) {
                        continue
                    }

                    let new_d1s = SquareSet.empty()
                    for (let d1s of ax[d1]) {
                        if (!attacks_c(d1c, d1s, occupied).has(p1s)) {
                            new_d1s = new_d1s.set(d1s, true)
                        }
                    }

                    if (new_d1s.isEmpty()) {
                        continue outer
                    }


                    ax[d1] = new_d1s
                }
            }

            if (res.zero_attack) {
                for (let a1 of get_Lower(ax)) {

                    let a1c = piece_to_c(parse_piece(a1))

                    if (ax[a1] === undefined) {
                        continue
                    }

                    let new_a1s = SquareSet.empty()
                    for (let a1s of ax[a1]) {
                        if (!attacks_c(p1, p1s, occupied).has(a1s)) {
                            new_a1s = new_a1s.set(a1s, true)
                        }
                    }

                    if (new_a1s.isEmpty()) {
                        continue outer
                    }


                    ax[a1] = new_a1s
                }
            }

            rexx.push({
                before,
                after: ax,
                path: gexp.path
            })
        }


            for (let i = 0; i < res.blocked.length; i++) {
                let rexx2 = rexx
                rexx = []
                outer: for (let gexp of rexx2) {

                    let before = gexp.before
                    let ax = { ...gexp.after }



                    let pu1 = piece_to_c(blocked[i][0])
                    let [u1, u2, u3] = res.blocked[i]

                    let u1ss = ax[u1]
                    let u2ss = ax[u2]
                    let u3ss = ax[u3]

                    if (u1ss === undefined || u2ss === undefined || u3ss === undefined) {
                        continue outer
                    }


                    for (let u1s of u1ss) {

                        let ax1 = { ...ax }
                        if (!place_piece(ax1, u1, u1s)) {
                            continue
                        }

                        for (let u2s of u2ss) {
                            let ax2 = { ...ax1 }
                            if (!place_piece(ax2, u2, u2s)) {
                                continue
                            }

                            let new_u3s = SquareSet.empty()

                            for (let u3s of u3ss) {

                                let ax3 = { ...ax2 }
                                if (!place_piece(ax3, u3, u3s)) {
                                    continue
                                }

                                let occupied = SquareSet.empty()
                                occupied = occupied.set(u1s, true)
                                occupied = occupied.set(u2s, true)
                                occupied = occupied.set(u3s, true)

                                if (attacks_c(pu1, u1s, occupied.without(u3s)).has(u2s) &&
                                    !attacks_c(pu1, u1s, occupied).has(u2s)) {

                                        new_u3s = new_u3s.set(u3s, true)

                                }
                            }

                            if (new_u3s.isEmpty()) {
                                continue outer
                            }

                            ax2[u3] = new_u3s


                            rexx.push({
                                before,
                                after: ax2,
                                path: gexp.path
                            })
                        }
                    }
                }
    }



        return rexx
    }
}

function attacks_c(pc: PieceC, s: Square, occupied: SquareSet) {
    //return m.attacks(pc, s, occupied)
    return attacks(c_to_piece(pc), s, occupied)
}


let empty_board = Chess.fromSetupUnchecked(parseFen(EMPTY_FEN).unwrap())
export function g_fen_singles(q: GBoard, turn: Color = 'white') {
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

export function gboard_collapse_many(q: GBoard): GBoard[] {
    const queue: GBoard[] = [q]
    const res: GBoard[] = []

    outer: while (queue.length && res.length < 30000) {

        const board = queue.shift()!

        const piece = arr_shuffle(Object.keys(board)).find(
            (p) => board[p] !== undefined && board[p].singleSquare() === undefined
        );

        if (!piece) {
            res.push(board);
            continue;
        }




        let limit = 64
        let iq = { ...board}
        let p = piece
        while (true) {
            if (--limit === 0) {
                break
            }
            let aq = { ...iq }
            let br = g_pull1(aq, p, rnd_int(0, aq[p]!.size() - 1))

            if (!br) {
                break
            }
            if (queue.length > 100000) {
                console.log(queue.length, 'noope')
                break
            }

            queue.push(aq)

            gboard_exclude(iq, p, aq[p]!.singleSquare()!)

            for (let p of Object.keys(iq)) {
                if (iq[p]?.isEmpty()) {
                    continue outer
                }
            }



        }


    }

    //console.log(res.length)
    return res
}

/*
function gboard_collapse_many(q: GBoard): GBoard[] {
    function deep(res: GBoard[]): GBoard[] {
        if (res.length > 80) {
            return res
        }
        let aa: GBoard[] = []
        for (let q of res) {
            for (let p of Object.keys(q)) {
                let iq = { ...q }

                let limit = 2
                while (iq[p] !== undefined && iq[p].singleSquare() === undefined) {

                    if (limit-- === 0) {
                        break
                    }

                    let aq = { ...iq }
                    g_pull1(aq, p, rnd_int(0, aq[p]!.size() - 1))

                    aa.push(aq)

                    gboard_exclude(iq, p, aq[p]!.singleSquare()!)
                }
            }
        }
        return deep(aa)
    }

    return deep([q])
}
    */

export function gboard_exclude(q: GBoard, p: Pieces, sq: Square) {
    q[p] = q[p]?.without(sq)
}


export function g_pull1(q: GBoard, p1: Pieces, skip: number = 0) {
    if (q[p1] === undefined) {
        return false
    }
    for (let i = 0; i < skip; i++) {
        q[p1] = q[p1].withoutFirst()
    }

    let f = q[p1].first()
    if (f === undefined) {
        return false
    }
    q[p1] = SquareSet.fromSquare(f)

    return true
}




function get_Upper(ax: GBoard) {
    return Object.keys(ax).filter(_ => _[0].toLowerCase() !== _[0])
}
function get_Lower(ax: GBoard) {
    return Object.keys(ax).filter(_ => _[0].toLowerCase() === _[0])
}


function valid_fen(fen: string) {
    return parseFen(fen).chain(_ => Chess.fromSetup(_)).isOk
}
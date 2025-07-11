import { Board } from "./board";
import { Chess } from "./chess";
import { EMPTY_FEN, makeFen, parseFen } from "./fen";
import { MoveC, piece_to_c, PieceC, W_PIECES } from "./hopefox_c";
import { extract_pieces, FEN, Line, MoveAttackSentence, OPPONENT_PIECE_NAMES, parse_line_recur, parse_piece, parse_rules, ParsedSentence, PIECE_NAMES, Pieces, PLAYER_PIECE_NAMES, StillAttackSentence } from "./mor3_hope1";
import { m } from './mor3_hope1'
import { SquareSet } from "./squareSet";
import { Color, Move, Piece, Square } from "./types";

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

    let res_out = bb.map(_ => g_fen_singles(_))

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
        ress.unshift(e)
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

type FromMove = Square

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

                c.res.push(...res)
                if (resolved) {
                    c.children_resolved = true
                }


            }

            if (node.children.length === 0) {
                node.res.push(...res)
                node.children_resolved = true
                break
            }

            if (yes_qq.length > 0) {
                node.res.push(...yes_qq)
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

                c.res.push(...res)
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
                res.push([sq, after])
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
    for (let key of Object.keys(a)) {

        if (move && a[key]?.singleSquare() === move) {
            res[key] = SquareSet.fromSquare(move)
        } else if (a[key] !== undefined && b[key] !== undefined) {
            res[key] = a[key].intersect(b[key])
        } else if (a[key] !== undefined) {
            res[key] = a[key]
        //} else if (b[key] !== undefined) {
            //res[key] = b[key]
        }
    }

    return res
}

function place_piece(ax: GBoard, p1: Pieces, p1s: Square) {
    for (let key of Object.keys(ax)) {
        ax[key] = ax[key]?.without(p1s)
        if (ax[key]?.isEmpty()) {
            if (key !== p1) {
                return false
            }
        }
    }

    ax[p1] = SquareSet.fromSquare(p1s)
    return true


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

        let p1ss = gexp.before[res.move]


        if (p1ss === undefined) {
            return []
        }

        if (!p1ss.has(gexp.move)) {
            return []
        }

        let p1s = gexp.move


        let rexx: GenExpansion[] = []

        let before = gexp.before
        let ax = { ...gexp.after }

        place_piece(ax, res.move, p1s)

        for (let i = 0; i < res.attacked_by.length; i++) {
            let a1 = piece_to_c(parse_piece(res.attacked_by[i]))
            let a1ss = ax[res.attacked_by[i]]
            if (a1ss === undefined) {
                return []
            }

            let new_a1s = SquareSet.empty()

            for (let a1s of a1ss) {
                if (attacks(a1, a1s).has(p1s)) {
                    new_a1s = new_a1s.set(a1s, true)
                }
            }

            if (new_a1s.isEmpty()) {
                return []
            }

            ax[res.attacked_by[i]] = new_a1s
        }



        for (let i = 0; i < res.attack.length; i++) {
            let a1 = piece_to_c(parse_piece(res.attack[i]))
            let a1ss = ax[res.attack[i]]
            if (a1ss === undefined) {
                return []
            }

            let new_a1s = SquareSet.empty()
            for (let a1s of a1ss) {
                if (attacks(p1, p1s).has(a1s)) {
                    new_a1s = new_a1s.set(a1s, true)
                }
            }

            if (new_a1s.isEmpty()) {
                return []
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
                    if (!attacks(d1c, d1s).has(p1s)) {
                        new_d1s = new_d1s.set(d1s, true)
                    }
                }

                if (new_d1s.isEmpty()) {
                    return []
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
                    if (!attacks(p1, p1s).has(a1s)) {
                        new_a1s = new_a1s.set(a1s, true)
                    }
                }

                if (new_a1s.isEmpty()) {
                    return []
                }


                ax[a1] = new_a1s
            }
        }

        rexx.push({
            before,
            after: ax,
            path: gexp.path
        })

        for (let i = 0; i < res.blocked.length; i++) {
            let rexx2 = rexx
            rexx = []
            for (let gexp of rexx2) {

                let before = gexp.before
                let ax = { ...gexp.after }



                let pu1 = piece_to_c(blocked[i][0])
                let [u1, u2, u3] = res.blocked[i]

                let u1ss = ax[u1]
                let u2ss = ax[u2]
                let u3ss = ax[u3]

                if (u1ss === undefined || u2ss === undefined || u3ss === undefined) {
                    return []
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


                        for (let u3s of u3ss) {

                            let ax3 = { ...ax2 }
                            if (!place_piece(ax3, u3, u3s)) {
                                continue
                            }

                            let occupied = SquareSet.empty()
                            occupied = occupied.set(u1s, true)
                            occupied = occupied.set(u2s, true)
                            occupied = occupied.set(u3s, true)

                            if (attacks(pu1, u1s, occupied.without(u3s)).has(u2s) &&
                                !attacks(pu1, u1s, occupied).has(u2s)) {

                                rexx.push({
                                    before,
                                    after: ax3,
                                    path: gexp.path
                                })
                            }
                        }
                    }
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
                    if (attacks(a1, a1s).has(p1s)) {
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
                    if (attacks(p1, p1s).has(a1s)) {
                        new_a1s = new_a1s.set(a1s, true)
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
                        if (!attacks(d1c, d1s).has(p1s)) {
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
                        if (!attacks(p1, p1s).has(a1s)) {
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
                for (let gexp of rexx2) {

                    let before = gexp.before
                    let ax = { ...gexp.after }



                    let pu1 = piece_to_c(blocked[i][0])
                    let [u1, u2, u3] = res.blocked[i]

                    let u1ss = ax[u1]
                    let u2ss = ax[u2]
                    let u3ss = ax[u3]

                    if (u1ss === undefined || u2ss === undefined || u3ss === undefined) {
                        return []
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


                            for (let u3s of u3ss) {

                                let ax3 = { ...ax2 }
                                if (!place_piece(ax3, u3, u3s)) {
                                    continue
                                }

                                let occupied = SquareSet.empty()
                                occupied = occupied.set(u1s, true)
                                occupied = occupied.set(u2s, true)
                                occupied = occupied.set(u3s, true)

                                if (attacks(pu1, u1s, occupied.without(u3s)).has(u2s) &&
                                    !attacks(pu1, u1s, occupied).has(u2s)) {

                                    rexx.push({
                                        before,
                                        after: ax3,
                                        path: gexp.path
                                    })

                                    continue
                                }

                                return []
                            }
                        }
                    }
                }
    }





        return rexx
    }
}

function attacks(pc: PieceC, s: Square, occupied = SquareSet.empty()) {
    return m.attacks(pc, s, occupied)
}


function g_fen_singles(q: GBoard, turn: Color = 'white') {
    let res = Chess.fromSetupUnchecked(parseFen(EMPTY_FEN).unwrap())
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



function get_Upper(ax: GBoard) {
    return Object.keys(ax).filter(_ => _[0].toLowerCase() !== _[0])
}
function get_Lower(ax: GBoard) {
    return Object.keys(ax).filter(_ => _[0].toLowerCase() === _[0])
}


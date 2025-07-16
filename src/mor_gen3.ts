import { validateHeaderName } from "http"
import { attacks } from "./attacks"
import { Line, MoveAttackSentence, parse_line_recur, parse_piece, parse_rules, ParsedSentence, Pieces, StillAttackSentence } from "./mor3_hope1"
import { extract_g_board, g_fen_singles, g_pull1, GBoard, gboard_exclude } from "./mor_gen2"
import { SquareSet } from "./squareSet"
import { Square } from "./types"

export function mor_gen3(text: string) {

    let root = parse_rules(text)
    parse_line_recur(root)

    let res = gen_cc(root)
    //console.log(res)

    let b = extract_g_board(text)
    let gg = res

    let rr = g_collapse2(b, gg)

    rr = rr.slice(0, 10)

    let res_out = rr.map(_ => g_fen_singles(_))


    return res_out
}

type CCaptures = {
    type: 'captures',
    piece: Pieces
    captures: Pieces
}

type CMoves = {
    type: 'moves'
    piece: Pieces
}

type CAttackThrough = {
    type: 'attack_through',
    piece: Pieces
    attacks: Pieces
    through: Pieces
}

type CAttacks = {
    type: 'attacks'
    piece: Pieces
    attacks: Pieces
}

type CZeroAttack = {
    type: 'zero_attack'
    piece: Pieces
    is_lower: boolean
}

type CConstraints = CAttacks | CAttackThrough | CZeroAttack
| CMoves | CCaptures


type GGBoard = {
    piece: Pieces
    gg: GBoard[]
    is_move?: boolean
}

type GGBoardNode = {
    boards: GGBoard[],
    children: GGBoardNode[]
}


function gen_cc(root: Line): GGBoardNode {

    let res: GGBoard[] = []
    let children: GGBoardNode[] = []

    if (root.sentence.precessor === 'E') {
        if (root.sentence.type === 'move_attack') {
            let cc = make_e_move(root.sentence)
            res.push(cc)
        }
    }

    if (root.sentence.type === 'g_still_attack') {
        for (let attack of root.sentence.attacks) {
            let cc = resolve_still_attack(attack)
            let gg = cc.map(make_a_gg)
            res = res.concat(gg)
        }
    }

    if (root.sentence.type === 'move_attack') {
        let cc = resolve_move_attack(root.sentence)
        let gg = cc.map(make_a_gg)
        res = res.concat(gg)
    }

    children = root.children.flatMap(gen_cc)

    return {
        boards: res,
        children
    }
}

function resolve_move_e(e: ParsedSentence): CConstraints | undefined {
    if (e.type === 'move_attack') {
        if (e.captured) {
            return {
                type: 'captures',
                piece: e.move,
                captures: e.captured
            }
        } else {
            return {
                type: 'moves',
                piece: e.move
            }
        }
    }
}

function resolve_move_attack(e: MoveAttackSentence): CConstraints[] {

    let res: CConstraints[] = []


    if (e.attack) {
        for (let a of e.attack) {
            res.push({
                type: 'attacks',
                piece: e.move,
                attacks: a
            })
        }
    }



    return res
}

function resolve_still_attack(e: StillAttackSentence): CConstraints[] {

    let res: CConstraints[] = []

    if (e.attack) {
        for (let a of e.attack) {
            res.push({
                type: 'attacks',
                piece: e.piece,
                attacks: a
            })
        }
    }


    if (e.attacked_by) {
        for (let a of e.attacked_by) {
            res.push({
                type: 'attacks',
                attacks: e.piece,
                piece: a
            })
        }
    }

    return res
}


function make_e_move(c: MoveAttackSentence) {

    let res: GBoard[] = []
    let piece = c.move
    let p1 = parse_piece(piece)

    for (let sq of SQ_FULL) {
        let a1s = attacks(p1, sq, SquareSet.empty())
        res[sq] = {
            [piece]: a1s
        }
    }

    return {
        piece,
        gg: res,
        is_move: true
    }
}

function make_a_gg(a: CConstraints): GGBoard {
    let piece = a.piece

    if (a.type === 'attacks') {
        return ggc_board(a)
    } else if (a.type === 'attack_through') {
        return {
            piece,
            gg: []
        }
    } else if (a.type === 'zero_attack') {
        return {
            piece,
            gg: []
        }
    }

    throw 'Bad Constraints'
}

const SQ_FULL = SquareSet.full()

function ggc_board(a: CAttacks) {

    let p1 = parse_piece(a.piece)
    let res: GBoard[] = []
    for (let sq of SQ_FULL) {
        let a1s = attacks(p1, sq, SquareSet.empty())
        res[sq] = {
            [a.attacks]: a1s
        }
    }
    return {
        piece: a.piece,
        gg: res
    }
}

function ggc_moves(a: CMoves) {
    let p1 = parse_piece(a.piece)
    let res: GBoard[] = []
    for (let sq of SQ_FULL) {
        let a1s = attacks(p1, sq, SquareSet.empty())
        res[sq] = {
            [a.piece]: a1s
        }
    }
    return {
        piece: a.piece,
        gg: res
    }

}

function ggc_captures(a: CCaptures) {
    let p1 = parse_piece(a.piece)
    let res: GBoard[] = []
    for (let sq of SQ_FULL) {
        let a1s = attacks(p1, sq, SquareSet.empty())
        res[sq] = {
            [a.piece]: a1s
        }
    }
    return {
        piece: a.piece,
        gg: res
    }
}


function g_collapse2(q: GBoard, gg: GGBoardNode) {
    const queue: GBoard[] = [q]
    const res: GBoard[] = []

    outer: while (queue.length && res.length < 30000) {

        const board = queue.shift()!

        const piece = Object.keys(board).find(
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
            let br = g_pull1(aq, p, 0)

            if (!br) {
                break
            }
            if (queue.length > 100000) {
                console.log(queue.length, 'noope')
                break
            }

            for (let p of Object.keys(aq)) {
                let ss = aq[p]?.singleSquare()
                if (ss !== undefined && Object.keys(aq).find(_ => _ !== p && aq[_]?.singleSquare() ===  ss)) {
                    continue outer
                }
            }



            gboard_exclude(iq, p, aq[p]!.singleSquare()!)

            if (!g_validate(aq, gg)) {
                continue
            }

            queue.push(aq)

            for (let p of Object.keys(iq)) {
                if (iq[p]?.isEmpty()) {
                    continue outer
                }
            }
        }


    }

    return res
}

function g_validate(aq: GBoard, cc: GGBoardNode) {

    let iq = {...aq}
    for (let p1 of Object.keys(iq)) {

        let p1s = aq[p1]?.singleSquare()
        if (p1s !== undefined) {

            for (let c of cc.boards) {
                if (c.piece === p1) {
                    if (c.is_move) {
                        g_reduce_move(iq, c.gg[p1s], p1)
                    } else {
                        let rok = g_reduce(iq, c.gg[p1s])

                        if (!rok || g_board_invalid(iq)) {
                            return false
                        }
                    }
                }
            }

            for (let c of cc.children) {
                if (!g_validate(iq, c)) {
                    return false
                }
            }
        }

    }


    return true
}

function g_reduce_move(a: GBoard, b: GBoard, piece: Pieces) {
    a[piece] = b[piece]
}

function g_reduce(a: GBoard, b: GBoard) {
    for (let key of Object.keys(b)) {
        if (b[key] === undefined) {
            continue
        }
        if (a[key] === undefined) {
            return false
        }
        a[key] = a[key]?.intersect(b[key])
    }
    return true
}

function g_board_invalid(g: GBoard) {
    for (let key of Object.keys(g)) {
        if (g[key]?.isEmpty()) {
            return true
        }
    }
    return false
}
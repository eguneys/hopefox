import { validateHeaderName } from "http"
import { attacks, between } from "./attacks"
import { Line, MoveAttackSentence, OPPONENT_PIECE_NAMES, parse_line_recur, parse_piece, parse_rules, ParsedSentence, Pieces, PLAYER_PIECE_NAMES, StillAttackSentence } from "./mor3_hope1"
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
    type: 'gg'
    piece: Pieces
    gg: GBoard[]
    is_move?: boolean
}

type GGGBoard = {
    type: 'ggg'
    piece1: Pieces
    piece2: Pieces
    ggg: GBoard[][]
}

type GXBoard = GGBoard | GGGBoard

type GGBoardNode = {
    boards: GXBoard[],
    children: GGBoardNode[]
}


function gen_cc(root: Line): GGBoardNode {

    let res: GXBoard[] = []
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


    if (e.blocked) {
        for (let b of e.blocked) {
            res.push({
                type: 'attack_through',
                piece: b[0],
                attacks: b[1],
                through: b[2]
            })
        }
    }

    if (e.unblocked) {
        for (let b of e.unblocked) {
            /*
            res.push({
                type: 'attack_through',
                piece: b[0],
                attacks: b[1],
            })
                */
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

    if (e.blocked) {
        for (let b of e.blocked) {
            res.push({
                type: 'attack_through',
                piece: b[0],
                attacks: b[1],
                through: b[2]
            })
        }
    }

    if (e.zero_attack) {
        res.push({
            type: 'zero_attack',
            piece: e.piece,
            is_lower: true
        })
    }

    if (e.zero_defend) {
        res.push({
            type: 'zero_attack',
            piece: e.piece,
            is_lower: false
        })
    }



    return res
}


function make_e_move(c: MoveAttackSentence): GGBoard {

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
        type: 'gg',
        piece,
        gg: res,
        is_move: true
    }
}

function make_a_gg(a: CConstraints): GXBoard {
    let piece = a.piece

    if (a.type === 'attacks') {
        return ggc_attacks(a)
    } else if (a.type === 'attack_through') {
        return ggc_attacks_through(a)
    } else if (a.type === 'zero_attack') {
        return ggc_zero_attack(a)
    }

    throw 'Bad Constraints'
}

const SQ_FULL = SquareSet.full()

function ggc_attacks_through(a: CAttackThrough): GGGBoard {
    let p1 = parse_piece(a.piece)
    let res: GBoard[][] = []
    for (let sq of SQ_FULL) {
        let a1s = attacks(p1, sq, SquareSet.empty())

        let rr: GBoard[] = []

        for (let sq2 of a1s) {
            rr[sq2] = {
                [a.through]: between(sq, sq2)
            }
        }

        res.push(rr)
    }
    return {
        type: 'ggg',
        piece1: a.piece,
        piece2: a.attacks,
        ggg: res
    }
}

function ggc_attacks(a: CAttacks): GGBoard {

    let p1 = parse_piece(a.piece)
    let res: GBoard[] = []
    for (let sq of SQ_FULL) {
        let a1s = attacks(p1, sq, SquareSet.empty())
        res[sq] = {
            [a.attacks]: a1s
        }
    }
    return {
        type: 'gg',
        piece: a.piece,
        gg: res
    }
}

function ggc_zero_attack(a: CZeroAttack): GGBoard {
    let p1 = parse_piece(a.piece)
    let res: GBoard[] = []
    for (let sq of SQ_FULL) {
        res[sq] = { }
        let pieces = a.is_lower ? PLAYER_PIECE_NAMES : OPPONENT_PIECE_NAMES
        for (let a1 of pieces) {
            let a1_piece = parse_piece(a1)
            res[sq][a1] = SquareSet.empty()

            for (let a1s of SQ_FULL) {
                let a2s = attacks(a1_piece, a1s, SquareSet.empty())
                if (!a2s.has(sq)) {
                    res[sq][a1] = res[sq][a1]!.set(a1s, true)
                }
            }
        }
    }

    return {
        type: 'gg',
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

    outer: while (queue.length && res.length < 1000) {

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

            let vvq = g_validate(aq, gg)

            if (vvq.length > 0) {
                queue.push(...vvq)
            }

            for (let p of Object.keys(iq)) {
                if (iq[p]?.isEmpty()) {
                    continue outer
                }
            }
        }


    }

    return res
}


function g_validate2(aq: GBoard, cc: GGBoardNode): GBoard[] {
    let res: GBoard[] = []




    return res
}

function g_validate(aq: GBoard, cc: GGBoardNode): GBoard[] {

    let res: GBoard[] = [{...aq}]
    for (let c of cc.boards) {
        let res2 = res
        res = []
        for (let iq of res2) {
            if (c.type === 'gg') {
                let iqp = iq[c.piece]
                if (iqp === undefined) {
                    return []
                }

                for (let p1s of iqp) {
                    let iiq = { ...iq }
                    if (c.is_move) {
                        g_reduce_move(iiq, c.gg[p1s], c.piece)
                    } else {
                        iiq[c.piece] = SquareSet.fromSquare(p1s)
                        let rok = g_reduce(iiq, c.gg[p1s])

                        if (!rok || g_board_invalid(iiq)) {
                            continue
                        }
                    }
                    res.push(iiq)
                }
            } else if (c.type === 'ggg') {
                let iqp = iq[c.piece1]
                let iqp2 = iq[c.piece2]

                if (iqp === undefined || iqp2 === undefined) {
                    return []
                }

                for (let p1s of iqp) {
                    let iiq = { ...iq }
                    let gg = c.ggg[p1s]

                    iiq[c.piece1] = SquareSet.fromSquare(p1s)
                    for (let p2s of iqp2) {

                        let iiq2 = { ...iiq }
                        if (gg[p2s] === undefined) {
                            continue
                        }

                        if (p1s === 18 && p2s === 4) {
                            console.log('yay')
                        }
                        iiq2[c.piece2] = SquareSet.fromSquare(p2s)
                        let rok = g_reduce(iiq2, gg[p2s])

                        if (!rok || g_board_invalid(iiq2)) {
                            continue
                        }
                        res.push(iiq2)
                        //break
                    }

                }

            }
        }
    }

    for (let c of cc.children) {
        res = res.flatMap(iq => g_validate(iq, c))
    }

    return res
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
            continue
            //return false
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
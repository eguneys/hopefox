import { validateHeaderName } from "http"
import { attacks } from "./attacks"
import { Line, parse_line_recur, parse_piece, parse_rules, ParsedSentence, Pieces, StillAttackSentence } from "./mor3_hope1"
import { extract_g_board, g_fen_singles, g_pull1, GBoard, gboard_exclude } from "./mor_gen2"
import { SquareSet } from "./squareSet"
import { Square } from "./types"

export function mor_gen3(text: string) {

    let root = parse_rules(text)
    parse_line_recur(root)

    let res = gen_cc(root)


    let b = extract_g_board(text)
    let gg = res.flatMap(ggc_all)
    let rr = g_collapse(b, gg)

    rr = rr.slice(0, 10)

    let res_out = rr.map(_ => g_fen_singles(_))


    return res_out
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


function gen_cc(root: Line): CConstraints[] {

    let res: CConstraints[] = []

    if (root.sentence.precessor === '.') {
        return root.children.flatMap(gen_cc)
    }

    if (root.sentence.type === 'g_still_attack') {
        for (let attack of root.sentence.attacks) {
            res = res.concat(resolve_still_attack(attack))
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

function ggc_all(a: CConstraints) {
    if (a.type === 'attacks') {
        return ggc_board(a)
    }
    return []
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

type GGBoard = {
    piece: Pieces,
    gg: GBoard[]
}


function g_collapse(q: GBoard, gg: GGBoard[]) {
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

            gboard_exclude(iq, p, aq[p]!.singleSquare()!)

            for (let p of Object.keys(iq)) {
                if (iq[p]?.isEmpty()) {
                    continue outer
                }
            }

            if (!g_validate(aq, gg)) {
                continue
            }

            queue.push(aq)

        }


    }

    return res
}

function g_validate(aq: GBoard, cc: GGBoard[]) {

    let iq = {...aq}
    for (let p1 of Object.keys(iq)) {

        let p1s = aq[p1]?.singleSquare()
        if (p1s !== undefined) {

            for (let c of cc) {
                if (c.piece === p1) {
                    let rok = g_reduce(iq, c.gg[p1s])

                    if (!rok || g_board_invalid(iq)) {
                        return false
                    }
                }
            }
        }

    }


    return true
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
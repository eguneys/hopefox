import { fork } from "child_process"
import { extract_pieces, Line, parse_line_recur, parse_piece, parse_rules, ParsedSentence, Pieces } from "./mor3_hope1"
import { GBoard } from "./mor_gen2"
import { Color, Piece, Square } from "./types"
import { SquareSet } from "./squareSet"
import { attacks } from "./attacks"
import { Chess } from "./chess"
import { EMPTY_FEN, makeFen, parseFen } from "./fen"
import { nextTick } from "process"

export function mor_gen4(text: string) {

    let root = parse_rules(text)
    parse_line_recur(root)

    add_constraint(root.children[0].sentence)

    let pieces = extract_pieces(text)

    let board = new Map<Pieces, SquareSet>()
    for (let p of pieces) {
        board.set(p, SquareSet.full())
    }

    let res = [...Iterator.from(collapse(board)).take(100)]

    let res_out = res.map(_ => m_fen_singles(_))

    return res_out

}

let empty_board = Chess.fromSetupUnchecked(parseFen(EMPTY_FEN).unwrap())
function m_fen_singles(m: MBoard, turn: Color = 'white'): string {
    let res = empty_board.clone()
    res.turn = turn

    for (let [p, qp] of m.entries()) {
        let sq = qp?.first()
        if (sq !== undefined) {
            for (let k of m.keys()) {
                m.set(k, m.get(k)!.without(sq))
            }
            res.board.set(sq, parse_piece(p))
        }
    }

    return makeFen(res.toSetup())
}

function add_constraint(sentence: ParsedSentence) {
    if (sentence.type === 'g_still_attack') {
        for (let attack of sentence.attacks) {
            add_constraint(attack)
        }
    }

    if (sentence.type === 'still_attack') {
        let p1 = sentence.piece
        for (let a1 of sentence.attacked_by) {
            constraints.push(vae_attacks(a1, p1))
        }
    }
}

type MBoard = Map<Pieces, SquareSet | undefined>

type Constraint = {
    involved: Pieces[]
    validateAndExpand: (placement: MBoard, onFork: (p: [Pieces, Square][][]) => boolean) => boolean
}

type Placement = [Pieces, Square]
type QueueItem = Placement[]

function attempt(base: MBoard, todo: Placement[], constraints: Constraint[]): MBoard | null {

    const placement = new Map(base)
    const queue = [...todo]

    while (queue.length > 0) {
        const [p, s] = queue.pop()!

        if (placement.has(p)) {
            if (!placement.get(p)!.has(s)) return null
        }

        placement.set(p, SquareSet.fromSquare(s))

        for (const constraint of constraints) {
            if (!constraint.involved.includes(p)) continue

            const ok = constraint.validateAndExpand(placement, (_) => {
                // dont allow forking during an attempt
                return true
            })

            if (!ok) { return null }
        }
    }

    return placement
}


function * collapse(base: MBoard = new Map()): Generator<MBoard> {
    const queue: [Pieces, Square][][] = []

    for (const constraint of constraints) {
        constraint.validateAndExpand(base, (options: QueueItem[]) => {
            queue.push(...options);
            return true;
        });
    }


    function * recurse(placement: MBoard, queue: [Pieces, Square][][]): Generator<MBoard> {
        const current = new Map(placement)

        while (queue.length > 0) {
            const nextPlacements = queue.pop()!

            let nextBoard = new Map(current)

            let yesBoard = attempt(nextBoard, nextPlacements, constraints)

            if (yesBoard === null) {
                continue
            }
            nextBoard = yesBoard

            for (const constraint of constraints) {
                if (!nextPlacements.find(_ => constraint.involved.includes(_[0]))) continue

                let forks: [Pieces, Square][][] = []

                const ok = constraint.validateAndExpand(nextBoard, (options) => {
                    //forks = options
                    forks.push(...options)
                    return true
                })

                if (!ok) return

                yield * recurse(nextBoard, [...queue, ...forks])
            }
        }

        yield current
    }

    yield* recurse(base, queue)
}


const constraints: Constraint[] = []


const vae_attacks = (p1: Pieces, a1: Pieces): Constraint =>
({
    involved: [p1, a1],
    validateAndExpand: (placement: MBoard, onFork: (p: [Pieces, Square][][]) => boolean): boolean => {
        let p1ss = placement.get(p1)
        let a1ss = placement.get(a1)

        if (!p1ss || !a1ss) return false

        if (p1ss.singleSquare() && a1ss.singleSquare()) {
            return true
        }

        const options: [Pieces, Square][][] = []

        let p1p = parse_piece(p1)
        let occupied = SquareSet.empty()

        for (let p1s of p1ss) {
            for (let a1s of attacks(p1p, p1s, occupied).intersect(a1ss)) {
                options.push([[p1, p1s], [a1, a1s]])
            }
        }

        if (options.length === 0) return false

        return onFork(options)
    }
})
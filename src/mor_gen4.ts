import { fork } from "child_process"
import { extract_pieces, Line, parse_line_recur, parse_piece, parse_rules, ParsedSentence, Pieces, pieces_of_color } from "./mor3_hope1"
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

    let res = solve(board)

    let res_out = res.map(_ => m_fen_singles(_))

    res_out = res_out.map(_ => `https://lichess.org/editor/${_.split(' ')[0]}`)

    constraints.length = 0
    return res_out

}

let empty_board = Chess.fromSetupUnchecked(parseFen(EMPTY_FEN).unwrap())
function m_fen_singles(m: Placement, turn: Color = 'white'): string {
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
        for (let a1 of sentence.attack) {
            constraints.push(vae_attacks(p1, a1))
        }
    }

    if (sentence.type === 'move_attack') {

    }
}

type Placement = Map<Pieces, SquareSet | undefined>

type Option = [Pieces, Square][]

type Constraint = {
    involved: Pieces[]
    expand: (placement: Placement) => Option[] | null
}


function applyOption(board: Placement, option: Option): Placement | null {
    const next = new Map(board)

    for (const [p, s] of option) {
        if (next.has(p)) {
            if (!next.get(p)!.has(s)) return null
        }
        next.set(p, SquareSet.fromSquare(s))
        for (const [p2, ss] of next.entries()) {
            if (p2 === p) continue
            next.set(p2, ss?.without(s))
        }
    }

    return next
}

function solve(board: Placement): Placement[] {

    const stack: Placement[] = [board]
    const solutions: Placement[] = []

    while (stack.length > 0) {
        if (solutions.length === 1) {
            //break
        }
        const current = stack.pop()!

        let all = true
        for (let key of current.keys()) {
            if (current.get(key)?.singleSquare() !== undefined) {

            } else {
                all = false
                break
            }
        }
        if (all) {
            if (isFullyValid(current)) {
            solutions.push(current)
            }
            continue
        }


        const constraint = constraints.find(c =>
            c.involved.some(p => current.get(p)?.singleSquare() === undefined)
        )

        if (!constraint) continue

        const options = constraint.expand(current)

        if (!options) continue


        for (const option of options) {
            const next = new Map(current)
            let valid = applyOption(next, option)

            if (valid) {
                stack.push(valid)
            }
        }
    }

    return solutions
}


function isFullyValid(board: Placement): boolean {
  for (const c of constraints) {
    const needed = c.involved;
    if (!needed.every(p => board.has(p))) continue;

    const options = c.expand(board);
    if (!options) return false;

    if (options.length === 0) {
        continue
    }
    continue

    /*
    // If all constraints must be satisfied exactly, we need one option that matches the current placement
    const matchesCurrent = options.some(opt =>
      opt.every(([p, s]) => board.get(p)?.singleSquare() === s)
    );

    if (!matchesCurrent) return false;
    */
  }
  return true;
}



const constraints: Constraint[] = []


const vae_attacks = (p1: Pieces, a1: Pieces): Constraint =>
({
    involved: [p1, a1],
    expand: (placement: Placement): Option[] | null => {
        let p1ss = placement.get(p1)
        let a1ss = placement.get(a1)

        if (!p1ss || !a1ss) return null

        let p1s = p1ss.singleSquare()
        let a1s = a1ss.singleSquare()

        let p1p = parse_piece(p1)
        let occupied = m_occupied(placement)

        if (p1s !== undefined && a1s !== undefined) {
            if (attacks(p1p, p1s, occupied).has(a1s)) {

                return []
            }
            return null
        }

        const options: [Pieces, Square][][] = []


        for (let p1s of p1ss) {
            for (let a1s of attacks(p1p, p1s, occupied).intersect(a1ss)) {
                options.push([[p1, p1s], [a1, a1s]])
            }
        }

        //if (options.length === 0) return []

        return options
    }
})


function m_occupied(m: Placement) {
    let res = SquareSet.empty()
    
    for (let key of m.keys()) {
        let sq = m.get(key)!.singleSquare()
        if (sq !== undefined) {
            res = res.set(sq, true)
        }
    }
    return res
}


/*
function attempt(base: MBoard, todo: Placement[], constraints: Constraint[]): MBoard | null {

    const placement = new Map(base)
    const queue = [...todo]

    while (queue.length > 0) {
        const [p, s] = queue.pop()!

        if (placement.has(p)) {
            if (!placement.get(p)!.has(s)) return null
        }

        placement.set(p, SquareSet.fromSquare(s))

        for (let [p2, ss] of placement.entries()) {

            if (p2 === p) {
                continue
            }

            placement.set(p2, ss?.without(s))
        }


        for (const constraint of constraints) {
            if (!constraint.involved.includes(p)) continue

            const ok = constraint.validateAndExpand(placement)

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

            //console.log(yesBoard, nextBoard, nextPlacements)
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

*/


/*
function collapse(base: MBoard): MBoard[] {
    const solutions: MBoard[] = []

    function recurse(current: MBoard) {
        for (const constraint of constraints) {
            if (!constraint.involved.some(p => current.has(p))) continue

            let options: Option[] = []

            const ok = constraint.validateAndExpand(current, (opts) => {
                options = opts
                return true
            });

            if (!ok) return

            for (const option of options) {
                const nextBoard = applyOption(current, option);
                if (nextBoard !== null) {
                    if (nextBoard.get('Q')?.singleSquare() === 10) {
                        console.log("yay")
                    }
                    recurse(nextBoard);
                }
                


            }
            //break
        }
        solutions.push(current)
    }

    recurse(base)
    return solutions
}

*/

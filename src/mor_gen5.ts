import { appendFileSync } from "fs"
import { attacks } from "./attacks"
import { extract_pieces, Line, MoveAttackSentence, parse_line_recur, parse_piece, parse_rules, ParsedSentence, Pieces } from "./mor3_hope1"
import { extract_g_board, g_fen_singles, g_occupied, GBoard } from "./mor_gen2"
import { SquareSet } from "./squareSet"
import { Square } from "./types"

export function mor_gen5(text: string) {

    let root = parse_rules(text)
    parse_line_recur(root)

    let constraints = make_constraint(root)
    let board = extract_g_board(text)

    let res = solve({ q: board, constraints })

    let res_out = res.map(_ => g_fen_singles(_))

    res_out = res_out.map(_ => `https://lichess.org/editor/${_.split(' ')[0]}`)

    constraints.length = 0
    return res_out

}

function solve(initial: SolverState): GBoard[] {
    let stack: SolverState[] = [initial]
    let solutions: GBoard[] = []


    while (stack.length > 0) {
        let state = stack.pop()!

        let { q, constraints } = state

        if (constraints.length === 0) {
            solutions.push(q)
            break
            continue
        }

        let [current, ...rest] = constraints
        let result = current.expand(q)

        if (result === null) {
            continue
        } else if (result.length === 0) {
            stack.push({ q, constraints: rest})
        } else {
            for (let option of result) {
                let iq = {...q}
                option.apply(iq)
                let newConstraints = [...rest, ...option.subCc]
                stack.push({ q: iq, constraints: newConstraints })
            }
        }
    }

    return solutions
}


type Option = {
    apply: (_: GBoard) => void
    subCc: Constraint[]
}

type Constraint = {
    expand: (g: GBoard) => Option[] | null | []
}

type SolverState = {
    q: GBoard
    constraints: Constraint[]
}

function make_constraint(line: Line): Constraint[] {
    let sentence = line.sentence
    let res: Constraint[] = []

    let subCc = line.children.map(make_constraint)

    res.push(...ss_constraint(sentence, subCc))

    function ss_constraint(sentence: ParsedSentence, subCc: Constraint[][]) {
        let res: Constraint[] = []

        if (sentence.precessor === '.') {
            res.push(...subCc[0])
        }

        if (sentence.type === 'g_still_attack') {
            for (let attack of sentence.attacks) {
                res.push(...ss_constraint(attack, []))
            }
        }



        if (sentence.type === 'still_attack') {
            let p1 = sentence.piece
            for (let a1 of sentence.attacked_by) {
                res.push(vae_attacks(a1, p1))
            }
            for (let a1 of sentence.attack) {
                res.push(vae_attacks(p1, a1))
            }


            res.push(...subCc.map(vae_still_subs))
        }

        if (sentence.type === 'move_attack') {
            res.push(vae_move_attack(sentence, subCc))
        }
        return res
    }


    return res
}

const vae_still_subs = (cc: Constraint[]) => ({
    expand: (q: GBoard): Option[] | null => {
        return [{
            apply: () => { },
            subCc: cc
        }]
    }
})

const vae_move_attack = (res: MoveAttackSentence, subCcc: Constraint[][]): Constraint => ({
    expand: (q: GBoard): Option[] | null => {

        if (!res.move) {
            return null
        }

        let occupied = g_occupied(q)
        let p1 = res.move
        let p1p = parse_piece(res.move)
        let p1ss = q[res.move]

        if (!p1ss) return null

        let subCc = vae_move_attack_sub(res)
        const options: Option[] = []
        for (let p1s of p1ss) {
            let a1ss = attacks(p1p, p1s, occupied)
            subCcc.forEach(subCc2 =>
            options.push({
                apply(q: GBoard) {
                    g_take(q, p1s)
                    q[p1] = a1ss
                },
                subCc: [...subCc, ...subCc2]
            })
        )
        }

        return options
    }
})

const vae_move_attack_sub = (sentence: MoveAttackSentence): Constraint[] => {
    let res: Constraint[] = []

    let p1 = sentence.move
    for (let a1 of sentence.attacked_by) {
        res.push(vae_attacks(a1, p1))
    }
    for (let a1 of sentence.attack) {
        res.push(vae_attacks(p1, a1))
    }

    return res
}


const vae_attacks = (p1: Pieces, a1: Pieces): Constraint =>
({
    expand: (q: GBoard): Option[] | null => {
        let p1ss = q[p1]
        let a1ss = q[a1]

        if (!p1ss || !a1ss) return null

        let p1s = p1ss.singleSquare()
        let a1s = a1ss.singleSquare()

        let p1p = parse_piece(p1)
        let occupied = g_occupied(q)

        if (p1s !== undefined && a1s !== undefined) {
            if (attacks(p1p, p1s, occupied).has(a1s)) {

                return []
            }
            return null
        }

        const options: Option[] = []


        for (let p1s of p1ss) {
            for (let a1s of attacks(p1p, p1s, occupied).intersect(a1ss)) {
                options.push({
                    apply(q: GBoard) {

                        g_place(q, p1, p1s)
                        g_place(q, a1, a1s)


                    },
                    subCc: []
                })
            }
        }

        return options
    }
})

function g_take(g: GBoard, sq: Square) {

    for (let key of Object.keys(g)) {
        g[key] = g[key]?.without(sq)
    }
}

function g_place(g: GBoard, p1: Pieces, sq: Square) {

    if (g[p1] === undefined || !g[p1].has(sq)) {
        return false
    }

    g[p1] = SquareSet.fromSquare(sq)

    for (let key of Object.keys(g)) {
        if (key !== p1) {
            g[key] = g[key]?.without(sq)

            if (g[key]?.isEmpty()) {
                return false
            }
        }
    }
    return true
}
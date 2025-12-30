import { it } from 'vitest'
import { puzzles } from './fixture'
import { Generate_TemporalMotives, san_moves, TemporalMoves } from '../src/features/tactical_features'
import { fen_pos, Generate_TemporalTransitions, Min_max_sort, Move, pos_moves, Position } from '../src'
import { squareSet } from '../src/debug'


it('works', () => {
    console.log(puzzles[0].link)
    solve_n(0)
})


function solve_n(n: number) {
    let link = puzzles[n].link
    let fen = puzzles[n].move_fens[0]
    let solution = puzzles[n].sans

    let pos = fen_pos(fen)
    let tt = Generate_TemporalTransitions(pos)

    tt = tt.filter(_ => Legal_moves_filter(pos, _))
    let res = Min_max_sort(pos, tt).map(_ => san_moves(pos, _))


    console.log(res, solution)
    console.log(find_solving_sans_loose(res, solution))
    console.log(find_solving_sans(res, solution))
}

function Legal_moves_filter(pos: Position, mm: Move[]) {

    let p2 = pos.clone()
    for (let m of mm) {
        let aa = pos_moves(p2)
        if (!aa.find(_ => _.from === m.from && _.to === m.to)) {
            return false
        }
        p2.play(m)
    }
    return true
}

export const find_solving_sans_loose = (a: SAN[][], b: SAN[]) => {
    return a.find(_ => _.join(' ') === b.join(' ')) !== undefined
}

type SAN = string
export const find_solving_sans = (a: SAN[][], b: SAN[]) => {
    if (a.length === 0) {
        return false
    }
    if (b.length === 0) {
        return true
    }
    let head = a[0][0]

    if (head !== b[0]) {
        return false
    }

    if (b.length === 1) {
        return true
    }

    a = a.filter(_ => _[0] === head)

    a = a.filter(_ => _[1] === b[1])


    if (!find_solving_sans(a.map(_ => _.slice(2)), b.slice(2))) {
        return false
    }

    return true
}

function dedup_str(m: string[][]) {
    return [...new Set(m.map(_ => _.join(' ')))].map(_ => _.split(" "))
}
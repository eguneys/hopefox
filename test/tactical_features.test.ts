import { it } from 'vitest'
import { puzzles } from './fixture'
import { Generate_TemporalMotives, san_moves, TemporalMoves } from '../src/features/tactical_features'
import { fen_pos, Generate_TemporalTransitions_Optimized, Min_max_sort, Move, move_c_to_Move, pos_moves, Position } from '../src'
import { squareSet } from '../src/debug'

import fs from 'fs'


function render(data: string) {
    fs.writeFileSync(__dirname + '/_output.txt', data)
}

it('works', () => {

    for (let i = 0; i < 100; i++) {
        let res = solve_n(0)
        if (!res) {
            break
        }
    }
})


function solve_n(n: number) {
    let link = puzzles[n].link
    let fen = puzzles[n].move_fens[0]
    let solution = puzzles[n].sans

    let tt = Generate_TemporalTransitions_Optimized(fen)

    let tt2 = tt.map(_ => _.map(move_c_to_Move))
    let res = Min_max_sort(fen_pos(fen), tt2).map(_ => san_moves(fen_pos(fen), _))


    let solved = find_solving_sans(res, solution)
    let loose = find_solving_sans_loose(res, solution)

    if (!solved) {
        console.log(n)
        console.log(link)
        console.log(puzzles[n].sans, '\nexpected but found\n', res.slice(0))
        console.log('loosely solved: ', loose)
    }
    return solved
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
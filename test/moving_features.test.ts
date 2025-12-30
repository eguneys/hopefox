import { it } from 'vitest'
import { Min_max_sort, moving_features, ruleset_split, SAN } from '../src'
import { puzzles } from './fixture'


let ruleset = `
check a-h; king a to h hits h-a; block a-h g capture h
block a-h g; to g; capture g check a-f check 1-8
capture a; on a to a; capture a
`.trim()

it.skip('moves', () => {

    let res = puzzles
    .filter(_ => !_.tags.includes('mate'))
    .slice(350).slice(0, 10).map(_ => _.link)
    console.log(res)
})

it.skip('solve', () => {
    solve_n(0)
})


function solve_n(n: number) {
    let link = puzzles[n].link
    let fen = puzzles[n].move_fens[0]

    let res = moving_features(fen, ruleset)

    let a = find_solving_sans(res, puzzles[n].sans)

    if (!a) {
        console.log(n)
        console.log(link)
        console.log(puzzles[n].sans, '\nexpected but found\n', res.slice(0))
        return false
    }
}



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

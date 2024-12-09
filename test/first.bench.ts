import { bench, describe } from 'vitest'
import { Puzzle, puzzles, tenk } from './fixture'
import { bestsan } from '../src'

describe('slow bench', () => {
    bench('slow', () => {
        let tt = tenk.slice(0, 1)
        tt.forEach(one =>
            solve_p_str(one, `
q
 r =x
 r
  . 1
   r =x
`)
        )
    })
})





function solve_p_str(p: Puzzle, rules: string) {
    for (let i = 0; i < p.move_fens.length; i += 2) {
        let fen = p.move_fens[i]
        let san = p.sans[i]

        if (bestsan(fen, rules) !== san) {
            console.log('\n\n')
            console.log(p.link, fen, bestsan(fen, rules), san)
            return false
        }
        return true
    }
    return true
}
const rules = `
`

function solve_p(p: Puzzle, _rules: string = rules) {
    for (let i = 0; i < p.move_fens.length; i += 2) {
        let fen = p.move_fens[i]
        let san = p.sans[i]

        if (bestsan(fen, _rules) !== san) {
            return false
        }
    }
    return true
}
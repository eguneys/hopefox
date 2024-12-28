import { describe } from 'node:test'
import { it, expect } from 'vitest'
import { Puzzle, puzzles, tenk } from './fixture'
import { bestsan3 } from '../src'


it('01Aty', () => {
    let one = tenk.find(_ => _.id === '01Aty')!


    solve_p_str(one, `
r =B

r /Q+B

b /Q+K

q =Q

`)

})


it('00KO5', () => {
    let one = tenk.find(_ => _.id === '00KO5')!


    solve_p_str(one, `
r /Q+h7
 Q +k
  q =Q
`)

})


it.only('00JZk', () => {
    let one = tenk.find(_ => _.id === '00JZk')!


    solve_p_str(one, `
q /Q+K
`)

})

function solve_p_str(p: Puzzle, rules: string) {
    for (let i = 0; i < p.move_fens.length; i += 2) {
        let fen = p.move_fens[i]
        let san = p.sans[i]

        if (bestsan3(fen, rules) !== san) {
            console.log('\n\n')
            console.log(p.link, fen, bestsan3(fen, rules), san)
            return false
        }
    }
    return true
}
const rules = `
`

function solve_p(p: Puzzle, _rules: string = rules) {
    for (let i = 0; i < p.move_fens.length; i += 2) {
        let fen = p.move_fens[i]
        let san = p.sans[i]

        if (bestsan3(fen, _rules) !== san) {
            return false
        }
    }
    return true
}
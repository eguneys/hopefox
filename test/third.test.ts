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



it('00J1t', () => {
    let one = tenk.find(_ => _.id === '00J1t')!


    solve_p_str(one, `
q +B
 N
  q #
`)

})



it.only('00LRv neg rules', () => {
    let one = tenk.find(_ => _.id === '00LRv')!


    solve_p_str(one, `
q +K
 0 R =q
 q =B
  q =B
`)

})




it('00KO5', () => {
    let one = tenk.find(_ => _.id === '00KO5')!


    solve_p_str(one, `
r /Q+h7
 r =h7
  q =h7#
 Q =r
 .
`)

})


it('00JZk', () => {
    let one = tenk.find(_ => _.id === '00JZk')!


    solve_p_str(one, `
r /Q+h7
 r =h7
  q =h7#
 Q =r
 q =Q
  q =Q
 r =Q
  r =Q
 k =R
  k =R
 r /B+Q
  r =B
 R /r+k
 r =R
  r =R
 q +K
  q +K
   q /Q+K
 .
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
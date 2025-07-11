import { bench, describe } from 'vitest'
import { Puzzle, puzzles, tenk } from './fixture'
import { find_san8 } from '../src'

describe('find_san7 bench', () => {
    bench('find_san7 nested stars', () => {

        let fen = tenk.find(_ => _.id === '004Ys')!.move_fens[0]
        fen = 'r4rk1/5p1p/p1n1p1p1/1pp3NP/3q1B2/7Q/P5P1/R3R1K1 w - - 4 20'

        find_san8(fen, `
b =e3 +Q
 *r =Q
 *b =Q
 *p =h6 +h7, q +h7
  *r =Q
  *k =Q
  *q =Q
  ^Q =_ +h7
   q =h7 #
  ^Q =_ +h7
`)
    })
})
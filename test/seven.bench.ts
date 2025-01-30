import { bench, describe } from 'vitest'
import { Puzzle, puzzles, tenk } from './fixture'
import { find_san8 } from '../src'

describe('find_san7 bench', () => {
    bench('find_san7 nested stars', () => {

        let fen = tenk.find(_ => _.id === '004Ys')!.move_fens[0]

        find_san8(fen, `
b =e3 +Q
 *p =g6
  *q =h7 #
  *q =Q
  *q =B
`)
    })
})
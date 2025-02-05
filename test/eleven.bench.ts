import { bench, describe } from 'vitest'
import { Puzzle, puzzles, tenk } from './fixture'
import { find_san11 } from '../src'

describe('find_san7 bench', () => {
    bench('find_san7 nested stars', () => {

        let fen = tenk.find(_ => _.id === '004Ys')!.move_fens[0]

        let rules = `
b =g5 +Q
 *
 E a =Q
 N +k
 *
  r +Q
   *
   E a =Q
`

let r1 = `
b =g5 +Q
 *
 E a =Q
 N +k
 *
  r +Q
   *
   E a =Q
`

        find_san11(fen, r1)
     })
})

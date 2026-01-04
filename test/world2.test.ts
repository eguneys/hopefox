import { it } from 'vitest'
import { search } from '../src'
import { puzzles } from './fixture'


it('works', () => {

    let rules = `
fact pressures
     .from = attacks.from
     .to = attacks.to
  attacks.to = occupies.square
  occupies.color = turn

fact check
     .from = attacks2.from
     .to = attacks2.to
     .check = attacks2.to2
  attacks2.to2 = occupies.square
  occupies.color = turn

fact capture
     .from = attacks.from
     .to = attacks.to
  attacks.to = occupies.square

fact block
     .blocks.from = attacks.from
     .blocks.to = attacks.to
     .blocks.block_from = pressures.from
     .blocks.block_to = pressures.to
  attacks.to between pressures.from pressures.to
`.trim()


    let fen = puzzles[0].move_fens[0]
    let res = search(fen, rules)

    console.log(res)
})
import { it } from 'vitest'
import { fen_pos, join_world, link, parse_program } from '../src'
import { puzzles } from './fixture'


it.skip('works', () => {
    
    let l = link(parse_program(`
fact pressures
   .from = attacks.from
   .to = attacks.to
attacks.to = occupies.square
occupies.color = turn

`))

    let fen = puzzles[0].move_fens[0]
    let res = join_world(fen, l)
    console.log(res)
})


it('more facts', () => {

    let p2 = `
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



fact fork
  alias a2 attacks
     .fork.from = attacks.from
     .fork.to1 = attacks.to
     .forks.to2 = a2.to
  attacks.from = a2.from
  attacks.to != a2.to
 
`
    
    let l = link(parse_program(p2))

    let fen = puzzles[0].move_fens[0]
    let res = join_world(fen, l)
    console.log(res)
})
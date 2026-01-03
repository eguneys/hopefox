import { it } from 'vitest'
import { fen_pos, join_world, link, out_lines, out_moves, parse_program, PositionManager, san_moves_c } from '../src'
import { puzzles } from './fixture'

let m = await PositionManager.make()


it('ideas', () => {
    
    let l = link(m, parse_program(`
fact captures
     .from = attacks.attacks.from
     .to = attacks.attacks.to
  attacks.attacks.to = occupies.occupy.square

fact capture_legal
    .move.from = captures.from
    .move.to = captures.to
  moves.move.from = captures.from
  moves.move.to = captures.to

idea recapture
  alias c2 capture_legal
  line capture_legal c2
    .move.from = capture_legal.move.from
    .move.to = capture_legal.move.to
    .recapture.from2 = c2.move.from
    .recapture.to2 = c2.move.to
  c2.move.to = capture_legal.move.to
`))

    console.log(puzzles[2].link)
    let fen = puzzles[2].move_fens[0]
    let pos = m.create_position(fen)
    let res = join_world(m, pos, l)
    console.log(out_lines(res.recapture).map(ms => san_moves_c(m, pos, ms)))

    m.delete_position(pos)
})


it.skip('works', () => {
    
    let l = link(m, parse_program(`
fact pressures
   .from = attacks.from
   .to = attacks.to
attacks.to = occupies.square
occupies.color = turn

`))

    let fen = puzzles[0].move_fens[0]
    let pos = m.create_position(fen)
    let res = join_world(m, pos, l)
    console.log(res)
})


it.skip('more facts', () => {

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
    
    let l = link(m, parse_program(p2))

    let fen = puzzles[0].move_fens[0]
    let pos = m.create_position(fen)
    let res = join_world(m, pos, l)
    console.log(res)
})
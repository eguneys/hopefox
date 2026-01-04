import { it } from 'vitest'
import { search } from '../src'
import { puzzles } from './fixture'


it('ideas', () => {

    let rules = `
fact pressures
     .from = attacks.from
     .to = attacks.to
  attacks.to = occupies.square

fact checks0
     .from = attacks2.from
     .to = attacks2.to
     .check = attacks2.to2
     .piece = occupies.piece
  attacks2.to2 = occupies.square

fact checks
     .from = checks0.from
     .to = checks0.to
     .check = checks0.check
  checks0.piece = KING

fact captures
     .from = attacks.from
     .to = attacks.to
  attacks.to = occupies.square

fact blocks
     .from = attacks.from
     .to = attacks.to
     .block_from = pressures.from
     .block_to = pressures.to
  attacks.to between pressures.from pressures.to

fact captures_moves
     .from = moves.from
     .to = moves.to
  moves.from = captures.from
  moves.to = captures.to

idea recaptures
  alias c2 captures_moves
  line captures_moves c2
    .from = captures_move.from
    .to = captures_move.to
    .from2 = c2.move.from
    .to2 = c2.move.to
  c2.move.to = captures_moves.to

`.trim()


  let link = puzzles[2].link

  console.log(link)

  let fen = puzzles[2].move_fens[0]
  let res = search(fen, rules)

  console.log(res)
})


it.skip('facts', () => {

    let rules = `
fact pressures
     .from = attacks.from
     .to = attacks.to
  attacks.to = occupies.square

fact checks0
     .from = attacks2.from
     .to = attacks2.to
     .check = attacks2.to2
     .piece = occupies.piece
  attacks2.to2 = occupies.square

fact checks
     .from = checks0.from
     .to = checks0.to
     .check = checks0.check
  checks0.piece = KING

fact captures
     .from = attacks.from
     .to = attacks.to
  attacks.to = occupies.square

fact blocks
     .from = attacks.from
     .to = attacks.to
     .block_from = pressures.from
     .block_to = pressures.to
  attacks.to between pressures.from pressures.to

`.trim()


  let link = puzzles[0].link

  console.log(link)

  let fen = puzzles[0].move_fens[0]
  let res = search(fen, rules)

  console.log(res)
})
import { it } from 'vitest'
import { flat_san_moves_c, PositionManager, san_moves, san_moves_c, search } from '../src'
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
    .from = captures_moves.from
    .to = captures_moves.to
    .from2 = c2.from
    .to2 = c2.to
  c2.to = captures_moves.to

`.trim()



  let link = puzzles[0].link

  console.log(link)

  let fen = puzzles[0].move_fens[0]

  fen = '7k/8/8/4n3/6n1/3N4/8/K7 w - - 0 1'
  let pos = m.create_position(fen)
  let res = search(m, pos, rules)
  console.log(flat_san_moves_c(m, pos, res))
  m.delete_position(pos)

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

  let pos = m.create_position(fen)
  //let res = search(m, pos, rules)

  //console.log(san_moves_c(m, pos, res))
  console.log('OK')
  m.delete_position(pos)
})

let m = await PositionManager.make()
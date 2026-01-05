import { it } from 'vitest'
import { flat_san_moves_c, PositionManager, san_moves, san_moves_c, search } from '../src'
import { puzzles } from './fixture'

it('more ideas', () => {

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

idea blockable_check
   line checks blocks
     .from = blocks.from
     .to = blocks.to
     .check_from = checks.from
     .check_to = checks.to
  blocks.block_from = checks.to
  blocks.block_to = checks.check

`.trim()

;`
idea double_capture
  alias c2 capture
  alias c3 capture
  alias c4 capture
  line capture c2 c3 c4
    .double_capture.from = capture.from
    .double_capture.to = capture.to
    .double_capture.from2 = c2.from
    .double_capture.from3 = c3.from
    .double_capture.from4 = c4.from
  c2.to = capture.to
  c3.to = c2.to
  
idea check_to_lure_into_double_capture
  line blockable_check double_capture
     .check_to_lure_into_double_capture.from = blockable_check.check_from
  blockable_check.check_from = double_capture.from
  blockable_check.to = double_capture.to
`


  let link = puzzles[0].link
  console.log(link)
  let fen = puzzles[0].move_fens[0]

  //fen = '8/3Qnk1p/3R4/4B2b/Pp2p3/1P2P3/5PPP/2r3K1 w - - 5 33'
  let pos = m.create_position(fen)
  let res = search(m, pos, rules)
  console.log(flat_san_moves_c(m, pos, res))
  m.delete_position(pos)

})

it.skip('ideas', () => {

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



  let link = puzzles[2].link
  console.log(link)
  let fen = puzzles[2].move_fens[0]

  //fen = '7k/8/8/4n3/6n1/3N4/8/K7 w - - 0 1'
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
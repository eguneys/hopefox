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

legal checks_moves
legal captures_moves
legal blocks_moves

idea blockable_checks
   line checks_moves blocks_moves
     .block_from = blocks_moves.from
     .block_to = blocks_moves.to
  blocks_moves.block_from = checks_moves.to
  blocks_moves.block_to = checks_moves.check

idea double_captures
  alias c2 captures_moves
  alias c3 captures_moves
  line captures_moves c2 c3
  c2.to = captures_moves.to
  c3.to = _.to

motif check_to_lure_into_double_capture
  line blockable_checks double_captures
     .from = blockable_checks.check_from
  blockable_checks.check_from = double_captures.from
  blockable_checks.to = double_captures.to
`.trim()

;`
idea double_capture
  alias c2 captures_moves
  alias c3 captures_moves
  line captures_moves c2 c3
    .from = captures_moves.from
    .to = captures_moves.to
  c2.to = captures_moves.to
    .from2 = c2.from
  c3.to = _.to



`


  let link = puzzles[0].link
  console.log(link)
  let fen = puzzles[0].move_fens[0]

  //fen = '8/3Qnk1p/8/4B2b/Pp2p3/1P2P3/5PPP/2rR2K1 b - - 6 33'
  let pos = m.create_position(fen)
  let res = search(m, pos, rules)
  console.log(dedup_sans(flat_san_moves_c(m, pos, res)))
  m.delete_position(pos)

})

function bench(rules: string) {
  for (let i = 0; i < 1000; i++) {
    render('' + i)
    solve_n(0, rules)
  }
}

function solve_n(n: number, rules: string) {
  let link = puzzles[n].link
  console.log(link)
  let fen = puzzles[n].move_fens[0]

  //fen = '8/3Qnk1p/8/4B2b/Pp2p3/1P2P3/5PPP/2rR2K1 b - - 6 33'
  let pos = m.create_position(fen)
  let res = search(m, pos, rules)
  console.log(dedup_sans(flat_san_moves_c(m, pos, res)))
  m.delete_position(pos)
}

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


import fs from 'fs'

function render(data: string) {
    fs.writeFileSync(__dirname + '/_output.txt', data)
}

type SAN = string
function dedup_sans(m: SAN[][]) {
    return [...new Set(m.map(_ => _.join(' ')))].map(_ => _.split(" "))
}
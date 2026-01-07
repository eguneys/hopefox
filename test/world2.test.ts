import { it } from 'vitest'
import { flat_san_moves_c, Min_max_sort, PositionManager, san_moves, san_moves_c, search } from '../src'
import { puzzles } from './fixture'


it('solving', () => {
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
  attacks2.to2 != attacks2.from

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
     .check_from = checks_moves.from
     .check_to = checks_moves.to
     .block_from = blocks_moves.from
     .block_to = blocks_moves.to
  blocks_moves.block_from = checks_moves.to
  blocks_moves.block_to = checks_moves.check

idea double_captures
  alias c2 captures_moves
  alias c3 captures_moves
  line captures_moves c2 c3
  exchange_square = captures_moves.to
  exchange_square = c2.to
  exchange_square = c3.to

idea check_to_lure_into_double_capture
  line blockable_checks double_captures
  blockable_checks.block_to = double_captures.to
`.trim()

let patterns = [
    'check_to_lure_into_double_capture'
  ]

  for (let i = 0; i < 100; i++) {
    let res = minmax_solve_loose(i, rules, patterns)
    if (!res) {
      break
    }
  }
})


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
  attacks2.to2 != attacks2.from

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
     .check_from = checks_moves.from
     .check_to = checks_moves.to
     .block_from = blocks_moves.from
     .block_to = blocks_moves.to
  blocks_moves.block_from = checks_moves.to
  blocks_moves.block_to = checks_moves.check

idea double_captures
  alias c2 captures_moves
  alias c3 captures_moves
  line captures_moves c2 c3
  exchange_square = captures_moves.to
  exchange_square = c2.to
  exchange_square = c3.to

idea check_to_lure_into_double_capture
  line blockable_checks double_captures
  blockable_checks.block_to = double_captures.to
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

idea check_to_lure_into_double_capture
  line blockable_checks double_captures
  blockable_checks.block_to = double_captures.to
`


  //bench(rules, 'check_to_lure_into_double_capture')

  solve_n(1, rules, 'checks_moves')
  return

  let link = puzzles[0].link
  console.log(link)
  let fen = puzzles[0].move_fens[0]

  //fen = '8/3Qnk1p/8/4B2b/Pp2p3/1P2P3/5PPP/2rR2K1 b - - 6 33'
  solve_n(0, rules, 'checks_moves')
})



function minmax_solve_loose(n: number, rules: string, columns: string[]) {
  let link = puzzles[n].link
  let fen = puzzles[n].move_fens[0]

  let pos = m.create_position(fen)
  let res = search(m, pos, rules, columns)

  let result = true

  for (let [column, moves] of res.entries()) {
    let sans = flat_san_moves_c(m, pos, moves)
    if (sans.length > 0) {

      let a = sans.find(_ => _.join(' ').startsWith(puzzles[n].sans.join(' ')))
      if (!a) {
        console.log(n)
        console.log(link)
        console.log(puzzles[n].sans, '\nexpected but found\n', sans.slice(0, 3))
        result = false
      }
    }
  }

  m.delete_position(pos)

  return result
}

function bench(rules: string, column: string) {
  for (let i = 0; i < 1000; i++) {
    render('' + i)
    solve_n(0, rules, column)
  }
}

function solve_n(n: number, rules: string, column: string) {
  let link = puzzles[n].link
  console.log(link)
  let fen = puzzles[n].move_fens[0]

  //fen = '8/3Qnk1p/8/4B2b/Pp2p3/1P2P3/5PPP/2rR2K1 b - - 6 33'
  let pos = m.create_position(fen)
  let res = search(m, pos, rules, [column])
  let res2 = dedup_sans(flat_san_moves_c(m, pos, res.get(column)!))
  m.delete_position(pos)
  return res2
}

let m = await PositionManager.make()

import fs from 'fs'

function render(data: string) {
    fs.writeFileSync(__dirname + '/_output.txt', data)
}

type SAN = string
function dedup_sans(m: SAN[][]) {
    return [...new Set(m.map(_ => _.join(' ')))].map(_ => _.split(" "))
}

const find_solving_sans = (a: SAN[][], b: SAN[]) => {
    if (a.length === 0) {
        return false
    }
    if (b.length === 0) {
        return true
    }
    let head = a[0][0]

    if (head !== b[0]) {
        return false
    }

    if (b.length === 1) {
        return true
    }

    a = a.filter(_ => _[0] === head)

    a = a.filter(_ => _[1] === b[1])


    if (!find_solving_sans(a.map(_ => _.slice(2)), b.slice(2))) {
        return false
    }

    return true
}
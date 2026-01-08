import { it } from 'vitest'
import { attacks, fen_pos, flat_san_moves_c, PositionManager, san_moves, san_moves_c, search } from '../src'
import { puzzles } from './fixture'

let patterns_skips = [
  'check_and_double_block',
  'double_check',
  'check_sacrifice_second_check',
  'check_evade_check_sacrifice_second_check',
  'captures_3',
  //'double_check_evade_capture'
]


let patterns1 = [
  'check_to_lure_into_double_capture',
  'check_to_lure_into_hanging_capture',
  'double_captures',
  'checks_moves',
  'fork_and_capture',
  'double_capture_block',
  'check_check_mate',
  'captures_moves'
]




it.skip('0-1000 full mega', () => {

  let rules = rules1 + '\n' + rules_only_skips

  let patterns = [...patterns1, ...patterns_skips]

  //let skips = [108, 109, 113, 120, 124, 125, 134]

  //go_range_100(100, rules, patterns, skips)

  let skips = find_skips(0, rules, patterns, 1000)

  let done = 1000 - skips.length
  console.log(skips)
  console.log(`Done ${done}/1000 .`)

})

function find_skips(start_from: number, rules: string,  patterns: string[], end_from?: number) {
  let skips = []
  for (let i = start_from; i < (end_from ?? (start_from + 100)); i++) {
    render('' + i + ' ' + puzzles[i].link + ' ' + puzzles[i].move_fens[0])
    let res = minmax_solve_loose(i, rules, patterns)
    if (!res) {
      skips.push(i)
      continue
    }
  }

  return skips
}

function go_range_100(start_from: number, rules: string,  patterns: string[], skips30: number[]) {

  let passed = 0
  let total = 100
  for (let i = start_from; i < start_from + 100; i++) {
    if (skips30.includes(i)) {
      continue
    }
    render('' + i + ' ' + puzzles[i].link + ' ' + puzzles[i].move_fens[0])
    let res = minmax_solve_loose(i, rules, patterns)
    if (!res) {
      console.log(i + ' : ' + puzzles[i].link + ' <' + puzzles[i].sans.join(' ') + '>')
      console.log(`Passed: ${passed}/${total}`)
      break
    } else {
      passed++
    }
  }

  console.log(`Done: ${passed}/${total}`)
}




    let rules1 = `
fact pressures
     .from = attacks.from
     .to = attacks.to
  attacks.to = occupies.square

fact pressures2
     .from = attacks2.from
     .to = attacks2.to
     .to2 = attacks2.to2
  attacks2.to2 = occupies.square
  attacks2.from != attacks2.to2


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


idea check_to_lure_into_hanging_capture
  line blockable_checks captures_moves
  blockable_checks.block_to = captures_moves.to


fact fork
  alias p2 pressures2
  .from = pressures2.from
  .to = pressures2.to
  .fork1 = pressures2.to2
  .fork2 = p2.to2
  pressures2.from = p2.from
  pressures2.to = p2.to
  pressures2.to2 != p2.to2

fact king_evade
  .from = attacks.from
  .to = attacks.to
  attacks.piece = KING

legal fork_moves
legal king_evade_moves

idea fork_and_capture
  line fork_moves king_evade_moves captures_moves
  fork_moves.fork1 = king_evade_moves.from
  fork_moves.fork2 = captures_moves.to

idea double_capture_block
  line captures_moves captures_moves check_to_lure_into_hanging_capture


idea check_check_mate
  line checks_moves king_evade_moves checks_moves

`



  let rules_only_skips = `
fact check0
  .from = attacks2.from
  .to = attacks2.to
  .piece = occupies.piece
  .to2 = attacks2.to2
  attacks2.to2 = occupies.square
  attacks2.to2 != attacks2.from
  attacks2.color != occupies.color

fact check
 .from = check0.from
 .to = check0.to
 check0.piece = KING

legal check_moves

fact block
 .from = attacks.from
 .to = attacks.to
 attacks.to between attacks2.from attacks2.to2

 legal block_moves

idea check_and_block
  line check_moves block_moves



idea check_and_double_block
  line check_and_block check_and_block check_moves


fact capture
 .from = attacks.from
 .to = attacks.to
 attacks.to = occupies.square

legal capture_moves


idea check_sacrifice
  line check_moves capture_moves


idea check_sacrifice_second_check
  line check_sacrifice check_moves


idea evade
 line moves


legal evade_moves

idea check_evade_check_sacrifice_second_check
  line check_moves evade_moves check_sacrifice_second_check


idea captures_3
  line capture_moves capture_moves capture_moves


fact double_attack
  alias c2 check0
  .from = c2.from
  .to = c2.to
  c2.from = check0.from
  c2.to = check0.to
  c2.to2 != check0.to2

legal double_attack_moves

idea double_check_evade_capture
  line double_attack_moves evade_moves capture_moves
`




it.skip('full integration 0-100', () => {

  let rules = rules1 + '\n' + rules_only_skips

  let patterns_skips = [
    'check_and_double_block',
    'double_check',
    'check_sacrifice_second_check',
    'check_evade_check_sacrifice_second_check',
    'captures_3',
    //'double_check_evade_capture'
  ]


let patterns1 = [
    'check_to_lure_into_double_capture',
    'check_to_lure_into_hanging_capture',
    'double_captures',
    'checks_moves',
    'fork_and_capture',
    'double_capture_block',
    'check_check_mate',
    'captures_moves'
  ]


  let skip_to_puzzle
  //skip_to_puzzle = 69

  let single_out
  let patterns = [...patterns_skips, ...patterns1]

  patterns = single_out !== undefined ? single_out : patterns

  if (skip_to_puzzle !== undefined) {

    let patterns = [
    'fork_and_capture',
    ]
    console.log('only puzzle ', skip_to_puzzle)
    let res = minmax_solve_loose(skip_to_puzzle, rules, patterns)
    console.log(res)
    return
  }

  let start_from = 0
  let passed = 0
  let total = 100
  for (let i = start_from; i < 100; i++) {
    if (skips30.includes(i)) {
      continue
    }
    render('' + i + ' ' + puzzles[i].link + ' ' + puzzles[i].move_fens[0])
    let res = minmax_solve_loose(i, rules, patterns)
    if (!res) {
      console.log(i + ' : ' + puzzles[i].link)
      console.log(`Passed: ${passed}/${total}`)
      break
    } else {
      passed++
    }
  }

  console.log('Done ', passed)
})



it.skip('only skips', () => {
  let start_from = 0
  let single_out


  let rules = rules_only_skips

  let patterns = [
    'check_and_double_block',
    'double_check',
    'check_sacrifice_second_check',
    'check_evade_check_sacrifice_second_check',
    'captures_3',
    'double_check_evade_capture'
  ]

  patterns = single_out !== undefined ? single_out : patterns


  let passed = 0
  let total = skips.length - start_from
  for (let j = start_from; j < skips.length; j++) {
    if (skips30.includes(j)) {
      continue
    }
    let i = skips[j]
    render('' + i + ' ' + puzzles[i].link + ' ' + puzzles[i].move_fens[0])
    let res = minmax_solve_loose(i, rules, patterns)
    if (!res) {
      console.log(j + ' : ' + puzzles[i].link)
      console.log(`Passed: ${passed}/${total}`)
      break
    } else {
      passed++
    }
  }
})



it.skip('solving', () => {

  let rules = rules1

let patterns = [
    'check_to_lure_into_double_capture',
    'check_to_lure_into_hanging_capture',
    'double_captures',
    'checks_moves',
    'fork_and_capture',
    'double_capture_block',
    'check_check_mate',
    'captures_moves'
  ]

  if (single_out) {
    console.log(solve_n(single_out[0], rules, single_out[1]))
    return
  }

  if (n) {
    let fen = '4k3/1R6/6N1/5p1p/7P/6rK/5b2/8 w - - 0 48'// ?? puzzles[n].move_fens[0]
    let column = 'attacks'

    let pos = m.create_position(fen)
    let res = search(m, pos, rules, [column])
    let res2 = dedup_sans(flat_san_moves_c(m, pos, res.get(column)!))
    m.delete_position(pos)
    console.log(res2)
    return res2
  }

  for (let i = start_from; i < 100; i++) {

    if (skips.includes(i)) {
      continue
    }


    render('' + i + ' ' + puzzles[i].link + ' ' + puzzles[i].move_fens[0])
    let res = minmax_solve_loose(i, rules, patterns)
    if (!res) {
      break
    }
  }
})

let single_out: any

single_out = [70, 'fork_and_capture']

let n
let skips4 = [70, 72, 74, 75, 80]
let skips0 = [34, 39, 48, 54, 56, 60, 62, 65, 66, 67, 69]
let skips2 = [83, 92]
let skips3 = [84, 87, 94]
let start_from = 0


  let skips = [...skips0, ...skips2, ...skips3, ...skips4]



let comp_skips = [0]
let pawn_skips = [2, 8, 11, 12, 13]
let skewer_skips = [19, 20]



let skips30 = [...comp_skips, ...pawn_skips, ...skewer_skips].map(_ => skips[_])

let pawn_skips_33 = [39, 93]
let block_check_skips_33 = [69]
skips30 = [...skips30, ...pawn_skips_33, ...block_check_skips_33]


function minmax_solve_loose(n: number, rules: string, columns: string[]) {
  let link = puzzles[n].link
  let fen = puzzles[n].move_fens[0]

  let pos = m.create_position(fen)
  let res = search(m, pos, rules, columns)


  let log_trace: any[] = []
  const log = (...s: any) => log_trace.push(...s)

  let result = true

  for (let [column, moves] of res.entries()) {
    let sans = flat_san_moves_c(m, pos, moves)
    if (sans.length > 0) {

      let a = sans.find(_ => _.join(' ').startsWith(puzzles[n].sans.join(' ')))
      if (!a) {
        log(n)
        log(link)
        log(puzzles[n].sans, 'expected but found', [...sans.slice(0, 3), ...[sans.length > 3 ? '...' : ''].filter(Boolean)])
        log(column)
        result = false
      } else {
        result = true
        break
      }
    } else {
      log('No sans []')
      result = false
    }
  }

  if (!result) {
    console.log(log_trace)
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
import { squareSet } from '../src/debug'

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



it.skip('more ideas', () => {

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

  //bench(rules, 'check_to_lure_into_double_capture')

  solve_n(1, rules, 'checks_moves')
  return

  let link = puzzles[0].link
  console.log(link)
  let fen = puzzles[0].move_fens[0]

  //fen = '8/3Qnk1p/8/4B2b/Pp2p3/1P2P3/5PPP/2rR2K1 b - - 6 33'
  solve_n(0, rules, 'checks_moves')
})


import { it } from 'vitest'
import { flat_san_moves_c, PositionManager ,  relations,  search3 } from '../src'
import { puzzles } from './fixture'
import { minmax_solve_loose } from './world2.test'



  let skips = [
    501, 502, 504, 506, 507, 508, 509, 510, 512,
    513, 514, 516, 517, 519, 521, 522, 524, 528,
    529, 534, 535, 537, 538, 539, 540, 541, 542,
    544, 546, 547, 549, 554, 555, 556, 557, 558,
    559, 560, 561, 562, 565, 568, 570, 571, 573,
    574, 575, 576, 577, 578, 580, 581, 583, 584,
    585, 587, 588, 590, 591, 593, 594, 595, 596,
      597, 598, 599
  ]




it('regression color != color doesnt work', () => {

  let rules = `
fact a 
 alias occ_a occupies 
 .from = attacks2.from 
 .to = attacks2.to 
 .to2 = attacks2.to2 
 .piece = occupies.piece 
 .piece2 = occ_a.piece 
 attacks2.from = occupies.square 
 attacks2.to2 = occ_a.square
 occupies.color != occ_a.color
 
fact b 
 .from = a.from 
 .to = a.to 
 .to2 = a.to2 
 .piece = a.piece 
 .piece2 = a.piece2 
 a.piece = Rook 
`


  console.log(puzzles[skips[33]].link)
  let fen = puzzles[skips[33]].move_fens[0]
  let pos = m.create_position(fen)
  let res = relations(m, pos, rules)
  m.delete_position(pos)

  console.log(res.get('b'))




})





it.skip('regression assign .to2 = atto.to2 doesnt work \'NaN\'', () => {

  let rules = `
fact battery 
  alias occ_a occupies 
  alias occ_b occupies 
  alias at2 attacks2 
  alias atto attacks_through 
  .from = at2.from 
  .to = at2.to 
  .piece_a = occ_a.piece 
  .piece_b = occ_b.piece 
  .to2 = atto.to2 
  at2.from != at2.to2 
  at2.to2 = atto.to 
  atto.block = at2.to 
  at2.from = occ_a.square 
  atto.from = occ_b.square 
  at2.from != atto.from 
`


  console.log(puzzles[skips[8]].link)
  let fen = puzzles[skips[8]].move_fens[0]
  let pos = m.create_position(fen)
  let res = relations(m, pos, rules)
  m.delete_position(pos)

  console.log(res.get('battery'))




})




it.skip('regression != doesnt work', () => {

  let rules = `
fact fork
  alias a2a attacks2
  alias a2b attacks2
  .from = a2a.from
  .to = a2a.to
  a2a.from != a2b.from
`


  console.log(puzzles[502].link)
  let fen = puzzles[502].move_fens[0]
  let pos = m.create_position(fen)
  let res = relations(m, pos, rules)
  m.delete_position(pos)

  console.log(res.get('fork'))




})

it.skip('logs 500', () => {

    let rules1 = `

fact capture
    alias occupies2 occupies
     .from = attacks.from
     .to = attacks.to
     .piece = occupies.piece
     .piece2 = occupies2.piece
    attacks.from = occupies.square
    attacks.to = occupies2.square
    
legal capture_moves

idea exchange_queens
  alias recapture capture_moves
  line capture_moves recapture
  capture_moves.piece = Queen
  capture_moves.piece2 = Queen
  capture_moves.to = recapture.to



fact kick
  .from = push.from
  .to = push.to
  .to2 = push.to2
  .kicked = occupies.piece
  push.to2 = occupies.square


fact kick_knight
  .from = kick.from
  .to = kick.to
  kick.kicked = Knight

legal kick_knight_moves


fact protect_bishop
  alias covers attacks
  alias occ2 occupies
  .from = attacks.from
  .to = attacks.to
  occupies.piece = Rook
  covers.from = occupies.square
  attacks.to = covers.to
  attacks.from = occ2.square
  occ2.piece = Bishop

legal protect_bishop_moves

idea pawn_captures_piece
  line capture_moves
  capture_moves.piece = Pawn
  capture_moves.piece2 = Knight

idea exchange_and_kick
  line exchange_queens kick_knight_moves protect_bishop_moves pawn_captures_piece


fact capture_plus
    alias occupies2 occupies
    alias occupies3 occupies
    alias occupies4 occupies
    alias attacks2 attacks
    alias attacks3 attacks
     .from = attacks.from
     .to = attacks.to
     .piece = occupies.piece
     .piece2 = occupies2.piece
     .piece3 = occupies3.piece
     .piece4 = occupies4.piece
    attacks.from = occupies.square
    attacks.to = occupies2.square
    attacks2.from = attacks.to
    attacks2.to = occupies3.square
    attacks3.from = attacks2.to
    attacks3.to = occupies4.square
    
legal capture_plus_moves




idea sadf
  alias capture_checking capture_plus_moves
  alias counter_capture capture_plus_moves
  alias capture_with_check capture_moves
  line capture_checking counter_capture capture_with_check
  capture_checking.piece3 = Bishop
  capture_checking.piece4 = King
  counter_capture.capture2 = Queen
  capture_checking.capture2 = capture_with_check.to

`

  //let fen = 'r4rk1/1p1b1pbp/p2p2p1/2p5/2PN4/1P1RP2P/PB3PP1/R5K1 w - - 0 21'
  //solve_fen(fen, rules1, 'exchange_and_kick')
    //return

  console.log(skips.map(_ => puzzles[_].link))

  let patterns = ['capture_plus_moves']

  console.log(puzzles[502].link)
  let res = minmax_solve_loose(502, rules1, patterns)
  console.log(res)

})

it.skip('solves 502', () => {

    `
exchange_queens
kick_pinned_piece_on_hanging_bishop
defend_bishop
capture_pinned_piece
`

    let rules = `

fact capture
    alias occupies2 occupies
     .from = attacks.from
     .to = attacks.to
     .piece = occupies.piece
     .piece2 = occupies2.piece
    attacks.from = occupies.square
    attacks.to = occupies2.square
    
legal capture_moves

idea exchange_queens
  alias recapture capture_moves
  line capture_moves recapture
  capture_moves.piece = Queen
  capture_moves.piece2 = Queen
  capture_moves.to = recapture.to



fact kick
  .from = push.from
  .to = push.to
  .to2 = push.to2
  .kicked = occupies.piece
  push.to2 = occupies.square


fact kick_knight
  .from = kick.from
  .to = kick.to
  kick.kicked = Knight

idea exchange_and_kick
  line exchange_queens kick_knight
`

    console.log(puzzles[501].link)
    solve_n(501, rules, 'exchange_and_kick')
    //let fen = 'r4rk1/1p1b1pbp/p1pp2p1/8/2PN4/1P1RP2P/PB3PP1/R5K1 b - - 0 20'
    //solve_fen(fen, rules, 'kick_knight')
})

function solve_fen(fen: string, rules: string, column: string) {
  let pos = m.create_position(fen)
  let res = search3(m, pos, rules, [column])
  let res2 = dedup_sans(flat_san_moves_c(m, pos, res.get(column)!))
  console.log(res2)
  m.delete_position(pos)
  return res2
}

function solve_n(n: number, rules: string, column: string) {
  let link = puzzles[n].link
  console.log(link)
  let fen = puzzles[n].move_fens[0]

  //fen = '8/3Qnk1p/8/4B2b/Pp2p3/1P2P3/5PPP/2rR2K1 b - - 6 33'
  let pos = m.create_position(fen)
  let res = search3(m, pos, rules, [column])
  let res2 = dedup_sans(flat_san_moves_c(m, pos, res.get(column)!))
  console.log(res2)
  m.delete_position(pos)
  return res2
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




it.skip('works', () => {

    let rules = `
rook skewers queen and bishop
queen escapes skewer
rook captures bishop
queen recaptures
bishop pins queen to king
queen captures bishop
queen recaptures
`

 rules = 'rook skewers queen and bishop'

    //console.log(parse_program2(rules)[0])

    let fen = '2kr3r/1pp2p2/p2p3p/3P1bpB/2P2q2/1P6/P5PP/R2Q1R1K b - - 1 19'
    fen = '2kr3r/1pp2p2/p2p3p/3P1bpB/2P2q2/1P6/P5PP/R2Q1R1K b - - 1 19'
    let pos = m.create_position(fen)
    let res = search3(m, pos, rules)
    console.log(res)
})

let m = await PositionManager.make()
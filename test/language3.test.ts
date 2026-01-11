import { it } from 'vitest'
import { flat_san_moves_c, PositionManager ,  search3 } from '../src'
import { puzzles } from './fixture'

it.skip('logs 500', () => {

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

  console.log(skips.map(_ => puzzles[_].link))
})

it('solves 502', () => {

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
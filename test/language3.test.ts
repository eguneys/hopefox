import { it } from 'vitest'
import { fen_pos, flat_san_moves_c, make_move_from_to, makeSan, move_c_to_Move, MoveC, Position, PositionManager ,  relations,  search3 } from '../src'
import { puzzles } from './fixture'
import { minmax_solve_loose } from './world2.test'


it('regression hanging1 occupies', () => {
  let rules = `
fact hanging_piece 
  .on = hanging1.on 
  hanging1.on = occupies.square 
`.trim()


  console.log(puzzles[0].link)
  let fen = puzzles[0].move_fens[0]
  let pos = m.create_position(fen)
  let res = relations(m, pos, rules)
  m.delete_position(pos)

  console.log(res.get('hanging_piece'))



})


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




it.skip('regression between check block', () => {

  let rules = `
fact check
 alias occ occupies
 .from = attacks2.from
 .to = attacks2.to
 .to2 = attacks2.to2
 .piece = occupies.piece
 .to_piece = occ.piece
 attacks2.from = occupies.square
 attacks2.to2 = occ.square
 attacks2.from != attacks2.to2
 occupies.color != occ.color


fact check_king
 .from = check.from
 .to = check.to
 .to2 = check.to2
 .piece = check.piece
 check.to_piece = King

legal check_king_moves


fact blockable
  alias block attacks
  alias check check_king_moves
  .from = block.from
  .to = block.to
  block.to between check.to check.to2
`.trim()

  console.log(puzzles[0].link)
  let fen = puzzles[0].move_fens[0]
  let pos = m.create_position(fen)
  let res = relations(m, pos, rules)
  m.delete_position(pos)

  console.log(res.get('blockable'))



})





it.skip('regression 2 piece_a piece_b', () => {

  let rules = `

fact fork_a_b 
 alias a attacks2 
 alias b attacks2 
 alias occ_a occupies 
 alias occ_b occupies 
 .from = a.from 
 .to = a.to 
 .to_a = a.to2 
 .to_b = b.to2 
 .piece = occupies.piece 
 .piece_a = occ_a.piece 
 .piece_b = occ_b.piece 
 a.from = occupies.square 
 a.to2 = occ_a.square 
 b.to2 = occ_b.square 
 a.to2 != b.to2 
 a.from = b.from 
 a.to = b.to 
 occupies.color != occ_a.color 
 occupies.color != occ_b.color 
  
fact forks_king_queen 
 .from = forks_a_b.from 
 .to = forks_a_b.to 
 forks_a_b.piece_a = King 
 forks_a_b.piece_b = Queen 
`.trim()

  console.log(puzzles[skips[33]].link)
  let fen = puzzles[skips[33]].move_fens[0]
  let pos = m.create_position(fen)
  let res = relations(m, pos, rules)
  m.delete_position(pos)

  console.log(res.get('forks_a_b'))



})


it.skip('regression color != color doesnt work', () => {

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



it.skip('100 bench test', () => {

  let rules = `
  fact check
 alias occ occupies
 .from = attacks2.from
 .to = attacks2.to
 .to2 = attacks2.to2
 .piece = occupies.piece
 .to_piece = occ.piece
 attacks2.from = occupies.square
 attacks2.to2 = occ.square
 attacks2.from != attacks2.to2
 occupies.color != occ.color


fact check_king
 .from = check.from
 .to = check.to
 .to2 = check.to2
 .piece = check.piece
 check.to_piece = King


legal check_king_moves


idea check_blockable
  alias check check_king_moves
  alias block moves
  line check block
  block.to between check.to check.to2


idea check_capturable
  alias check check_king_moves
  alias capture moves
  line check capture
  capture.to = check.to


fact captures
 alias occ occupies
 .from = attacks.from
 .to = attacks.to
 attacks.from = occupies.square
 attacks.to = occ.square


legal captures_moves


idea solution1
 alias one check_blockable
 alias two check_capturable
 alias three captures_moves
 line one two three


idea solution2
 alias one check_king_moves
 line one


idea solution3
 alias one check_blockable
 alias two check_king_moves
 line one two 



idea capture_capturable
  alias one captures_moves
  alias two captures_moves
  line one two
  one.to = two.to



idea solution4
  alias one capture_capturable
  alias two captures_moves
  line one two
  one.to = two.to


fact fork_a_b
  alias occ_a occupies
  alias occ_b occupies
  alias fork_a attacks2
  alias fork_b attacks2
  .from = fork_a.from
  .to = fork_a.to
  .to_a = fork_a.to2
  .to_b = fork_b.to2
  .piece_a = occ_a.piece
  .piece_b = occ_b.piece
  fork_a.from = fork_b.from
  fork_a.to = fork_b.to
  fork_a.to2 != fork_b.to2
  fork_a.from = occupies.square
  fork_a.to2 = occ_a.square
  fork_b.to2 = occ_b.square
  occupies.color != occ_a.color
  occupies.color != occ_b.color


fact fork_king_and_b
  .from = fork_a_b.from
  .to = fork_a_b.to
  .to_b = fork_a_b.to_b
  .piece_b = fork_a_b.piece_b
  fork_a_b.piece_a = King


legal fork_king_and_b_moves

fact evade_piece
  .from = attacks.from
  .to = attacks.to
  .piece = occupies.piece
  attacks.from = occupies.square

fact evade_king
  .from = evade_piece.from
  .to = evade_piece.to
  evade_piece.piece = King

legal evade_king_moves


idea fork_evadable
 alias one fork_king_and_b_moves
 alias two evade_king_moves
 alias three captures_moves
 line one two three
 one.to_b = three.to

idea solution5
 line fork_evadable


idea liquidate
  alias one check_capturable
  alias two check_capturable
  line one two
  one.to = two.to


idea solution6
  line liquidate


idea check_mate
  alias one check_capturable
  alias two check_king_moves
  line one two

idea solution7
  line check_mate

idea check_mate2
  alias one check_capturable
  alias two check_blockable
  alias three check_king_moves
  line one two three


idea solution8
  line check_mate2


idea check_evadable
 alias check check_king_moves
 alias evade evade_king_moves
 line check evade


idea check_evade_mate
 alias one check_evadable
 alias two check_king_moves
 line one two


idea solution9
  line check_evade_mate
`

//solve_n2(0, rules)



console.log(bench(rules, skips0))

})

let skips0 = [
  28, 34, 39, 47, 48, 54, 56,      
  62, 65, 66, 67, 69, 70, 72,      
  75, 79, 80, 83, 84, 87, 92,      
  94
]

let skips01 = [
  48, 56, 62, 65, 66, 69,
  70, 72, 80, 83, 84, 87,
  92, 94
]

it.skip('100 bench skips0', () => {

  let rules = `

idea fork_king_blockable
  alias fork fork_king_and_b_moves
  alias block moves
  line fork block
  .to_b = fork.to_b
  block.to between fork.to fork.to_a


idea solution17
 alias one fork_king_blockable
 alias three captures_moves
 line one three
 one.to_b = three.to



idea solution16
  alias one capture_hanging_piece_moves
  alias two capture_exchange_moves
  alias three captures_moves
  line one two three
  two.to = three.to


legal capture_exchange_moves

fact capture_exchange
  alias occ occupies
  .from = captures.from
  .to = captures.to
  captures.from = occupies.square
  captures.to = occ.square
  occupies.piece = Bishop
  occ.piece = Rook


idea solution15
 alias one unpins_queen_capture_and_attacks2_queen_moves
 alias two capture_queen_moves
 alias three capture_queen_moves
 line one two three

idea solution14
  alias one unpins_queen_capture_and_attacks2_queen_moves
  alias two captures_moves
 line one two
 one.to = two.to

legal capture_queen_moves

fact unpins
  alias ato attacks_through
  alias at attacks
  alias occ occupies
  .from = at.from
  .to = at.to
  .unpin_from = ato.from
  .unpin_to = ato.to
  ato.block = at.from
  at.to != ato.from
  at.from = occupies.square
  ato.from = occ.square
  occupies.color != occ.color
 

fact unpins_capture
  .from = unpins.from
  .to = unpins.to
  captures.from = unpins.from
  captures.to = unpins.to

fact unpins_queen
  .from = unpins.from
  .to = unpins.to
  unpins.unpin_to = occupies.square
  occupies.piece = Queen

fact unpins_queen_capture
  .from = unpins_capture.from
  .to = unpins_capture.to
  unpins_capture.from = unpins_queen.from
  unpins_capture.to = unpins_queen.to


fact attacks2_queen
  .from = attacks2.from
  .to = attacks2.to
  attacks2.to2 = occupies.square
  occupies.piece = Queen


fact unpins_queen_capture_and_attacks2_queen
  .from = unpins_queen_capture.from
  .to = unpins_queen_capture.to
  unpins_queen_capture.from = attacks2_queen.from
  unpins_queen_capture.to = attacks2_queen.to
  
legal unpins_queen_capture_and_attacks2_queen_moves

idea solution13
 alias one unpins_queen_capture_and_attacks2_queen_moves
 alias two capture_queen_moves
 alias three capture_queen_moves
 line one two three

fact capture_queen
 .from = captures.from
 .to = captures.to
 captures.to = occupies.square
 occupies.piece = Queen

legal capture_queen_moves

idea solution
 alias one capture_hanging_piece_moves
 line one


legal push_moves


idea solution12
 alias one fork_king_and_b_moves
 alias two push_moves
 alias three captures_moves
 line one two three
 one.to_b = three.to

fact skewer_a_b
  alias occ occupies
  .from = attacks2_through.from
  .to = attacks2_through.to
  .to_a = attacks2_through.block
  .to_b = attacks2_through.to2
  attacks2_through.from = occupies.square
  attacks2_through.to2 = occ.square
  occupies.color != occ.color
  
fact skewer_king_and_piece
  alias occ occupies
  .from = skewer_a_b.from
  .to = skewer_a_b.to
  .to_b = skewer_a_b.to_b
  skewer_a_b.from = occupies.square
  skewer_a_b.to_a = occ.square
  occ.piece = King

legal skewer_king_and_piece_moves



idea solution11
 alias one skewer_king_and_piece_moves
 alias two evade_king_moves
 alias three captures_moves
 line one two three
 one.to_b = three.to
 

fact hanging_piece
  .square = hanging1.square
  hanging1.square = occupies.square

fact capture_hanging_piece
  .from = captures.from
  .to = captures.to
  captures.to = hanging_piece.square

legal capture_hanging_piece_moves



idea solution10
  alias one capture_hanging_piece_moves
  alias two fork_king_and_b_moves
  alias three captures_moves
  line one two three
  two.to_b = one.to
  three.to = two.to


fact check
 alias occ occupies
 .from = attacks2.from
 .to = attacks2.to
 .to2 = attacks2.to2
 .piece = occupies.piece
 .to_piece = occ.piece
 attacks2.from = occupies.square
 attacks2.to2 = occ.square
 attacks2.from != attacks2.to2
 occupies.color != occ.color


fact check_king
 .from = check.from
 .to = check.to
 .to2 = check.to2
 .piece = check.piece
 check.to_piece = King


legal check_king_moves


idea check_blockable
  alias check check_king_moves
  alias block moves
  line check block
  block.to between check.to check.to2


idea check_capturable
  alias check check_king_moves
  alias capture moves
  line check capture
  capture.to = check.to


fact captures
 alias occ occupies
 .from = attacks.from
 .to = attacks.to
 attacks.from = occupies.square
 attacks.to = occ.square


legal captures_moves


idea solution1
 alias one check_blockable
 alias two check_capturable
 alias three captures_moves
 line one two three


idea solution2
 alias one check_king_moves
 line one


idea solution3
 alias one check_blockable
 alias two check_king_moves
 line one two 



idea capture_capturable
  alias one captures_moves
  alias two captures_moves
  line one two
  one.to = two.to



idea solution4
  alias one capture_capturable
  alias two captures_moves
  line one two
  one.to = two.to


fact fork_a_b
  alias occ_a occupies
  alias occ_b occupies
  alias fork_a attacks2
  alias fork_b attacks2
  .from = fork_a.from
  .to = fork_a.to
  .to_a = fork_a.to2
  .to_b = fork_b.to2
  .piece_a = occ_a.piece
  .piece_b = occ_b.piece
  fork_a.from = fork_b.from
  fork_a.to = fork_b.to
  fork_a.to2 != fork_b.to2
  fork_a.from = occupies.square
  fork_a.to2 = occ_a.square
  fork_b.to2 = occ_b.square
  occupies.color != occ_a.color
  occupies.color != occ_b.color


fact fork_king_and_b
  .from = fork_a_b.from
  .to = fork_a_b.to
  .to_b = fork_a_b.to_b
  .piece_b = fork_a_b.piece_b
  fork_a_b.piece_a = King


legal fork_king_and_b_moves

fact evade_piece
  .from = attacks.from
  .to = attacks.to
  .piece = occupies.piece
  attacks.from = occupies.square

fact evade_king
  .from = evade_piece.from
  .to = evade_piece.to
  evade_piece.piece = King

legal evade_king_moves


idea fork_evadable
 alias one fork_king_and_b_moves
 alias two evade_king_moves
 alias three captures_moves
 line one two three
 one.to_b = three.to

idea solution5
 line fork_evadable


idea liquidate
  alias one check_capturable
  alias two check_capturable
  line one two
  one.to = two.to


idea solution6
  line liquidate


idea check_mate
  alias one check_capturable
  alias two check_king_moves
  line one two

idea solution7
  line check_mate

idea check_mate2
  alias one check_capturable
  alias two check_blockable
  alias three check_king_moves
  line one two three


idea solution8
  line check_mate2


idea check_evadable
 alias check check_king_moves
 alias evade evade_king_moves
 line check evade


idea check_evade_mate
 alias one check_evadable
 alias two check_king_moves
 line one two


idea solution9
  line check_evade_mate

`.trim()


  console.log(bench_only(rules, skips0))

})

it.skip('100 bench skips01', () => {

  let rules = `
`.trim()


  console.log(bench_only(rules, skips01))

})


it.skip('100 bench full from fixture', () => {

  let rules = rules01.trim() + '\n' + rules00.trim()


  let two = bench(rules, [], 100, 200)
  let three = bench(rules, [], 200, 300)
  let four = bench(rules, [], 300, 400)

  console.log('200 ' + `[${two.length}/100]`)
  console.log(two)
  console.log('300 ' + `[${three.length}/100]`)
  console.log(three)
  console.log('400 ' + `[${four.length}/100]`)
  console.log(four)
})


it.skip('100-200 bench skips0', () => {
  let rules = rules_200_skip0.trim()

  let skips = skips_200_0_44

  //let one = solve_n2(skips[0], rules)

  skips = skips_300_0_52

  let only = bench_only(rules, skips)

  console.log(only)
})


it('900-1000 bench skips0', () => {
  let rules = [rules00, rules01, rules_200_skip0].join('\n')

  let only = bench(rules, [], 900, 1000)

  console.log(only)
})




function solve_n2(n: number, rules: string) {
  let link = puzzles[n].link
  let fen = puzzles[n].move_fens[0]

  let lines: string[] = []
  //fen = '8/3Qnk1p/8/4B2b/Pp2p3/1P2P3/5PPP/2rR2K1 b - - 6 33'
  let pos2 = fen_pos(fen)
  let pos = m.create_position(fen)
  let res = relations(m, pos, rules)
  for (let [key, relation] of res.entries()) {
    if (key.includes('solution')) {
      let rows = relation.get_relation_starting_at_world_id(0).rows.map(row => {
        let aa = extract_line(row)

        let resaa = extract_sans(pos2, aa)
        if (resaa.length > 0) {
          lines.push(resaa.join(' '))
        }
      })

    }
  }
  m.delete_position(pos)


  let sans = puzzles[n].sans.join(' ')

  //console.log(lines, sans, lines.includes(sans))
  if (!lines.includes(sans)) {

    console.log(link)

    console.log(sans, 'expected got: ', lines)
    return false
  }

  return true

}


function extract_sans(pos: Position, aa: MoveC[]) {

  let resaa = []
  let p2 = pos.clone()
  for (let a = 0; a < aa.length; a++) {
    let move = move_c_to_Move(aa[a])
    resaa.push(makeSan(p2, move))
    p2.play(move)
  }
  return resaa
}

type Column = string
type Row = Map<Column, number>
function extract_line(row: Row) {
  let res = []
  for (let i = 1; i < 8; i++) {
    let key = i == 1 ? '' : i
    if (!row.has('from' + key)) {
      break
    }
    res.push(make_move_from_to(row.get('from' + key)!, row.get('to' + key)!))
  }
  return res
}

function bench_only(rules: string, skips: number[]) {
  let res = []
  for (let i = 0; i < skips.length; i++) {
    render(i + ':' + skips[i])
    if (!solve_n2(skips[i], rules)) {
      res.push(skips[i])
    }
  }
  return res
}

function bench(rules: string, skips: number[], start = 0, end = 100) {
  for (let i = start; i < end; i++) {
    if (skips.includes(i)) {
      continue
    }
    render('' + i)
    if (!solve_n2(i, rules)) {
      skips.push(i)
    }
  }
  return skips
}

import fs from 'fs'
import { rules00, rules01 } from './rules_100_skips0'
import { skips_200_0_44, skips_300_0_52 } from './skip_fixtures'
import { rules_200_skip0 } from './answer_fixtures'

function render(data: string) {
    fs.writeFileSync(__dirname + '/_output.txt', data)
}


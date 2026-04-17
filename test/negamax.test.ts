import { it } from 'vitest'
import { test_b_forks_kr_puzzles } from "./fixture"
import { match_rules, match_rules_all, PositionManager } from '../src'


    `
    if has_fork(bishop, bishop2, rook, king) then
       if king_evades(king, king_to) then
          if captures(bishop2, rook) then
              has_exchange_up
    `;

    `
    if has_fork_with_capture(bishop, queen, rook,  king) then
       if king_evades(king, null) then
          checkmate
    `;

    `
    if has_fork_with_capture(queen, pawn, rook, king) then
       if king_evades(king, null) then
          checkmate
    `;


    `
    if blocks_check(knight, rook, king) then
       if captures_with_check(rook, knight) then
          if captures(pawn, rook) then
             if checks(queen, queen_to, king) then
                if captures(queen, queen_to) then
                   if has_fork(bishop, bishop_to, queen_to, king) then
                      if captures(queen_to, bishop_to) then
                         material_gain
    `;




const rule_a = `
    if has_fork(bishop, bishop2, rook, king) then
       if king_evades(king, king2) then
          if captures(bishop2, rook_bishop3) then
`

const rule_b = `
   if has_fork_with_capture(bishop, queen, rook, king) then
      if king_evades(king, null) then
`

const rule_c = `
    if has_fork_with_capture(queen, pawn, rook, king) then
       if king_evades(king, null) then
`

const rule_d = `
    if has_fork_with_capture(bishop, pawn_bishop2, rook, king) then
      if captures(king, bishop2_king2) then
        if attacks_with_discovered_check(knight, knight2, queen, rook, king2) then
          if king_evades(king2, king3) then
            if captures(knight2, queen_knight3) then
`

const rule_e = `
    if attacks_hanging(queen, queen2, knight) then
      if evades(knight, knight2) then
        if captures(Knight, knight2_Knight2) then
          if captures(rook, Knight2_rook2) then
            if captures(queen2, rook2_queen3) then
`

const rule_f = `
    if captures(bishop, rook_bishop2) then
      if captures_with_check(rook21, knight_rook22, king) then
        if king_evades(king, king2) then
          if checks(rook22, rook23, king2) then
            if king_evades(king2, king3) then
`


let all_rules = `
if captures_with_check(bishop, rook_bishop2, king) then
   if captures(rook2, bishop2_rook3) then
      if pawn_push_promotes(pawn, rook2_queen) then

if has_fork(bishop, bishop2, rook, king) then
   if pawn_push_blocks_check(pawn, pawn2, bishop2, king) then
      if captures(bishop2, rook_bishop3) then

if has_fork(bishop, bishop2, rook, king) then
   if king_evades(king, king2) then
      if captures(bishop2, rook_bishop3) then

if has_fork_with_capture(bishop, queen_bishop2, rook, king) then
   if king_evades(king, null) then

if has_fork_with_capture(queen, pawn_queen2, rook, king) then
   if king_evades(king, null) then

if has_fork_with_capture(bishop, pawn_bishop2, rook, king) then
  if captures(king, bishop2_king2) then
    if attacks_with_discovered_check(knight, knight2, queen, rook, king2) then
      if king_evades(king2, king3) then
        if captures(knight2, queen_knight3) then

if attacks_hanging(queen, queen2, knight) then
  if evades(knight, knight2) then
    if captures(Knight, knight2_Knight2) then
      if captures(rook, Knight2_rook2) then
        if captures(queen2, rook2_queen3) then

if captures(bishop, rook_bishop2) then
  if captures_with_check(rook21, knight_rook22, king) then
    if king_evades(king, king2) then
      if checks(rook22, rook23, king2) then
        if king_evades(king2, king3) then
`


let m = await PositionManager.make()

let log_puzzles = test_b_forks_kr_puzzles
it('works', () => {

   let skips = [3]

   let single_i = -1
   single_i = 9

   if (single_i != -1) {
      solve_i(single_i)
      return
   }

   for (let i = 0; i < log_puzzles.length; i++) {
      if (skips.includes(i)) continue
      if (!solve_i(i)) {
         break
      }
   }
})


let single_rules = ''

single_rules = `
if captures_with_check(bishop, rook_bishop2, king) then
   if captures(rook2, bishop2_rook3) then
      if pawn_push_promotes(pawn, rook2_queen) then
`

//single_rules = ''

if (single_rules !== '') {
   all_rules = single_rules
}

function solve_i(i: number) {

    let fen = log_puzzles[i].move_fens[0]

    let pos = m.create_position(fen)
    let link = log_puzzles[i].link

    let solution = log_puzzles[i].sans

    let res = match_rules_all(m, pos, all_rules)
    if (match_solution(res, solution)) {
      return true
    } else {
       console.log(`${i} ${link}`)
       console.log(`Solution: ${solution.join(' ')}`)
       console.log(res)
       return false
    }
}

function match_solution(res: string[][], solution: string[]) {
   return res.some(_ => _.join(' ') === solution.join(' '))
}
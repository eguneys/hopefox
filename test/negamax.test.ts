import { it } from 'vitest'
import { test_b_forks_kr_puzzles } from "./fixture"
import { match_rules, match_rules_all, PositionManager } from '../src'

`
if has_fork(bishop, bishop2, rook, king) then
   if pawn_push_blocks_check(pawn, pawn2, bishop2, king) then
      if captures(bishop2, rook_bishop3) then

def has_fork(From, To, ForkA, ForkB)
  move(From, To) then
  attack(To, ForkA) and
  attack(To, ForkB)

def captures(From, Captured_To)
  capture(From, To, Captured)

def pawn_push_blocks_check(From, To, AttackFrom, AttackTo)
  attack(AttackFrom, AttackTo) and
  push(From, To) then
  attack_through(AttackFrom, AttackTo, To)


def king_evades(From, To)
  move(From, To) then
  attack(null, To)
`;

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
         if captures_with_check(queen2, pawn_queen3, king2) then
            if captures(rook4, queen3_rook5) then

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
    if attacks_with_discovered_check(knight, knight2, queen, rook3, king2) then
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

if captures_with_check(rook, rook20_rook2, king) then
   if captures(rook3, rook2_rook4) then
     if pawn_push_attacks(pawn, pawn2, bishop) then


if has_fork(bishop, bishop2, rook, king) then
  if captures(rook2, bishop2_rook3) then
    if checks(rook4, rook5, king) then
      if captures(king, rook5_king2) then
        if captures(pawn, rook3_pawn2) then

if captures_with_check(rook, rook20_rook2, king) then
  if captures(queen, rook2_queen2) then
     if captures(bishop, bishop20_bishop2) then
       if has_fork(knight, knight2, queen10, bishop2) then
         if defends_hanging(queen10, queen12, bishop2) then
           if captures(knight2, bishop2_knight3) then
             if captures(queen12, knight3_queen13) then

if captures(rook, knight_rook2) then
  if captures(rook3, rook2_rook4) then
    if has_fork_with_capture(bishop, pawn_bishop2, king, rook5) then
      if king_evades(king, king2) then
        if captures(bishop2, rook5_bishop3) then

if has_fork(bishop, bishop2, rook, king) then
   if king_evades(king, king2) then
      if captures(bishop2, rook_bishop3) then
        if checks(rook2, rook3, king10) then
          if king_evades(king10, king11) then

if has_fork(bishop, bishop2, rook, king) then
   if captures(knight, bishop2_knight2) then
     if has_fork(queen, queen2, king, knight2) then
       if king_evades(king, king2) then
         if checks(knight3, knight2_knight4, king2) then

if checks(queen, queen2, king) then
  if king_evades(king, null) then


if skewers(rook, rook2, queen, pawn) then
  if captures_with_check(pawn2, pawn3_pawn4, king) then
    if king_evades(king, king2) then

if has_fork(bishop, bishop2, rook, rook2) then
  if captures_with_check(rook2, pawn_rook3, king) then
    if captures(queen, rook3_queen2) then

if has_fork(bishop, bishop2, rook, king) then
   if king_evades(king, king2) then
      if captures(bishop2, rook_bishop3) then
        if captures(bishop10, pawn_bishop11) then
          if captures(bishop3, pawn2_bishop4) then

if captures(rook, bishop_rook2) then
  if captures(king, rook2_king2) then
    if checks(bishop2, bishop3, king2) then
      if pawn_push_blocks_check(pawn, pawn2, bishop3, king2) then
        if captures(bishop3, pawn2_bishop4) then

if has_fork(bishop, bishop2, king, rook) then
  if king_evades(king, null) then

if checks(rook, rook2, king) then
  if blocks(queen, queen2, rook2, king) then
    if captures_with_check(rook2, queen2_rook3, king) then
      if king_evades(king, null) then

if has_fork(bishop, bishop2, rook, king) then
   if king_evades(king, king2) then
      if captures(bishop2, rook_bishop3) then
        if captures(bishop10, bishop3_bishop11) then
          if captures(pawn, knight_pawn2) then

if attacks_with_capture(bishop, pawn_bishop2, rook) then
   if captures(rook2, bishop2_rook3) then
     if captures_hanging(bishop2, rook_bishop3) then
`


let m = await PositionManager.make()

let log_puzzles = test_b_forks_kr_puzzles
it('works', () => {

   let skips = [3]

   let single_i = -1
   //single_i = 23

   if (single_i != -1) {
      solve_i(single_i)
      return
   }

   let total = log_puzzles.length / 50
   let coverage: Coverage = { tp: 0, fp: 0, n: 0, log: [] }

   for (let i = 0; i < total; i++) {
      if (skips.includes(i)) continue
      let res = solve_i(i)
      merge_coverage(coverage, res)
   }

   log_coverage(coverage)
})

type Coverage = { tp: number, fp: number, n: number, log: string[] }
type PartialCoverage = { tp: number } | { fp: number, log: string } | { n: number }

function merge_coverage(c: Coverage, res: PartialCoverage) {
   if ((res as any).n === 1) {
      c.n += 1
   }
   if ((res as any).tp === 1) {
      c.tp += 1
   }
   if ((res as any).fp === 1) {
      c.fp += 1
      c.log.push((res as any).log)
   }
}

function log_coverage(c: Coverage) {
    let N = c.n
    let Tp = c.tp
    let Fp = c.fp
    let TpFp = Tp + Fp
    let Total = TpFp + N
    let C_percent: any = Math.round(TpFp / Total * 100)
    let A_percent: any = Math.round(Tp / TpFp * 100)
    if (isNaN(C_percent)) C_percent = '--'
    if (isNaN(A_percent)) A_percent = '--'
    console.log(`Coverage: %${C_percent} Accuracy: %${A_percent}`)
    console.log(`Tp/Fp: ${Tp}/${Fp} N: ${N}`)
    console.log('-----******----')
    console.log(c.log.slice(0, 3))
    console.log('-----*****----')
    console.log(`Coverage: %${C_percent} Accuracy: %${A_percent}`)
    console.log(`Tp/Fp: ${Tp}/${Fp} N: ${N}`)


}

let single_rules = ''

single_rules = `
if checks(rook, rook2, king) then
  if blocks(queen, queen2, rook2, king) then
`

single_rules = ''

if (single_rules !== '') {
   all_rules = single_rules
}

function solve_i(i: number) {

    let fen = log_puzzles[i].move_fens[0]

    let pos = m.create_position(fen)
    let link = log_puzzles[i].link

    let solution = log_puzzles[i].sans

    let res = match_rules_all(m, pos, all_rules)
    if (res.length === 0) {
      return { n: 1 }
    }
    if (match_solution(res, solution)) {
      return { tp: 1 }
    } else {
       let log = ''
       log += `${i} ${link}`
       log += `\n`
       log += `Solution: ${solution.join(' ')}`
       log += `\n`
       log += res
       return { fp: 1, log }
    }
}

function match_solution(res: string[][], solution: string[]) {
   return res.some(_ => _.join(' ') === solution.join(' '))
}
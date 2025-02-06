import { expect, it } from "vitest"
import { tenk } from "./fixture"
import { make_root, print_rules } from "../src"

it('00206 find_san7 checkmate', () => {

  let fen = tenk.find(_ => _.id === '00206')!.move_fens[0]

  let res = print_rules(make_root(fen, `
b =g4 +Q
 *
 =Q 5
  E a =Q
 =Q
 !=Q
 .
`))

  console.log(res)

})


it('04j1J find_san7 checkmate', () => {

  let fen = tenk.find(_ => _.id === '04j1J')!.move_fens[0]

  let res = print_rules(make_root(fen, `
b =g5 +Q +R
 *
 !=Q
  N +k
  E b =Q
 C !a =Q
 E a =Q
 .
`))

  console.log(res)

})


it('02YmM find_san7 checkmate', () => {

  let fen = tenk.find(_ => _.id === '02YmM')!.move_fens[0]

  let res = print_rules(make_root(fen, `
b =g5 +Q +R
 *
 !=Q
  N +k
  E b =Q
 C !a =Q
  O r +Q
  .
 E a =Q
 .
`))

  console.log(res)

})


it('01epa find_san7 checkmate', () => {

  let fen = tenk.find(_ => _.id === '01epa')!.move_fens[0]

  let res = print_rules(make_root(fen, `
b =B +K
 E =b
`))

  console.log(res)

})



it('03wAt find_san7 checkmate', () => {

  let fen = tenk.find(_ => _.id === '03wAt')!.move_fens[0]

  let res = print_rules(make_root(fen, `
b +K, q +Q
 *
 O q =Q
  *
  A q
`))

  console.log(res)

})

it('04h4k find_san7 checkmate', () => {

  let fen = tenk.find(_ => _.id === '04h4k')!.move_fens[0]

  let res = print_rules(make_root(fen, `
b +K, q +Q
 *
 O q =Q
  * 
  q =Q
   A q
  !q =Q
 O b =B
 O b =Q
 .
`))


  console.log(res)

})



it.only('idd', () => {

  let id = '03zaB'
  let fen = tenk.find(_ => _.id === id)!.move_fens[0]
  let res = print_rules(make_root(fen, `
b +Q
 *
 E !Q
 E b' +Q
  *
   b' +Q
    *
    E !Q
`))


  console.log(res)

})




it('04hwM find_san7 checkmate', () => {

  let fen = tenk.find(_ => _.id === '04hwM')!.move_fens[0]

  let res = print_rules(make_root(fen, `
b =g5 +Q +K
 *
 Q =b
 E b =Q
`))


  console.log(res)

})





it('00Y5Q find_san7 checkmate', () => {

  let fen = tenk.find(_ => _.id === '00Y5Q')!.move_fens[0]

  let res = print_rules(make_root(fen, `
b =g5 +Q +K
 *
 Q =b
 E b =Q 5
 .
`))


  console.log(res)

})


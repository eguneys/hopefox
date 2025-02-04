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



it.only('02YmM find_san7 checkmate', () => {

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


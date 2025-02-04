import { expect, it } from "vitest"
import { tenk } from "./fixture"
import { make_root, print_rules } from "../src"

it('00206 find_san7 checkmate', () => {

  let fen = tenk.find(_ => _.id === '00206')!.move_fens[0]

  let res = print_rules(make_root(fen, `
b =g4 +Q
 *
 =Q
  E a =Q
  .
 !=Q
 .
`))

  console.log(res)

})




it.only('04hwM find_san7 checkmate', () => {

  let fen = tenk.find(_ => _.id === '04hwM')!.move_fens[0]

  let res = print_rules(make_root(fen, `
b =g5 +Q +K
 *
 Q =b
 E b =Q
. 5
`))

  console.log(res)

})


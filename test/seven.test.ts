import { tenk } from "./fixture";
import { expect, it } from "vitest";
import { find_san7, make_root, print_rules } from "../src";


it.only('04hzb find_san7 shallow', () => {

    let fen = tenk.find(_ => _.id === '04hzb')!.move_fens[0]

    let res = print_rules(make_root(fen, `
b =d4 +K +R
 *b =R
`))
    console.log(res)
})

it('05Qlg  find_san7 shallow', () => {

    let fen = tenk.find(_ => _.id === '05Qlg')!.move_fens[0]

    let res = print_rules(make_root(fen, `
r =P
K =P
Q =B
b =B +K
 *b =R +K
 Q =b
  r =P
   *r =h1 #
   K =r
    n =R +K +Q
   Q =n
    n' =Q
     K =r
      n' =R
    `))

    console.log(res)
})



it('08OfC find_san6 shallow', () => {

    let fen = tenk.find(_ => _.id === '08OfC')!.move_fens[0]

    let res = print_rules(make_root(fen, `
r =P
K =P
Q =B
b =B +K
 *b =R +K
 Q =b
  r =P
   *r =h1 #
   K =r
    n =R +K +Q
   Q =n
    n' =Q
     K =r
      n' =R
    `))

    console.log(res)
})


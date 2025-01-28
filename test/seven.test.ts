import { tenk } from "./fixture";
import { expect, it } from "vitest";
import { find_san7, make_root, print_rules } from "../src";


it('059T6 find_san7 star rule', () => {

    let fen = tenk.find(_ => _.id === '059T6')!.move_fens[0]

    let res = print_rules(make_root(fen, `
b =d4 +K +R
 *b =R
`))
    console.log(res)
})



it('04hzb find_san7 shallow', () => {

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



it.only('08OfC find_san6 shallow', () => {

    let fen = tenk.find(_ => _.id === '08OfC')!.move_fens[0]

    let res = print_rules(make_root(fen, `
r =P
K =P
Q =B
b =B +K
 *b =J +K
 Q =b
  r =P
   *r =h1 #
   *n =Q
   K =r
    n =R +K +Q
   Q =n
    n' =Q
     *n =R
     *r =h8
     K =r
      n' =R
    `))

    console.log(res)
})


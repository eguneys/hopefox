import { tenk } from "./fixture";
import { expect, it } from "vitest";
import { find_san7 } from "../src";


it.only('08OfC find_san6 shallow', () => {

    let fen = tenk.find(_ => _.id === '08OfC')!.move_fens[0]

    let res = find_san7(fen, `
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
    `)

    console.log(res)
})


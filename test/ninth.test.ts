import { expect, it } from "vitest"
import { tenk } from "./fixture"
import { make_root, print_rules } from "../src"




it.only('01epa find_san7 checkmate', () => {

  let fen = tenk.find(_ => _.id === '01epa')!.move_fens[0]

  let res = print_rules(make_root(fen, `
b =h7
`))


  console.log(res)

})





it('004Ys find_san7 checkmate', () => {

    let fen = tenk.find(_ => _.id === '004Ys')!.move_fens[0]
    //fen = '7k/8/7K/8/8/8/8/8 w - - 0 1'
    fen = 'r4rk1/5p1p/p1n1p1p1/1pp3NP/3q1B2/7Q/P5P1/R3R1K1 w - - 4 20'
    //fen = 'r4rk1/5p1p/p1n1p1p1/1pp3NP/q7/4B2Q/P5P1/R3R1K1 w - - 1 22'

    /*
    let res = print_rules(make_root(fen, `
b =e3 +Q
 *a =Q
 K +h7, !G +h7
  *p =h6 +h7, q +h7
   *a =Q
   !Q =_ +h7
    q =h7 #
   !Q =_ +h7
    q =h7
     *q =h7 #
   !Q =_ +h7
    q =h5 +h7
     *q =h7 #
   Q =_ +h7
`))
*/

/*
  let res = print_rules(make_root(fen, `
b =e3 +Q
 K +h7, !G +h7
  *
   a =Q
   p =h6 +h7, q +h7
     !Q +h7
     Q +h7
`))
*/

  let res = print_rules(make_root(fen, `
b =e3 +Q
 K +h7, !G +h7
  *
   *
    a =Q
`))





console.log(res)

/*
    expect(res).toBe(` . <>
└─ b =e3 +Q <>
 └─ *p =g6 <>
  └─ *q =h7 # <bxa2 Qxh7#, bxc2 Qxh7#..1233>
`)
*/
    })


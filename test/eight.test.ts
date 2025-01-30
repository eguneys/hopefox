import { expect, it } from "vitest"
import { tenk } from "./fixture"
import { make_root, print_rules } from "../src"

it.only('00DTg find_san7 neg rule', () => {

    let fen = tenk.find(_ => _.id === '00DTg')!.move_fens[0]

    let res = print_rules(make_root(fen, `
b =h2 +K
 *q =Q
  ^A =q
`))

console.log(res)
    })



it('004Ys find_san7 checkmate', () => {

    let fen = tenk.find(_ => _.id === '004Ys')!.move_fens[0]

    let res = print_rules(make_root(fen, `
b =e3 +Q
 *p =Q
 *a =Q
 *p =g6
  *q =h7 #
  *p =f7 +K
  *a =Q
 r =f1 +Q
`))

console.log(res)
    })



it('004Ys find_san7 checkmate', () => {

    let fen = tenk.find(_ => _.id === '004Ys')!.move_fens[0]

    let res = print_rules(make_root(fen, `
b =e3 +Q
 *p =g6
  *q =h7 #
`))


    expect(res).toBe(` . <>
└─ b =e3 +Q <>
 └─ *p =g6 <>
  └─ *q =h7 # <>
`)
    })


it('004Ys find_san7 checkmate', () => {

    let fen = tenk.find(_ => _.id === '004Ys')!.move_fens[0]

    let res = print_rules(make_root(fen, `
b =e3 +Q
 *p =g6
`))


    expect(res).toBe(` . <>
└─ b =e3 +Q <>
 └─ *p =g6 <b3 axb3, b3 cxb3, b3 hxg6..45>
`)
    })



it('02vYV find_san7', () => {

    let fen = tenk.find(_ => _.id === '02vYV')!.move_fens[0]

    let res = print_rules(make_root(fen, `
b =B
 *k =Q
`))

    expect(res).toBe(` . <>
└─ b =B <>
 └─ *k =Q <Qxf7+ Kxf7>
`)
})

it('02vYV find_san7 checkmate', () => {

    let fen = tenk.find(_ => _.id === '02vYV')!.move_fens[0]

    let res = print_rules(make_root(fen, `
b =B
`))

    expect(res).toBe(` . <>
└─ b =B <Bxa3>
`)
})
import { expect, it } from "vitest"
import { tenk } from "./fixture"
import { make_root, print_rules } from "../src"

it('00Htd find_san7 = rule', () => {

    let fen = tenk.find(_ => _.id === '00Htd')!.move_fens[0]

    let res = print_rules(make_root(fen, `
b =N +K
 *q =Q
`))

console.log(res)
    })

it('00WnZ find_san7 = rule', () => {

    let fen = tenk.find(_ => _.id === '00WnZ')!.move_fens[0]

    let res = print_rules(make_root(fen, `
b =b4 +N
 *b =R
 *k =R
 *r =R
 *p =R
 *b =N
  =b
`))

console.log(res)
    })



it('00BSo find_san7 = rule', () => {

    let fen = tenk.find(_ => _.id === '00BSo')!.move_fens[0]

    let res = print_rules(make_root(fen, `
b =b4 +N
 *b =R
 *k =R
 *r =R
 *p =R
 *b =N
  =b
`))

console.log(res)
    })



it('00KUa find_san7 = rule', () => {

    let fen = tenk.find(_ => _.id === '00KUa')!.move_fens[0]

    let res = print_rules(make_root(fen, `
b =f4 +Q
 *b =Q
 *n =Q
 *p =Q
 *a =N
 B =b4 +K
 .
`))

console.log(res)
    })



it('00VNr find_san7 = rule', () => {

    let fen = tenk.find(_ => _.id === '00VNr')!.move_fens[0]

    let res = print_rules(make_root(fen, `
b =b4 +N
 *b =R
 *k =R
 *r =R
 *b =N
  =b
`))

console.log(res)
    })



it('00206 find_san7 neg rule', () => {

    let fen = tenk.find(_ => _.id === '00206')!.move_fens[0]

    let res = print_rules(make_root(fen, `
b =g4 +Q
 *b =Q
 *q =Q
`))

console.log(res)
    })



it('00UV8 find_san7 neg rule', () => {

    let fen = tenk.find(_ => _.id === '00UV8')!.move_fens[0]

    let res = print_rules(make_root(fen, `
b =N
 *b =a1
`))

console.log(res)
    })



it('00DTg find_san7 neg rule', () => {

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



it.only('004Ys find_san7 checkmate', () => {

    let fen = tenk.find(_ => _.id === '004Ys')!.move_fens[0]
    //fen = '7k/8/7K/8/8/8/8/8 w - - 0 1'
    fen = 'r4rk1/5p1p/p1n1p1p1/1pp3NP/3q1B2/7Q/P5P1/R3R1K1 w - - 4 20'
    //fen = 'r4rk1/5p1p/p1n1p1p1/1pp3NP/q7/4B2Q/P5P1/R3R1K1 w - - 1 22'

    let res = print_rules(make_root(fen, `
b =e3 +Q
 *r =Q
 *b =Q
 *p =h6 +h7, q +h7
  *r =Q
  *k =Q
  *q =Q
  ^Q =_ +h7
   q =h7 #
  ^Q =_ +h7
  .
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
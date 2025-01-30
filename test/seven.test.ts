import { tenk } from "./fixture";
import { describe, expect, it } from "vitest";
import { find_san7, make_root, print_rules } from "../src";


it.only('004Ys find_san7 checkmate', () => {

    let fen = tenk.find(_ => _.id === '004Ys')!.move_fens[0]

    let res = print_rules(make_root(fen, `
b =e3 +Q
 *p =g6
  *q =h7 #
  *p =f7 +K
  *a =Q
`))
    console.log(res)
})



it('002VP find_san7 checkmate', () => {

    let fen = tenk.find(_ => _.id === '002VP')!.move_fens[0]

    let res = print_rules(make_root(fen, `
b =f2 +K
 *b =g3 #
`))
    console.log(res)
})



it('001om find_san7 no missing', () => {

    let fen = tenk.find(_ => _.id === '001om')!.move_fens[0]

    let res = print_rules(make_root(fen, `
b =f2 +K
 *b =g3 #
`))
    console.log(res)
})



it('0F4jA find_san7 no missing', () => {

    let fen = tenk.find(_ => _.id === '0F4jA')!.move_fens[0]

    let res = print_rules(make_root(fen, `
b =N
 *b =a1
 B =b
  q =B
   *q =a1
`))
    console.log(res)
})



it('0009B find_san7 no missing', () => {

    let fen = tenk.find(_ => _.id === '0009B')!.move_fens[0]

    let res = print_rules(make_root(fen, `
b =N
 *b =a1
 B =b
  q =B
`))
    console.log(res)
})

describe.skip('find_san7', () => {

    it('0598v  find_san7 star rule', () => {

        let fen = tenk.find(_ => _.id === '0598v')!.move_fens[0]

        let res = print_rules(make_root(fen, `
b =d4 +R +Q
 *b =Q
 *b =R
 *a =Q
`))
        console.log(res)
    })



    it('05siy  find_san7 star rule', () => {

        let fen = tenk.find(_ => _.id === '05siy')!.move_fens[0]

        let res = print_rules(make_root(fen, `
b =d4 +R +Q
 *b =Q
 *b =R
 *n =Q
`))
        console.log(res)
    })




    it('053LP  find_san7 star rule', () => {

        let fen = tenk.find(_ => _.id === '053LP')!.move_fens[0]

        let res = print_rules(make_root(fen, `
b =d4 +J' +J
 *b =J
 *b =J'
`))
        console.log(res)
    })



    it('04j1J find_san7 star rule', () => {

        let fen = tenk.find(_ => _.id === '04j1J')!.move_fens[0]

        let res = print_rules(make_root(fen, `
b =d4 +J' +J
 *b =J
 *b =J'
`))
        console.log(res)
    })


    it('05zkW find_san7 shallow', () => {

        let fen = tenk.find(_ => _.id === '05zkW')!.move_fens[0]

        let res = print_rules(make_root(fen, `
b =d4 +K +J
 *b =J
 *a =J
 *q =b
`))
        console.log(res)
    })

    it('02vYV find_san7 shallow', () => {

        let fen = tenk.find(_ => _.id === '02vYV')!.move_fens[0]

        let res = print_rules(make_root(fen, `
b =B
 *b =a1
 *k =Q
`))
        console.log(res)
    })


    it('0009B find_san7 shallow', () => {

        let fen = tenk.find(_ => _.id === '0009B')!.move_fens[0]

        let res = print_rules(make_root(fen, `
b =d4 +K +M
 *b =M
`))
        console.log(res)
    })


    it('00bWA find_san7 shallow', () => {

        let fen = tenk.find(_ => _.id === '00bWA')!.move_fens[0]

        let res = print_rules(make_root(fen, `
b =g5 +Q
 *b =Q
 *j =Q
 *p =Q
 *q =N
`))
        console.log(res)
    })

    it('0Adqg find_san7 shallow', () => {

        let fen = tenk.find(_ => _.id === '0Adqg')!.move_fens[0]

        let res = print_rules(make_root(fen, `
b =g5 +J +J'
`))
        console.log(res)
    })



    it('0ESw3 find_san7 shallow', () => {

        let fen = tenk.find(_ => _.id === '0ESw3')!.move_fens[0]

        let res = print_rules(make_root(fen, `
b =g5 +K +R
`))
        console.log(res)
    })

    it('00Ahb  find_san7 shallow', () => {

        let fen = tenk.find(_ => _.id === '00Ahb')!.move_fens[0]

        let res = print_rules(make_root(fen, `
n =f3 +K +N
B =N
b =N
`))
        console.log(res)
    })

    it('0CL0K  find_san7 shallow', () => {

        let fen = tenk.find(_ => _.id === '0CL0K')!.move_fens[0]

        let res = print_rules(make_root(fen, `
b =d4 +J +M
 *b =M
 *b =J
`))
        console.log(res)
    })

    it('0DXRX  find_san7 shallow', () => {

        let fen = tenk.find(_ => _.id === '0DXRX')!.move_fens[0]

        let res = print_rules(make_root(fen, `
b =d5 +Q +N
 *b =Q
 *b =N
  *b =a1
 *q =N
 *q =Q
`))
        console.log(res)
    })



    it('00Ahb find_san7 shallow', () => {

        let fen = tenk.find(_ => _.id === '00Ahb')!.move_fens[0]

        let res = print_rules(make_root(fen, `
b =N
 *q =R
`))
        console.log(res)
    })


    it('0092V find_san7 ^ rule', () => {

        let fen = tenk.find(_ => _.id === '0092V')!.move_fens[0]

        let res = print_rules(make_root(fen, `
b =B
 *b =a1
 ^P =q
`))
        console.log(res)
    })




    it('03rxc find_san7 shallow', () => {

        let fen = tenk.find(_ => _.id === '03rxc')!.move_fens[0]

        let res = print_rules(make_root(fen, `
p =Q
N =b
b =a4 +K
 *p =Q
`))
        console.log(res)
    })




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
b =d4 +K +J
 *b =J
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

})
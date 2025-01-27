import { tenk } from "./fixture";
import { expect, it } from "vitest";
import { find_san6 } from "../src";


it.only('04imJ find_san6 shallow', () => {

    let fen = tenk.find(_ => _.id === '04imJ')!.move_fens[0]

    expect(find_san6(fen, `
R =r
b =N
 *r =B
 *b' =B
 *b =R
 *r =R
    `)).toBe('Bxd6')
})


it('05B1i find_san6 deeper', () => {

    let fen = tenk.find(_ => _.id === '05B1i')!.move_fens[0]

    expect(find_san6(fen, `
q =R
N =R
b =N
 *q =R
  ^ =q
 R =e4 /d4+q
  b =d4
 *b =d4
 *k =Q
`)).toEqual('Bxf6')


    expect(find_san6(fen, `
q =R
N =R
b =N
 q =R
`)).toBeUndefined()

})


it('05B1i find_san6', () => {

    let fen = tenk.find(_ => _.id === '05B1i')!.move_fens[0]

    expect(find_san6(fen, `
q =R
N =R
b =N
`)).toEqual('Bxf6')


    expect(find_san6(fen, `
q =R
`)).toEqual('Qxe8+')

    expect(find_san6(fen, `
q =R
N =R
`)).toEqual('Nxe8')



})



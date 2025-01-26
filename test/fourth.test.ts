import { tenk } from "./fixture";
import { expect, it } from "vitest";
import { find_san4 } from "../src";

it('01DBx find_san4', () => {

    let fen = tenk.find(_ => _.id === '01DBx')!.move_fens[0]

    expect(find_san4(fen, `
q =a4
q =a4 +M
q =a4 +M'

`)).toEqual('Qg5')
})



it('0BkA9 find_san4', () => {

    let fen = tenk.find(_ => _.id === '0BkA9')!.move_fens[0]

    expect(find_san4(fen, `
q =a4
q =a4 +K
q =a4 +M

 q =M
`)).toEqual('Qxc3+')
})



it('00iAF find_san4', () => {

    let fen = tenk.find(_ => _.id === '00iAF')!.move_fens[0]

    expect(find_san4(fen, `
q =a4
q =a4 +K
q =a4 +R

 q =R
`)).toEqual('Qb8+')
})


it('00143 find_san4', () => {

    let fen = tenk.find(_ => _.id === '00143')!.move_fens[0]

    expect(find_san4(fen, `
q =h5
q =h5 +h7.K
b =h7
q =h5 +B
`)).toEqual('Qh5')
})
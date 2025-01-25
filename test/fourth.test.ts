import { tenk } from "./fixture";
import { expect, it } from "vitest";
import { find_san4 } from "../src";

it('00143 find_san4', () => {

    let fen = tenk.find(_ => _.id === '00143')!.move_fens[0]

    expect(find_san4(fen, `
q =h5
q =h5 +h7.K
b =h7
q =h5 +B
`)).toEqual('Qh5')
})
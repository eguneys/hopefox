import { it, expect } from 'vitest'
import { hopefox } from '../src'


it('backrank reverse', () => {

    let res = hopefox("4R1k1/5ppp/r1p5/p1n2P2/8/2P2N1P/2P3P1/6K1 b - - 0 23", "OoOoOofnfnfnFoFoFo")

    expect(res).toBe(true)

})

it('works', () => {

    let res = hopefox("6k1/8/8/8/8/8/5PPP/2r3K1 w - - 0 1", "FoFoFornrnrnOoOoOo")

    expect(res).toBe(true)

})
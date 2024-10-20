import { it, expect } from 'vitest'
import { hopefox } from '../src'

let backrank70 = "FoFoFofnfnfnOoOoOo"

it('backrank70 exception1', () => {

    let res = hopefox("8/2k2p1p/pp2pN2/2p5/8/6P1/PPP1nPRP/1K1r4 w - - 3 25", backrank70)
    expect(res).toBe(true)
})

it('backrank reverse', () => {

    let res = hopefox("4R1k1/5ppp/r1p5/p1n2P2/8/2P2N1P/2P3P1/6K1 b - - 0 23", "OoOoOofnfnfnFoFoFo")
    expect(res).toBe(true)

})

it('works', () => {

    let res = hopefox("6k1/8/8/8/8/8/5PPP/2r3K1 w - - 0 1", "FoFoFornrnrnOoOoOo")

    expect(res).toBe(true)

})
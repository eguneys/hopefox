import { it } from 'vitest'
import { mor_nogen, Position, PositionManager } from '../src'
import { a } from 'vitest/dist/chunks/suite.BMWOKiTe.js'
import { set_m } from '../src/mor3_hope1'

set_m(await PositionManager.make())
it('works', () => {

    let fen = '6k1/p3b2p/1p1pP3/2P3P1/2np3B/P6P/3Q3K/8 b - - 0 38'

    let a = `
E q= =R z+
`



    console.log(mor_nogen(a, fen))
})
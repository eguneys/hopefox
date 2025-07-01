import { it } from 'vitest'
import { mor_nogen, Position, PositionManager } from '../src'
import { a } from 'vitest/dist/chunks/suite.BMWOKiTe.js'
import { set_m } from '../src/mor3_hope1'

set_m(await PositionManager.make())
it('works', () => {

    let fen = 'r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2b1/PqP3PP/7K w - - 0 25'

    let b = `

`

    let a = `
E r= =R
`

    console.log(mor_nogen(a, fen))
})
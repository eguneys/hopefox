import { it } from 'vitest'
import { mor_nogen, mor_nogen_find_san, Position, PositionManager } from '../src'
import { a } from 'vitest/dist/chunks/suite.BMWOKiTe.js'
import { set_m } from '../src/mor3_hope1'

set_m(await PositionManager.make())
it('works', () => {

    let fen = 'r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2b1/PqP3PP/7K w - - 0 25'

    let b = `

`

    let a = `
E r= =R Z+
`

    console.log(mor_nogen(a, fen))
    console.log(mor_nogen_find_san(a, fen))

    let fen2 = '5rk1/1p3ppp/pq1Q1b2/8/8/1P3N2/P4PPP/3R2K1 b - - 3 27'

    console.log(mor_nogen(a, fen2))
    console.log('|', mor_nogen_find_san(a, fen2), '|')
})
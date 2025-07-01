import { it } from 'vitest'
import { mor_nogen, mor_nogen_find_san, Position, PositionManager } from '../src'
import { a } from 'vitest/dist/chunks/suite.BMWOKiTe.js'
import { set_m } from '../src/mor3_hope1'

set_m(await PositionManager.make())
it.skip('works', () => {

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


it.skip('+K', () => {

    let fen = '7k/p5pp/2r2q2/2p4Q/8/8/P5PP/3r1R1K w - - 0 30'

    let a = `
E q= +K
`

    console.log(mor_nogen(a, fen))
    console.log(mor_nogen_find_san(a, fen))


    let fen2 = 'r1bq3r/pp1nbkp1/2p1p2p/8/2BP4/1PN3P1/P3QP1P/3R1RK1 w - - 0 20'

    let b = `
E q= +K K+
 `

    console.log(mor_nogen(b, fen2))
    console.log(mor_nogen_find_san(b, fen2))

    let fen3 = '5rk1/1q3r2/3p2pQ/3p4/3B4/2P2P2/P5PP/6K1 w - - 0 31'

    let c = `
E q= +K K+ b+
 `

    console.log(mor_nogen(c, fen3))
    console.log(mor_nogen_find_san(c, fen3))


})



it.skip('mate in 2', () => {

    let fen = 'q5nr/1ppknQpp/3p4/1P2p3/4P3/B1PP1b2/B5PP/5K2 w - - 1 18'

    let a = `
E b= +K q+ K+
 A
  E q= #
 `

    console.log(mor_nogen(a, fen))
    console.log(mor_nogen_find_san(a, fen))


})


it('resolve children', () => {

    /*
    let fen = 'r1bq3r/pp1nbkp1/2p1p2p/8/2BP4/1PN3P1/P3QP1P/3R1RK1 w - - 0 20'

    let a = `
E b= +K q+ K+
 A
  E q= #
 `

    console.log(mor_nogen(a, fen))
    console.log(mor_nogen_find_san(a, fen))
    */


    let fen2 = 'r4rk1/pbpp2p1/1p4Qp/3Nn3/3q1N2/3B4/PP3PPP/5RK1 w - - 6 21'

    let b = `
E n2= +K z+ 5
 A 5
  E q= K+ b+
 `

    console.log(mor_nogen(b, fen2))
    console.log(mor_nogen_find_san(b, fen2))

})
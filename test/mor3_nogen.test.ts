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


it.skip('resolve children', () => {

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
E n2= +K 5
 A 5
  E q= K+ b+ #
 `

    console.log(mor_nogen(b, fen2))
    console.log(mor_nogen_find_san(b, fen2))

})



it.skip('G precessor', () => {

    let fen = 'rnb2r2/pp3k2/4p2p/3p4/3P4/PPqB2QP/5PP1/R4RK1 w - - 2 23'

    let a = `
G Q Z+
 E b=
`

    console.log(mor_nogen(a, fen))
    console.log(mor_nogen_find_san(a, fen))

    let b = `
G Q Z+
 E b= +K q+|Q
`

    console.log(mor_nogen(b, fen))
    console.log(mor_nogen_find_san(b, fen))

    let fen3 = 'r1bq3r/pp1nbkp1/2p1p2p/8/2BP4/1PN3P1/P3QP1P/3R1RK1 w - - 0 20'

    console.log(mor_nogen(b, fen3))
    console.log(mor_nogen_find_san(b, fen3))


})




it.skip('Q- operator', () => {

    let fen = 'r4rk1/pp2b1pp/2n2p2/4p3/8/2qB1QB1/P4P1P/R3R1K1 w - - 0 19'

    let a = `
G Q Z+
 E b= +K q+|Q Q-
 `

    console.log(mor_nogen(a, fen))
    console.log(mor_nogen_find_san(a, fen))


})

it.skip('q+/a q+/b/n', () => {
    let fen = 'r3k2r/ppq1bppp/4pn2/2Ppn3/1P4bP/2P2N2/P3BPP1/RNBQ1RK1 w kq - 3 11'

    let a = `
G B N+ N2+ b2+/n2 q+/b2/n2
 `

    console.log(mor_nogen(a, fen))
    console.log(mor_nogen_find_san(a, fen))
})

it.skip('more pawns', () => {
    let fen = '7Q/2p5/1p2prp1/p4k1p/q4p1P/8/6RK/8 w - - 0 38'

    let a = `
E q= +K Z+
 `

    console.log(mor_nogen(a, fen))
    console.log(mor_nogen_find_san(a, fen))
})




it.skip('more G comma', () => {
    let fen = 'r2qk1nr/ppp3pp/2n5/1B1p4/1b1Pp3/5Q1P/PP1B1PP1/RN2K2R w KQkq - 0 12'

    let a = `
G B N+ b+, K b2+/N, P +q
 E b= =B
 `

    console.log(mor_nogen(a, fen))
    console.log(mor_nogen_find_san(a, fen))
})




it.skip('nested regression', () => {
    let fen = 'r2qk1nr/ppp3pp/2n5/1B1p4/1b1Pp3/5Q1P/PP1B1PP1/RN2K2R w KQkq - 0 12'

    let a = `
G B N+ b+, K b2+/N, P +q
 E b= =B
  A
   G P= =q
   .
 `

    console.log(mor_nogen(a, fen))
    console.log(mor_nogen_find_san(a, fen))
})



it.skip('+Q/K', () => {
    let fen = '8/7Q/3p1kp1/1p6/2b5/2q4P/5PPK/8 w - - 0 37'

    let a = `
G Q Z+
 E q= +K +Q/K
 `

    console.log(mor_nogen(a, fen))
    console.log(mor_nogen_find_san(a, fen))
})



it('A regression', () => {
    let fen = 'r1b3k1/pp3Rpp/3p1b2/2pN4/2P5/5Q1P/PPP3P1/4qNK1 w - - 1 22'

    let a = `
E n2= +K
 A
  E q= K+ b+ #
 `

    console.log(mor_nogen(a, fen))
    console.log(mor_nogen_find_san(a, fen))
})



it.skip('r+ regression', () => {
    let fen = '3k2q1/p2p3p/1p1P4/2p5/2P2Q1K/8/P5b1/5R2 w - - 3 37'

    let a = `
E q= +K +Q r+
 `

    console.log(mor_nogen(a, fen))
    console.log(mor_nogen_find_san(a, fen))
})

it.skip('q # regression', () => {
    let fen = '8/5p2/pq5p/1p6/6k1/6P1/P6P/2Q4K w - - 0 37'

    let a = `
E q= +K
 A
  E q= #
 `

    console.log(mor_nogen(a, fen))
    console.log(mor_nogen_find_san(a, fen))
})



it.only('G b+/n regression', () => {
    let fen = 'r3k2r/ppq1bppp/4pn2/2Ppn3/1P4bP/2P2N2/P3BPP1/RNBQ1RK1 w kq - 3 11'

    let a = `
G B N+ N2+ b2+/n2 q+/b2/n2
 E n2= =N
 `

    console.log(mor_nogen(a, fen))
    console.log(mor_nogen_find_san(a, fen))
})



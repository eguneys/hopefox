import { expect, it } from 'vitest'
import { find_san_mor, mor3, PositionManager, set_m } from '../src'
import { tenk } from './fixture'
import { a } from 'vitest/dist/chunks/suite.BMWOKiTe.js'
import { describe } from 'node:test'

set_m(await PositionManager.make())

it.skip('regress zero defender', () => {

    //let fen = '8/8/kp6/p4pQp/q7/7P/3r2P1/4R2K w - - 0 49'
    //let fen = '5rk1/1p3ppp/pq1Q1b2/8/8/1P3N2/P4PPP/3R2K1 b - - 3 27'
    let fen = '6k1/p3b2p/1p1pP3/2P3P1/2np3B/P6P/3Q3K/8 b - - 0 38'

    let a = `
E q= =R z+
`

    console.log(mor3(a, fen))
    console.log(find_san_mor(fen, a))

})

it.skip('regress', () => {

    let fen = '5rk1/1p2p2p/p2p4/2pPb2R/2P1P3/1P1BKPrR/8/8 w - - 5 31'

    let a = `
E r= =R
 A
`

    console.log(mor3(a, fen))
    console.log(find_san_mor(fen, a))

})

it.skip('regress', () => {

    let fen = '2r3k1/p4pp1/Qq2p2p/b1Np4/2nP1P2/4P1P1/5K1P/2B1N3 w - - 4 34'

    let a = `
E q=
 `

    console.log(mor3(a, fen))

    console.log(find_san_mor(fen, a))

})


it.skip('more forks', () => {

    let b = `
E b= +K +R
 A
  G K= =b
  E b= =R
`

'https://lichess.org/training/0FH3l'
    let a = `
E b= +K +R
 A 
  G K= =b
  E b= =R
  G K= 5
`

    expect(mor3(a)).toBe('')
    //expect(mor3(a, ['k', 'K', 'r'], '8/8/8/8/8/8/R7/k1K5 w - - 0 1')).toBe('')
})




it.skip('mate finds', () => {

    let a = `
E r= #
`

    expect(mor3(a)).toBe('')
    //expect(mor3(a, ['k', 'K', 'r'], '8/8/8/8/8/8/R7/k1K5 w - - 0 1')).toBe('')
})

it.skip('nests 2', () => {

    'https://lichess.org/training/08lX9'
    let b = `
E b= +Q 0-
 A
  E q=f7 +K R+ K+ b+
   A
    E q= =R #
    E r= #
  q +f7
   E r= =Q
   E b= =Q
   Z Q= +R
`

let a = `
E b= +Q 0-
 A
  E q=f7 +K R+ K+ b2+
   A
    E r= #
    E q= =R #
`

    expect(mor3(a)).toBe('')
})



it.skip('nests', () => {

 let b = `
G B 0+ 0-
 E b= +B r+|Q
  A
   E =Q
   E b= =B 0+
   Z Q= +B
`

let a = `
E b= +B r+|Q
 A
  E b= =B 0+
  E =Q
`

    expect(mor3(a)).toBe('')
})

it.skip('works', () => {


    let fen = tenk.find(_ => _.id === '00GYk')!.move_fens[0]

    let b = `
https://lichess.org/training/00GYk
E b= +Q +R/Q
 A
 E =Q
 E b= =R 0+
`


    let a1 = `
E b=
`

    let a = `
E b= +Q +R/Q
`

    expect(mor3(a)).toBe('')
})
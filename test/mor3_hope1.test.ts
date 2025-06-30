import { expect, it } from 'vitest'
import { mor3 } from '../src'
import { tenk } from './fixture'


it('more forks', () => {

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

    expect(mor3(a, ['k', 'K', 'b'])).toBe('')
    //expect(mor3(a, ['k', 'K', 'r'], '8/8/8/8/8/8/R7/k1K5 w - - 0 1')).toBe('')
})




it.skip('mate finds', () => {

    let a = `
E r= #
`

    expect(mor3(a, ['k', 'K', 'r'])).toBe('')
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

    expect(mor3(a, ['k', 'K', 'b', 'Q', 'q', 'R', 'b2', 'q'])).toBe('')
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

    expect(mor3(a, ['k', 'K', 'b', 'B', 'r', 'Q'])).toBe('')
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

    expect(mor3(a, ['b', 'Q', 'R'])).toBe('')
})
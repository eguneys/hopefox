import { expect, it } from 'vitest'
import { mor3 } from '../src'
import { tenk } from './fixture'


it.skip('nests 2', () => {

    'https://lichess.org/training/08lX9'
    let a = `
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

    expect(mor3(a)).toBe('')
})



it.only('nests', () => {

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
  E =Q
  E b= =B 0+
  Z Q= +B
`

    expect(mor3(a)).toBe('')
})

it('works', () => {


    let fen = tenk.find(_ => _.id === '00GYk')!.move_fens[0]

    let b = `
https://lichess.org/training/00GYk
E b= +Q +R/Q
 A
 E =Q
 E b= =R 0+
`


    let a1 = `
E b= +Q +R
`

    let a = `
E b= +R/Q
`

    expect(mor3(a)).toBe('')
})
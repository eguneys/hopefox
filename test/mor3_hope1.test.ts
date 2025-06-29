import { expect, it } from 'vitest'
import { mor3 } from '../src'
import { tenk } from './fixture'


it('nests 2', () => {

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
  E q=f7 +K R+ K+ b+
   A
    E q= =R
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
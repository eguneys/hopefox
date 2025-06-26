import { expect, it } from 'vitest'
import { mor3 } from '../src'
import { tenk } from './fixture'


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
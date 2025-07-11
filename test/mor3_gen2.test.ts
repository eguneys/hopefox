
import { it } from 'vitest'
import { set_m } from '../src/mor3_hope1'
import { mor_gen2, PositionManager } from '../src'

set_m(await PositionManager.make())

it('works', () => {
    let b = `
G Q Z+
 E q= +K +Q/K
 `

    let a = `
G Q n+
`



    console.log(mor_gen2(a))
})
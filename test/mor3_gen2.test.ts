
import { it } from 'vitest'
import { set_m } from '../src/mor3_hope1'
import { mor_gen2, PositionManager } from '../src'

set_m(await PositionManager.make())

it.skip('works', () => {
    let b = `
G Q Z+
 E q= +K +Q/K
 `

    let a = `
G Q n+
`

    console.log(mor_gen2(a))


    let c = `
G Q +n
`

    console.log(mor_gen2(c))
})


it.skip('G ,', () => {
    let b = `
G Q Z+
 E q= +K +Q/K
 `

    let a = `
G Q n+, b +Q +n
`

    console.log(mor_gen2(a))


    let c = `
G Q n+, b +Q
`

    console.log(mor_gen2(c))
})


it.only('G E', () => {
    let b = `
G Q Z+
 E q= +K +Q/K
 `

    let a = `
G Q Z+
 E q= +K +Q/K
`

    console.log(mor_gen2(a))
})
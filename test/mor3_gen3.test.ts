import { it } from 'vitest'
import { mor_gen3 } from '../src'

it.skip('works', () => {
    let b = `
G Q Z+
 E q= +K +Q/K
 `

    let a = `
G Q n+
`

    console.log(mor_gen3(a))
})


it.skip('G + ,', () => {
    let b = `
G Q Z+
 E q= +K +Q/K
 `

    let a = `
G Q n+, b +Q +n
`

    //console.log(mor_gen3(a))



    let c = `
G Q n+, b +Q
`

    console.log(mor_gen3(c))
})

it.only('G E', () => {
    let b = `
G Q Z+
 E q= +K +Q/K
 `

    let a = `
G Q K+
 E b= +K +Q/K
`

    console.log(mor_gen3(a))
})


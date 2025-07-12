
import { it } from 'vitest'
import { m, set_m } from '../src/mor3_hope1'
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


it.skip('G E', () => {
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


it.skip('Q+/B', () => {
    let a = `
G N Q+/B b2+
 `

    console.log(mor_gen2(a))
})

it.skip('regression', () => {
    let b = `
G N Q+/B b2+
 E b2= =N
  A
   G B= +k Q+|b2
    E p3= +B
   G b2
 `

 let a = `
G N Q+/B b2+
 E b2= =N
  A
   G B= +k Q+|b2
    E p3= +B
   G b2
 `

    console.log(mor_gen2(a))
})

it.skip('another example', () => {
    let b = `
G R2 Q+ q+
 E b= +K/Q z+
  A
   G R= r+ k+ +k
   E b= =Q
   G Q= =b
    E q= =R2 Z+
 `

 let a = `
G K Q+, k b+
 E b=
 `

    console.log(mor_gen2(a))
})




it.only('another example', () => {
    let b = `
G R2 Q+ q+
 E b= +K/Q z+
  A
   G R= r+ k+ +k
   E b= =Q
   G Q= =b
    E q= =R2 Z+
 `

 let a = `
G R2 Q+ q+
 E b= +K/Q z+
  A
   G R= r+ k+ +k
   E b= =Q
   G Q= =b
    E q= =R2 Z+
 `

    console.log(mor_gen2(a))
})


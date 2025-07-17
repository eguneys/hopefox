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

it.skip('G E', () => {
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


it.skip('G Z+ E', () => {
    let b = `
G Q Z+
 E q= +K +Q/K
 `

    let a = `
G Q Z+ z+, q Z+, K
`

    console.log(mor_gen3(a))
})


it.skip('Q+/B', () => {
    let a = `
G N Q+/B b2+
 `

    console.log(mor_gen3(a))
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
E b= +K Q+|B
 `

    console.log(mor_gen3(a))
})


it.only('regression', () => {
   let a = `
G Q, K z+, k Z+, b Z+
 E b= +K/Q z+
`


    console.log(mor_gen3(a))
})



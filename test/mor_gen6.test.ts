import { describe, it } from 'vitest'
import { mor_gen6, PositionManager, set_m } from '../src'

set_m(await PositionManager.make())

describe.skip('mor gen 6', () => {

    it.skip('works', () => {
        let a = `
G Q n+
`
        console.log(mor_gen6(a))
    })


    it.skip('G + ,', () => {
        let a = `
G b +Q +n
`
        console.log(mor_gen6(a))
    })

    it.skip('G + ,', () => {

        let c = `
G Q n+, b +Q
`
        console.log(mor_gen6(c))
    })

    it.skip('G + impossible', () => {
        let b = `
G Q Z+
 E q= +K +Q/K
 `

        let a = `
G Q n+, b +Q +n
`

        console.log(mor_gen6(a))

    })



    it.skip('G Z+', () => {
        let b = `
G K, Q Z+
 `

        console.log(mor_gen6(b))
    })





    it.skip('G E', () => {
        let b = `
G Q Z+
 E q= +K +Q/K
 `

        let a = `
G Q K+
 E n= +K +Q
`

        console.log(mor_gen6(a))
    })




    it.skip('E +Q/K', () => {
        let b = `
G Q Z+
 E q= +K +Q/K
 `
        console.log(mor_gen6(b))

        let a = `
G b +Q/K
`

        //console.log(mor_gen6(a))


        let c = `
E q= +K +Q/K
 `



        //console.log(mor_gen6(c))

    })


    it.skip('G Z+ E', () => {
        let b = `
G Q Z+
 E q= +K +Q/K
 `

        let a = `
G Q Z+ z+, q Z+, K
`

        console.log(mor_gen6(a))
    })


    it.skip('Q+/B', () => {
        let a = `
G N Q+/B b2+
 `

        console.log(mor_gen6(a))
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

        console.log(mor_gen6(a))
    })


    it.skip('regression', () => {
        let a = `
G Q, K z+, k Z+, b Z+
 E b= +K/Q z+
`


        console.log(mor_gen6(a))
    })





    it.skip('A', () => {
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
E b= +K/Q
 A
  E b= =Q
`

        console.log(mor_gen6(a))
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

        console.log(mor_gen6(a))
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

        console.log(mor_gen6(a))
    })




    it.skip('another example 2', () => {
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

        /*
           a = `
       G k, K
        E b= =Q
       `
       */

        let z = `
G R k+ B+
 E q= =B Z+
  A
   E q= =R
   E b= =R
   E r= =R
   E k= =R
   E p= =R
   G R2 Q+ q+
    E b= +K/Q z+
     A
      E r= =R
      G R= k+ +k
      G R= r+ k+ +k
      E b= =Q
      G Q= =b
       E q= =R2 Z+
   `

        let z2 = `
G R2 Q+ q+
 E b= +K/Q z+
  A
   E r= =R
   G R= k+ +k
   G R= r+ k+ +k
   E b= =Q
   G Q= =b
    E q= =R2 Z+  
   `

        let apre = `
G R Q+ q+, K, k, b Z+
 E b= +K/Q z+
`
        a = `
G K z+, k Z+, b Z+
 E b= +K/Q z+
`



        a = `
G k Z+, R k+ B+
 E q= =B Z+
`

        console.log(mor_gen6(a))

        //console.log(mor_nogen_find_san(a, "8/5k2/4q3/8/8/8/r7/Q1KB4 w - - 0 1"))
    })


    it.only('works', () => {
        let a = `
G K z+, k Z+
 E n= =B Z+
`
        console.log(mor_gen6(a))
    })


})
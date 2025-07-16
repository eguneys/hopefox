import { it } from 'vitest'
import { mor_gen3 } from '../src'

it.only('works', () => {
    let b = `
G Q Z+
 E q= +K +Q/K
 `

    let a = `
G Q n+
`

    console.log(mor_gen3(a))
})


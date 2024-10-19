import { it, expect } from 'vitest'
import hopefox from '../src'

it('works', () => {

    let res = hopefox("6k1/8/8/8/8/8/5PPP/2r3K1 w - - 0 1", "FoFoFornrnrnOoOoOo")

    expect(res).toBe(true)

})
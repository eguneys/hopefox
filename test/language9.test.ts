import { it } from 'vitest'
import { Language9_Build } from '../src'


it('works', () => {
    let res = Language9_Build(`
world(W) :- root_world(_, W).
world(W) :- world_edge(_, _, W).
`)

    console.log(res)
})
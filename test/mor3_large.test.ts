import {it } from 'vitest'

import { a_hundred, Puzzle } from './fixture'
import { mor_nogen_find_san, PositionManager, set_m } from '../src'


set_m(await PositionManager.make())

it.only('works', () => {

    let b = `
G R2 Q+ q+
 E b= +K/Q z+
  A
   G R= r+ k+ +k
   E b= =Q
   E q= =R2 Z+
`

let a = `
G R2 Q+ q+
 E b= +K/Q z+ Q+
`

    let [p_matched, p_failed] = match_a(a)
    let matched = p_matched.map(_ => [_.tags, _.link, _.move_fens[0]])
    let failed = p_failed.map(_ => [_.tags, _.link, _.move_fens[0]])
    console.log(matched.length, matched.slice(0, 10))
    console.log(failed.length, failed.slice(0, 10))

})

function match_a(a: string) {
    let matched: Puzzle[] = []
    let failed: Puzzle[] = []
    for (let p of a_hundred) {
        for (let i = 0; i < p.move_fens.length; i+= 2) {
            let san = p.sans[i]
            let fen = p.move_fens[i]
            let m = mor_nogen_find_san(a, fen)
            if (san === m) {
                matched.push(p)
            } else if (m !== undefined) {
                failed.push(p)
            }
        }
    }
    return [matched, failed]
}
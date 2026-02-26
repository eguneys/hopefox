import { it } from 'vitest'
import { make_fast, PositionManager } from '../src'

let m = await PositionManager.make()


it('works', () => {
    let fen = 'N6r/1p1k1ppp/2np4/b3p3/4P1b1/N1Q5/P4PPP/R3KB1R b KQ - 0 1'
    let pos = m.create_position(fen)

    let res = make_fast(m, pos)
    console.log(res)
})
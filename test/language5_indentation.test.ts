import { it } from 'vitest'
import { extract_sans, fen_pos, PositionManager, Rs, search5, searchWithPv } from '../src'
import { puzzles } from './fixture'

let m = await PositionManager.make()

it('works', () => {
    let i = 0
    let pos2 = fen_pos(puzzles[i].move_fens[0])
    let pos = m.create_position(puzzles[i].move_fens[0])

    let rs = new Rs(m, pos)
    let res = searchWithPv(rs, 0, 0)
    console.log(extract_sans(pos2, res.pv))

})
import { it } from 'vitest'
import { extract_sans, fen_pos, PositionManager, Rs, Search5, } from '../src'
import { puzzles } from './fixture'

let m = await PositionManager.make()

it('works', () => {
    let i = 0
    let pos2 = fen_pos(puzzles[i].move_fens[0])
    let pos = m.create_position(puzzles[i].move_fens[0])

    let res = Search5(m, pos, 3)
    console.log(res)
    //console.log(extract_sans(pos2, res.pv))

})
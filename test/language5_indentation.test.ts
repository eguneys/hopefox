import { it } from 'vitest'
import { PositionManager, Rs } from '../src'
import { puzzles } from './fixture'

let m = await PositionManager.make()

it('works', () => {
    let pos = m.create_position(puzzles[0].move_fens[0])
    let rs = new Rs(m, pos)
    rs.search()
})
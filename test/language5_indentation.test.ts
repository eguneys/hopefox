import { it } from 'vitest'
import { BindingScriptManager, PositionManager } from '../src'
import { puzzles } from './fixture'

let m = await PositionManager.make()

it('works', () => {
    let pos = m.create_position(puzzles[0].move_fens[0])
    let res = new BindingScriptManager(m, pos)
    res.search(0, 1)
})
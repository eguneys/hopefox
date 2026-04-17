import { it } from 'vitest'
import { test_b_forks_kr_puzzles } from "./fixture"
import { PositionManager, usage } from '../src'

let m = await PositionManager.make()

it('works', () => {

    let log_puzzles = test_b_forks_kr_puzzles

    let i = 0
    let fen = log_puzzles[i].move_fens[0]

    let pos = m.create_position(fen)
    let link = log_puzzles[i].link

    let solution = log_puzzles[i].sans

    let res = usage(m, pos, 3)
    console.log(link)
    console.log(res)
})
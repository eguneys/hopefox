import fs from 'fs'
import { it } from 'vitest'
import { PositionManager, usage } from '../src'
import { test_b_forks_kr_puzzles } from "./fixture"

let m = await PositionManager.make()
let log_puzzles = test_b_forks_kr_puzzles

let data = fs.readFileSync('test/second.gof').toString()

let gof_run = usage(data)

it('works', () => {

    let i = 0

    let link = log_puzzles[i].link
    let pos = m.create_position(log_puzzles[i].move_fens[0])

    let solution = `[${log_puzzles[i].sans.join(' ')}]`

    console.log(link)
    console.log(solution)
    let sans = gof_run(m, pos)

    let res = sans.map(_ => `{ ${_.join(' ')} }`).join('\n')

    console.log(res)
})
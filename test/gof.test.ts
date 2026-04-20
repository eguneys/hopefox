import fs from 'fs'
import {it} from 'vitest'
import { gofchess, PositionManager } from '../src'
import { test_b_forks_kr_puzzles } from "./fixture"

let m = await PositionManager.make()
let log_puzzles = test_b_forks_kr_puzzles

it('works', () => {
    let data = fs.readFileSync('test/hello.gof').toString()
    let [a, b] = data.split('##')
    let gof = gofchess(b, a)

    let i = 3
    let fen = log_puzzles[i].move_fens[0]

    let pos = m.create_position(fen)
    let link = log_puzzles[i].link

    let solution = log_puzzles[i].sans

    let res = gof(m, pos).map(_ => `{${_.join(' ')}}`).join('\n')

    let log = ''
    log += `${i} ${link}`
    log += `\n`
    log += `Solution: ${solution.join(' ')}`
    log += `\n`
    log += res

    console.log(log)

})
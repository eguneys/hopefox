import { it } from 'vitest'
import { make_move_from_to } from '../src'
import { parseSan, PositionC, PositionManager, reason_engine } from '../src'
import { parse_and_create_bindings } from '../src/gof2/gofer'
import { parse_defs } from '../src/gof4/parser'
import { tenk } from './fixture'

let code = `
def captures(From, Captured_To)
  capture(From, To, Captured)

def checks(From, To, King)
  move(From, To)
  attack(To, King)
`
let reason_res = reason_engine(code)

let m: PositionManager = await PositionManager.make()
let log_puzzles = tenk

it.skip('works', () => {

    let i = 0
    let fen = log_puzzles[i].move_fens[0]
    let solution = log_puzzles[i].sans.slice(0, 2)

    let pos = m.create_position(log_puzzles[0].move_fens[0])

    let res = reason_res(m, pos, solution)
    console.log('out')
    console.log(res)
    console.log('done')
})

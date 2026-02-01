import { it } from 'vitest'
import { fen_pos, Language7, PositionManager } from '../src'
import { puzzles } from './fixture'
import { extract_sans } from '../src/language2/san_moves_helper'
import { PositionMaterializer } from '../src/language6/engine6'

it('runs', () => {

  //solve_i(5)
  for (let i = 0; i < 10; i++) {
    solve_i(i)
  }
})

let m = await PositionManager.make()

function solve_i(i: number) {
  let pos2 = fen_pos(puzzles[i].move_fens[0])
  let pos = m.create_position(puzzles[i].move_fens[0])
  let mz = new PositionMaterializer(m, pos)
  let res: Map<string, number[]> = Language7(mz)

  let res2 = new Map()

  for (let [k, v] of res) {
    res2.set(k, v.map(v => mz.sans(v)))
  }

  console.log(res2)
  console.log(`${i}: ${puzzles[i].link}`)
}
import { it } from 'vitest'
import { fen_pos, Language7, PositionManager } from '../src'
import { puzzles } from './fixture'

it('runs', () => {

  solve_i(2)
  for (let i = 0; i < 10; i++) {
    //solve_i(i)
  }
})

let m = await PositionManager.make()

function solve_i(i: number) {
  let pos2 = fen_pos(puzzles[i].move_fens[0])
  let pos = m.create_position(puzzles[i].move_fens[0])
  let res: any = Language7(m, pos)

  //let res2 = new Map(res.map(([k, vv]) => [k, vv.map(v => extract_sans(pos2, v))]))
  //console.log(res2)

  console.log(res)
  console.log(`${i}: ${puzzles[i].link}`)
}
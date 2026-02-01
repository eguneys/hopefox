import { it } from 'vitest'
import { fen_pos, Language8, name_outcome, PositionManager } from '../src'
import { puzzles } from './fixture'
import { extract_sans } from '../src/language2/san_moves_helper'
import { PositionMaterializer } from '../src/language6/engine6'
import { Row } from '../src/language7/engine7'

it('runs', () => {

  solve_i(10)
  for (let i = 0; i < 10; i++) {
    //solve_i(i)
  }
})

let m = await PositionManager.make()

function solve_i(i: number) {
  let pos2 = fen_pos(puzzles[i].move_fens[0])
  let pos = m.create_position(puzzles[i].move_fens[0])
  let mz = new PositionMaterializer(m, pos)

  let res: Row[] = Language8(mz)

  let res2 = new Map()

  for (let v of res) {
    let p = res2.get(name_outcome(v.outcome))
    if (p === undefined) {
      res2.set(name_outcome(v.outcome), [mz.sans(v.world)])
    } else {
      p.push(mz.sans(v.world))
    }
  }

  console.log(res2)
  console.log(`${i}: ${puzzles[i].link}`)
}
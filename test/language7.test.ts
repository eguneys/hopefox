import { it } from 'vitest'
import { fen_pos, Language8, name_outcome, PositionManager } from '../src'
import { puzzles } from './fixture'
import { extract_sans } from '../src/language2/san_moves_helper'
import { PositionMaterializer } from '../src/language6/engine6'
import { Row } from '../src/language7/engine7'

it('runs', () => {

  //solve_i(6)
  
  bench()
})

let m = await PositionManager.make()

function bench() {
  let solved = []
  let unfound = []
  let falses = []
  for (let i = 0; i < 100; i++) {
    let res = _solve_i(i)

    let checkmate: string[][] = res.get('Checkmate')

    if (!checkmate) {
      unfound.push(i)
      continue
    }
    let solution = puzzles[i].sans.join(' ')



    if (checkmate.find(_ => _.join(' ') === solution)) {
      solved.push(i)
      continue
    }

    console.log(`${i}: ${puzzles[i].link}`)
    console.log(checkmate.map(_ => _.join(' ')))

    falses.push(i)
  }

  console.log(`${solved.length} : ${unfound.length} : ${falses.length} : ${puzzles.length}`)
  console.log('solved', solved)
  console.log('unfound', unfound)
  console.log('falses', falses)
}

function _solve_i(i: number) {
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
      if (p.length > 30) {
        continue
      }
      p.push(mz.sans(v.world))
    }
  }
  return res2
}


function solve_i(i: number) {
  let res2 = _solve_i(i)
  console.log(res2)
  console.log(`${i}: ${puzzles[i].link}`)
}
import { expect, it } from 'vitest'
import { puzzles } from './fixture'
import { example, fen_pos, PositionManager, Semantical7 } from '../src'
import { analyseProgram } from '../src/language6/diagnostics'
import { extract_sans } from '../src/language2/san_moves_helper'

let m = await PositionManager.make()

it.skip('links', () => {
    console.log(puzzles[0].link)
    console.log(puzzles[1].link)
    console.log(puzzles[2].link)
    console.log(puzzles[3].link)
})

it.skip('works', () => {
  example()
})

it.skip('works diagnostics', () => {
  let text = `
idea "Knight Fork"
  move knight from e5 to f7
  attacks knight -> king
  move knightz from e5 to f7
  move knight from i9 to h7
`
  let res = analyseProgram(text)

  expect(res.diagnostics.length).toEqual(2)
})


it.skip('works, success', () => {
  let text = `
idea "Knight Fork"
  move knight from e5 to f7
  attacks knight -> king
  move knight from e4 to a7
  move knight from h8 to h7
`
  let res = analyseProgram(text)

  expect(res.node).toBeDefined()
})

it.skip('runs', () => {

  solve_i(2)
  for (let i = 0; i < 10; i++) {
    //solve_i(i)
  }
})

function solve_i(i: number) {
  let pos2 = fen_pos(puzzles[i].move_fens[0])
  let pos = m.create_position(puzzles[i].move_fens[0])
  let res: [string, number[][]][] = Semantical7(m, pos) as [string, number[][]][]

  let res2 = new Map(res.map(([k, vv]) => [k, vv.map(v => extract_sans(pos2, v))]))
  console.log(res2)

  console.log(`${i}: ${puzzles[i].link}`)
}
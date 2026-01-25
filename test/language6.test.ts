import { expect, it } from 'vitest'
import { puzzles } from './fixture'
import { example, fen_pos, PositionManager, Search6 } from '../src'
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

it('works diagnostics', () => {
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


it('works, success', () => {
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

it('runs', () => {
  let text = `
idea "Rook check"
  checks rook -> king
`

  let { node } = analyseProgram(text)

  let i = 0
  let pos2 = fen_pos(puzzles[i].move_fens[0])
  let pos = m.create_position(puzzles[i].move_fens[0])
  let res = Search6(m, pos, node!)

  let res2 = res.map(_ => extract_sans(pos2, _)).slice(0, 30)
  console.log(res2)
  console.log(puzzles[i].link)
})
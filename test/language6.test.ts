import { it } from 'vitest'
import { puzzles } from './fixture'
import { example, PositionManager, Search6 } from '../src'

let m = await PositionManager.make()

it.skip('links', () => {
    console.log(puzzles[0].link)
    console.log(puzzles[1].link)
    console.log(puzzles[2].link)
    console.log(puzzles[3].link)
})

it('works', () => {
  example()
})
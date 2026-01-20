import { it } from 'vitest'
import { extract_sans, PositionManager, Rs } from '../src'
import { puzzles } from './fixture'

let m = await PositionManager.make()

it.skip('links', () => {
    console.log(puzzles[0].link)
    console.log(puzzles[1].link)
    console.log(puzzles[2].link)
    console.log(puzzles[3].link)
})

it.skip('works', () => {
    let i = 0
    let fen = '7k/pb4pp/2p5/5p2/3P4/8/PPP2PPP/4R1K1 w - - 2 23'
    let pos = m.create_position(puzzles[i].move_fens[0])
    pos = m.create_position(fen)


    let rs = new Rs(m, pos)
})
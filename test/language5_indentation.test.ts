import { it } from 'vitest'
import { extract_sans, fen_pos, PositionManager, Rs } from '../src'
import { puzzles } from './fixture'

let m = await PositionManager.make()

it('works', () => {
    let i = 3
    let fen = '7k/pb4pp/2p5/5p2/3P4/8/PPP2PPP/4R1K1 w - - 2 23'
    let pos = m.create_position(puzzles[i].move_fens[0])
    pos = m.create_position(fen)


    let rs = new Rs(m, pos)

    let ms = rs.mates(0)
    while (ms === undefined) {
        rs.run()
        ms = rs.mates(0)
    }
    console.log(puzzles[i].link)
    console.log(extract_sans(m, pos, ms))
})
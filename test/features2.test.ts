import { it } from 'vitest'
import { Adventure, Backrank1, fen_pos, play_and_sans } from '../src'
import { puzzles } from './fixture'


it('works', () => {

    let fen = "r1b1kb1r/pp5p/2pp1q1p/1B1Qp3/4P3/2N5/PPP2PPP/R3K2R w KQkq - 0 11"

    let pos = fen_pos(fen)
    let res = Adventure(pos).map(_ => play_and_sans(_, pos).join(' '))

    console.log(res)
})


it.only('puzzles 0', () => {
    let link = puzzles[0].link
    let fen = puzzles[0].fen

    console.log(link)
    let pos = fen_pos(fen)

    let res = Backrank1(pos).map(_ => play_and_sans(_, pos).join(' '))
    console.log(res)
})
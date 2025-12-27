import { it } from 'vitest'
import { Adventure, Adventure2, Backrank1, Backrank2, Backrank3, Backrank5, Backranks, Chess, Exchange, ExchangeAndGobble, fen_pos, Liquidation, MateIn1, play_and_sans, RookMate, TacticalFind } from '../src'
import { puzzles } from './fixture'


it('works', () => {

    let fen = "r1b1kb1r/pp5p/2pp1q1p/1B1Qp3/4P3/2N5/PPP2PPP/R3K2R w KQkq - 0 11"

    let pos = fen_pos(fen)
    let res = Adventure(pos).map(_ => play_and_sans(_, pos).join(' '))

    console.log(res)
})


it('puzzles 0', () => {
    let link = puzzles[0].link
    let fen = puzzles[0].move_fens[0]

    let pos = fen_pos(fen)

    let res = Backrank1(pos).map(_ => play_and_sans(_, pos).join(' '))
    console.log(res)
})


it('puzzles 1', () => {
    let link = puzzles[1].link
    let fen = puzzles[1].move_fens[0]

    let pos = fen_pos(fen)

    let res = RookMate(pos).map(_ => play_and_sans(_, pos).join(' '))
    console.log(res)
})


it('puzzles 3', () => {
    let link = puzzles[3].link
    let fen = puzzles[3].move_fens[0]

    let pos = fen_pos(fen)

    let res = Backrank2(pos).map(_ => play_and_sans(_, pos).join(' '))
    console.log(link)
    console.log(res)
})

it('puzzles 4', () => {
    let link = puzzles[4].link
    let fen = puzzles[4].move_fens[0]

    let pos = fen_pos(fen)

    let res = TacticalFind(pos).map(_ => play_and_sans(_, pos).join(' '))
    console.log(link)
    console.log(res)
})

it('puzzles 5', () => {
    let link = puzzles[5].link
    let fen = puzzles[5].move_fens[0]

    let pos = fen_pos(fen)

    //let res = TacticalFind(pos).map(_ => play_and_sans(_, pos).join(' '))
    let res = TacticalFind(pos).map(_ => play_and_sans(_, pos).join(' '))
    console.log(link)
    console.log(res)
})


it.skip('puzzles 12', () => {
    let link = puzzles[12].link
    let fen = puzzles[12].move_fens[0]

    let pos = fen_pos(fen)

    //let res = TacticalFind(pos).map(_ => play_and_sans(_, pos).join(' '))
    //let res = Adventure2(pos).map(_ => play_and_sans(_, pos).join(' '))
    let res = Liquidation(pos).map(_ => play_and_sans(_, pos).join(' '))
    console.log(link)
    console.log(res)
})


it.skip('puzzles 30', () => {
    let link = puzzles[30].link
    let fen = puzzles[30].move_fens[0]

    let pos = fen_pos(fen)

    //let res = TacticalFind(pos).map(_ => play_and_sans(_, pos).join(' '))
    //let res = Adventure2(pos).map(_ => play_and_sans(_, pos).join(' '))
    let res = Backrank5(pos).map(_ => play_and_sans(_, pos).join(' '))
    console.log(link)
    console.log(res)
})



let skips = ['00MWz', '00Rlv']
it.only('puzzles n', () => {

    for (let i = 0; i < 160; i++) {
        let res = TacticalFindSans(i)
        if (!res) {
            break
        }
    }
})

function TacticalFindSans(n: number) {
    let link = puzzles[n].link
    let fen = puzzles[n].move_fens[0]

    if (skips.includes(puzzles[n].id)) {
        return true
    }

    let pos = fen_pos(fen)

    let res = TacticalFind(pos).map(_ => play_and_sans(_, pos).join(' '))
    let a = res.find(_ => _ === puzzles[n].sans.join(' '))
    if (!a) {
        console.log(n)
        console.log(link)
        console.log(puzzles[n].sans, '\nexpected but found\n', res)
        return false
    }
    return true
}
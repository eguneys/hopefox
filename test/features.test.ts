import { it} from 'vitest'

import { fen_pos, king, mor_long, mor_short, print_a_piece } from '../src'
import { INITIAL_FEN } from '../src/fen'

import { puzzles, tenk } from "./fixture"


it.skip('works', () => {
    // Qxe7#
    let fen = "2rk2r1/1Q2p2p/3p4/1B1P1q1p/8/1K2R3/P7/8 w - - 1 45"

    console.log(king(fen))

})

it('filters fixture for mate in 1', () => {

    //let res = tenk.filter(_ => _.tags.includes('mateIn1'))
    let res = puzzles.filter(_ => _.tags.includes('mateIn1'))
    res = tenk.filter(_ => _.tags.includes('mateIn1'))
    res = res.filter(_ => fen_pos(_.fen).turn === 'black')

    res = res.filter(_ => _.id === '00fXd')

    let solved = res.filter(_ => {

        let fen = _.move_fens[0]
        let san = _.sans[0]

        return king(fen) === san
    })

    let unsolved = res.filter(_ => {

        let fen = _.move_fens[0]
        let san = _.sans[0]

        return king(fen) !== san
    })



    console.log(solved.length, unsolved.length)

    console.log(unsolved[0], king(unsolved[0]?.move_fens[0]))
})
import { describe, it} from 'vitest'

import { fen_pos, king, king1, mor_long, mor_short, print_a_piece } from '../src'
import { INITIAL_FEN } from '../src/fen'

import { puzzles, tenk } from "./fixture"

describe.skip(() => {

    it('works', () => {
        // Qxe7#
        let fen = "2rk2r1/1Q2p2p/3p4/1B1P1q1p/8/1K2R3/P7/8 w - - 1 45"

        console.log(king1(fen))

    })

    it('filters fixture for mate in 1', () => {

        //let res = tenk.filter(_ => _.tags.includes('mateIn1'))
        let res = puzzles.filter(_ => _.tags.includes('mateIn1'))
        res = tenk.filter(_ => _.tags.includes('mateIn1'))
        res = res.filter(_ => fen_pos(_.fen).turn === 'black')

        res = res.filter(_ => !['013ze', '02SWp', '02THe', '03SLJ'].includes(_.id))

        //res = res.filter(_ => _.id === '004iZ')
        //res = res.filter(_ => _.id === '00HoG')
        //res = res.filter(_ => _.id === '00FHX')
        res = res.filter(_ => _.id === '04hNd')

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

        if (unsolved.length === 0) {
            return
        }
        console.log(unsolved[0], king(unsolved[0]?.move_fens[0]))
    })


    it('king2', () => {

        //let res = tenk.filter(_ => _.tags.includes('mateIn1'))
        let res = puzzles.filter(_ => _.tags.includes('mateIn1'))
        res = tenk.filter(_ => _.tags.includes('mateIn1'))
        res = res.filter(_ => fen_pos(_.fen).turn === 'black')

        res = res.filter(_ => !['013ze', '02SWp', '02THe', '03SLJ', '03Ehj', '050ge', '075h7', '076ID', '08Ogr', '0BKJb', '0FNks'].includes(_.id))

        // pinned
        res = res.filter(_ => !['05Nl0', '06xqu', '08xfs', '0Ddlk', '0F1YX'].includes(_.id))

        // covered edge
        res = res.filter(_ => !['09ObR', '0FA5P'].includes(_.id))

        // double check
        res = res.filter(_ => !['09iNz'].includes(_.id))

        //res = res.filter(_ => _.id === '0FA5P')

        let solved = []
        let unsolved = []

        for (let _ of res) {

            let fen = _.move_fens[0]
            let san = _.sans[0]

            let sol = king1(fen)

            if (sol === san) {
                solved.push(_)
            } else {
                unsolved.push(_)
            }
        }



        console.log(solved.length, unsolved.length)

        if (unsolved.length === 0) {
            return
        }
        console.log(unsolved[0], king1(unsolved[0]?.move_fens[0]))
    })

    it('mate in 2 rook backrank escape squares', () => {


        let fen = "8/8/8/2K5/k7/1R6/8/8 w - - 4 3"


        console.log(king1(fen))

    })

    it('king2 mate in 2 overall', () => {

        let res = puzzles.filter(_ => _.tags.includes('mateIn2'))
        //res = tenk.filter(_ => _.tags.includes('mateIn2'))
        res = res.filter(_ => fen_pos(_.fen).turn === 'black')

        //res = res.filter(_ => _.id === '0FA5P')

        let solved = []
        let unsolved = []

        for (let _ of res) {

            let fen = _.move_fens[0]
            let san = _.sans[0]

            let sol = king1(fen)

            if (sol === san) {
                solved.push(_)
            } else {
                unsolved.push(_)
            }
        }



        console.log(solved.length, unsolved.length)

        if (unsolved.length === 0) {
            return
        }
        console.log(unsolved[0], king1(unsolved[0]?.move_fens[0]))
    })
})
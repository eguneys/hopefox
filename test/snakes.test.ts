import { it } from 'vitest'
import { digest, drink, fen_snakes, soup } from '../src'
import { puzzles } from './fixture'


it('works', () => {


    let fen = "4rr2/1ppq1pk1/p1n2R2/5b2/3p1Q2/1B3N2/PPP2PPP/4R1K1 b - - 0 21"

    //console.log(fen_snakes(fen))
    console.log(soup(fen))
})


it.only('tests', () => {

    let res = puzzles

    // overflow
    res = res.filter(_ => !['00f99', '01GXf', '01194', '00jPH', '00awL', '00E4Z', '0088O', '00Rdf'].includes(_.id))

    // queen check overflow
    res = res.filter(_ => !['01Jrn', '00Ru6', '004nd', '00OOp'].includes(_.id))

    // hang
    res = res.filter(_ => !['00obu'].includes(_.id))


    // double solution
    res = res.filter(_ => !['019yp'].includes(_.id))



    // tricky
    res = res.filter(_ => !['00nQp'].includes(_.id))


    // limit
    res = res.filter(_ => !['00aBq'].includes(_.id))


    // order
    res = res.filter(_ => !['00q8C', '001om'].includes(_.id))


    // uncovered todo
    res = res.filter(_ => !['00YCP'].includes(_.id))

    res = res.filter(_ => !_.tags.includes('endgame'))

    //res = res.filter(_ => _.id === '00tdc')

    res = res.slice(0, 30)

    let solved = []
    let unsolved = []

    for (let r of res) {
        //console.log(r.id)
        let fen = r.move_fens[0]
        //let s = drink(fen)
        let s = digest(fen)
        if (s.length === 0) {
            unsolved.push(r)
            continue
        }
        let pot = s[0][1]

        if (match_only_my_moves(r.sans[0], pot)) {
            solved.push(r)
        } else {
            unsolved.push(r)
        }
    }

    console.log(`Solved ${solved.length}, Unsolved: ${unsolved.length}`)

    if (unsolved.length === 0) {
        console.log('Congratz, Bye.')
    } else {
        let s = digest(unsolved[0].move_fens[0])
        if (s.length === 0) {
            console.log(unsolved[0])
            console.log('Unmatched digest :(')

            console.log(`Solved ${solved.length}, Unsolved: ${unsolved.length}`)
            return
        }
        let pot = s[0][1]

        console.log(unsolved[0])
        console.log(pot)
        console.log(s)
        console.log(unsolved[0])

    }
})

function match_only_my_moves(sans: string, sans2: string) {
    let a = sans.split(' ')
    let b = sans2.split(' ')

    for (let i = 0; i < a.length; i+=2) {
        if (a[i] !== b[i]) {
            return false
        }
    }

    return true
}
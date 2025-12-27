import { it } from 'vitest'
import { Adventure, Adventure2, Backrank1, Backrank2, Backrank3, Backrank5, Backranks, CapturesKingRunsForks, ChecksCapturesMateLong, ChecksCheckMate, ChecksKingRunsForks, Chess, Exchange, ExchangeAndGobble, fen_pos, ForksNewWay, Liquidation, MateIn1, PinAndWin, play_and_sans, RookMate, SAN, TacticalFind, TacticalFind2 } from '../src'
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


it('puzzles 35', () => {
    let link = puzzles[56].link
    let fen = puzzles[56].move_fens[0]

    let pos = fen_pos(fen)

    let res = ChecksCapturesMateLong(pos).map(_ => play_and_sans(_, pos).join(' '))
    console.log(link)
    console.log(res)
})

it.only('puzzles 35', () => {

    let res = TacticalFindSans2(35)
    console.log(res)
})




let skips = ['00MWz', '00Rlv', '008tL', '01Cds', '01TeF', '00Aae', '00QCD']
skips.push('00k6k') // And
skips.push('00rzv') // Mating

skips.push(...['00tdc', '00xmm']) // Pin
skips.push(...['00KMV']) // Skewer

it.only('puzzles n', () => {
    for (let i = 0; i < 160; i++) {
        let res = TacticalFindSans2(i)
        if (!res) {
            break
        }
    }
})


function TacticalFindSans2(n: number) {
    let link = puzzles[n].link
    let fen = puzzles[n].move_fens[0]

    if (puzzles[n].tags.includes('endgame')) {
        return true
    }
    if (skips.includes(puzzles[n].id)) {
        return true
    }

    let pos = fen_pos(fen)

    let res = TacticalFind2(pos).map(_ => play_and_sans(_, pos))
    //let res = ChecksCheckMate(pos).map(_ => play_and_sans(_, pos))

    let a = find_solving_sans(res, puzzles[n].sans)

    if (!a) {
        console.log(n)
        console.log(link)
        console.log(puzzles[n].sans, '\nexpected but found\n', res)
        return false
    }
    return true
}

function TacticalFindSansLoose2(n: number) {
    let link = puzzles[n].link
    let fen = puzzles[n].move_fens[0]

    if (puzzles[n].tags.includes('endgame')) {
        return true
    }
    if (skips.includes(puzzles[n].id)) {
        return true
    }

    let pos = fen_pos(fen)

    let res = TacticalFind2(pos).map(_ => play_and_sans(_, pos))
    let a = res.find(_ => _.join(' ').startsWith(puzzles[n].sans.join(' ')))
    if (!a) {
        console.log(n)
        console.log(link)
        console.log(puzzles[n].sans, '\nexpected but found\n', res.slice(0, 3))
        return false
    }
    return true
}



function TacticalFindSansLoose(n: number) {
    let link = puzzles[n].link
    let fen = puzzles[n].move_fens[0]

    if (puzzles[n].tags.includes('endgame')) {
        return true
    }
    if (skips.includes(puzzles[n].id)) {
        return true
    }

    let pos = fen_pos(fen)

    let res = TacticalFind(pos).map(_ => play_and_sans(_, pos))
    let a = res.find(_ => _.join(' ').startsWith(puzzles[n].sans.join(' ')))
    if (!a) {
        console.log(n)
        console.log(link)
        console.log(puzzles[n].sans, '\nexpected but found\n', res)
        return false
    }
    return true
}

function TacticalFindSans(n: number) {
    let link = puzzles[n].link
    let fen = puzzles[n].move_fens[0]

    if (puzzles[n].tags.includes('endgame')) {
        return true
    }
    if (skips.includes(puzzles[n].id)) {
        return true
    }

    let pos = fen_pos(fen)

    let res = TacticalFind(pos).map(_ => play_and_sans(_, pos))
    let a = find_solving_sans(res, puzzles[n].sans)

    if (!a) {
        console.log(n)
        console.log(link)
        console.log(puzzles[n].sans, '\nexpected but found\n', res)
        return false
    }
    return true
}


/*
   Rxf7+ Kg8 Rxd7
   Rxf7 + Ke8 Rxd7
   Rf2 Nexf2 Qh8
*/
const find_solving_sans = (a: SAN[][], b: SAN[]) => {
    if (a.length === 0) {
        return false
    }
    if (a[0].length < b.length) {
        return false
    }
    if (b.length === 0) {
        return true
    }
    let head = a[0][0]

    if (head !== b[0]) {
        return false
    }

    a = a.filter(_ => _[0] === head)

    a = a.filter(_ => _[1] === b[1])


    if (!find_solving_sans(a.map(_ => _.slice(2)), b.slice(2))) {
        return false
    }

    return true
}
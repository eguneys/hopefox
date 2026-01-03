import { it } from 'vitest'
import fs from 'fs'
import { puzzles } from './fixture'
import { fen_pos, Min_max_sort, move_c_to_Move, Position, Move, join_position2 } from '../src'
import { makeSan } from '../src/san'


function render(data: string) {
    fs.writeFileSync(__dirname + '/_output.txt', data)
}

it('relational', () => {
    solve_n(0)
    return
    for (let i = 0; i < 100; i++) {
        render('' + i)
        let res = solve_n(i)
        if (!res) { 
            break
        }
    }
})


it.skip('works', () => {
    //console.log(puzzles[0].link)
    //solve_n(0)
    //console.log(search('', puzzles[0].move_fens[0]).map(move_c_to_Move))

    let fen = 'k7/8/8/8/8/8/6n1/7K w - - 0 1'
    let tt = join_position2(fen)
    console.log(tt)

    //let tt2 = tt.map(_ => _.map(move_c_to_Move))
    //console.log(tt2.map(_ => san_moves(fen_pos(fen), _)))
    //solve_n(0)
})


let Skips = ['01FCo', '010Jc', '00Htd', '00WcO']
function solve_n(n: number, skips: string[] = Skips) {
    let id = puzzles[n].id
    let link = puzzles[n].link
    let fen = puzzles[n].move_fens[0]
    let solution = puzzles[n].sans

    if (skips.includes(id)) {
        return true
    }


    console.log(n)
    console.log(link)

    let tt = join_position2(fen)

    let tt2 = tt.map(_ => _.map(move_c_to_Move))
    let res = Min_max_sort(fen_pos(fen), tt2).map(_ => san_moves(fen_pos(fen), _))


    let solved = find_solving_sans(res, solution)
    let loose = find_solving_sans_loose(res, solution)

    if (!solved) {
        console.log(puzzles[n].sans, '\nexpected but found\n', res.slice(0))
        console.log('loosely solved: ', loose)
    }
    return solved
}

export const find_solving_sans_loose = (a: SAN[][], b: SAN[]) => {
    return a.find(_ => _.join(' ') === b.join(' ')) !== undefined
}

type SAN = string
export const find_solving_sans = (a: SAN[][], b: SAN[]) => {
    if (a.length === 0) {
        return false
    }
    if (b.length === 0) {
        return true
    }
    let head = a[0][0]

    if (head !== b[0]) {
        return false
    }

    if (b.length === 1) {
        return true
    }

    a = a.filter(_ => _[0] === head)

    a = a.filter(_ => _[1] === b[1])


    if (!find_solving_sans(a.map(_ => _.slice(2)), b.slice(2))) {
        return false
    }

    return true
}

function dedup_str(m: string[][]) {
    return [...new Set(m.map(_ => _.join(' ')))].map(_ => _.split(" "))
}


export function san_moves(pos: Position, moves: Move[]) {
    let res: SAN[] = []
    let p2 = pos.clone()
    for (let move of moves) {
        res.push(makeSan(p2, move))
        p2.play(move)
    }
    return res
}
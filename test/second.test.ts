import { describe } from 'node:test'
import { it, expect } from 'vitest'
import { Puzzle, puzzles } from './fixture'
import { bestsan2 } from '../src'

describe.skip("second", () => {
    it('mate in 1', () => {
        let all = puzzles
            .filter(_ => _.id !== '013ze')
            .filter(_ => _.tags.includes('mateIn1'))

        let solved = all.filter(_ => solve_p(_))
        let failed = all.filter(_ => !solve_p(_))

        console.log(`${solved.length} / ${all.length}`)

        console.log(failed.map(_ => `${_.link} ${_.fen}`))

        expect(solved.length).toBe(all.length)
    })


    it.only('mate in 2', () => {
        let all = puzzles
            .filter(_ => _.tags.includes('mateIn4'))

        let solved = all.filter(_ => solve_p(_))
        let failed = all.filter(_ => !solve_p(_))

        console.log(`${solved.length} / ${all.length}`)

        console.log(failed.map(_ => `${_.link} ${_.fen}`))

        expect(solved.length).toBe(all.length)
    })
})



function solve_p_str(p: Puzzle, rules: string) {
    for (let i = 0; i < p.move_fens.length; i += 2) {
        let fen = p.move_fens[i]
        let san = p.sans[i]

        if (bestsan2(fen) !== san) {
            console.log('\n\n')
            console.log(p.link, fen, bestsan2(fen), san)
            return false
        }
    }
    return true
}
const rules = `
`

function solve_p(p: Puzzle, _rules: string = rules) {
    for (let i = 0; i < p.move_fens.length; i += 2) {
        let fen = p.move_fens[i]
        let san = p.sans[i]

        if (bestsan2(fen) !== san) {
            return false
        }
    }
    return true
}
import { bench, it, expect } from 'vitest'
import { cookqueen, fen_pos, hopefox, matein1, tactics, xdefenderqueen } from '../src'
import { Puzzle, puzzles, tenk } from './fixture'
import { bestsan } from '../src'
import { describe } from 'node:test'

let backrank70 = "FoFoFofnfnfnOoOoOo"
describe.skip('patterns', () => {

    it('backrank70 exception1', () => {

        let res = hopefox("8/2k2p1p/pp2pN2/2p5/8/6P1/PPP1nPRP/1K1r4 w - - 3 25", backrank70)
        expect(res).toBe(true)
    })

    it('backrank reverse', () => {

        let res = hopefox("4R1k1/5ppp/r1p5/p1n2P2/8/2P2N1P/2P3P1/6K1 b - - 0 23", "OoOoOofnfnfnFoFoFo")
        expect(res).toBe(true)

    })

    it('works', () => {

        let res = hopefox("6k1/8/8/8/8/8/5PPP/2r3K1 w - - 0 1", "FoFoFornrnrnOoOoOo")

        expect(res).toBe(true)

    })


    it('rulebook', () => {

        let fen = '6k1/p3bppp/1p4r1/1q6/1P1P4/P3BP2/4QP1P/2R2K2 b - - 10 26'

        let res = cookqueen(fen_pos(fen))!

        expect(res.join(' ')).toBe('Rg1+ Kxg1 Qxe2')

    })

    it('cookqueen against puzzles', () => {

        let res = puzzles.filter(p => p.move_fens.find(_ => cookqueen(fen_pos(_))))

        //console.log(res.map(_ => `https://lichess.org/training/${_.id}`))
        expect(res.length).toBeGreaterThan(0)
    })


    it('hanging queen', () => {
        let p = puzzles.find(_ => _.id === '00Htd')!
        expect(xdefenderqueen(fen_pos(p.move_fens[0]))[0].join(' ')).toBe('Bxc3+ bxc3 Qxd5')
    })

    it('checkmate', () => {
        let p = puzzles.find(_ => _.id === '01MCO')!
        expect(matein1(fen_pos(p.move_fens[0]))?.[0]).toBe('Qf8#')
    })

    it('xdefenderqueen', () => {
        let res: string[] = []
        puzzles.forEach(p => {
            let sans = p.sans
            let fen0 = p.move_fens[0]

            let sxqueen = xdefenderqueen(fen_pos(fen0))

            if (sxqueen.length === 1) {
                res.push(`${p.link} ${p.sans.join(' ')}|${sxqueen[0].join(' ')}`)
            }
        })
        console.log(res)
    })

    it.skip('tactics against puzzles', () => {
        let res: string[] = []

        puzzles
            .filter(_ => _.tags.includes('mateIn4'))
            .forEach(p => {
                let tt = p.move_fens.slice(-2, -1).flatMap(_ => tactics(_))

                if (tt.length > 0) {
                    res.push(`${p.link} ${p.sans} ${tt}`)
                }
            })

        console.log(res)
    })

})

describe.skip('kaggle', () => {
    it('kaggle mateIn1', () => {
        let all = puzzles
            .filter(_ => _.id !== '013ze')
            .filter(_ => _.tags.includes('mateIn1'))

        let solved = all.filter(_ => solve_p(_))
        let failed = all.filter(_ => !solve_p(_))

        console.log(`${solved.length} / ${all.length}`)

        console.log(failed.map(_ => `${_.link} ${_.fen}`))

        expect(solved.length).toBe(all.length)
    })

    it('kaggle mateIn2', () => {
        let all = puzzles
            .filter(_ => _.id !== '00ZKw')
            .filter(_ => _.tags.includes('mateIn2'))

        let solved = all.filter(_ => solve_p(_))
        let failed = all.filter(_ => !solve_p(_))

        console.log(`${solved.length} / ${all.length}`)

        console.log(failed.map(_ => `${_.link} ${_.fen}`))

        expect(solved.length).toBe(all.length)
    })

    it('kaggle mateIn3', () => {
        let all = puzzles
            .filter(_ => _.tags.includes('mateIn3'))

        let solved = all.filter(_ => solve_p(_))
        let failed = all.filter(_ => !solve_p(_))

        console.log(`${solved.length} / ${all.length}`)

        console.log(failed.map(_ => `${_.link} ${_.fen}`))

        expect(solved.length).toBe(all.length)
    })


    it('kaggle mateIn4', () => {
        let all = tenk
            .filter(_ => _.tags.includes('mateIn4'))

        let solved = all.filter(_ => solve_p(_))
        let failed = all.filter(_ => !solve_p(_))

        console.log(`${solved.length} / ${all.length}`)

        console.log(failed.map(_ => `${_.link} ${_.fen}`))

        expect(solved.length).toBe(all.length)
    })


    it('hangingPiece', () => {
        let all = puzzles
            .filter(_ => _.tags.includes('hangingPiece'))

        let solved = all.filter(_ => solve_p(_))
        let failed = all.filter(_ => !solve_p(_))

        console.log(`${solved.length} / ${all.length}`)

        console.log(failed.map(_ => `${_.link} ${_.fen}`))

        expect(solved.length).toBe(all.length)
    })


    it('fork', () => {
        let all = puzzles
            .filter(_ => _.tags.includes('fork'))
            .slice(0, 50)

        let solved = all.filter(_ => solve_p(_))
        let failed = all.filter(_ => !solve_p(_))

        console.log(`${solved.length} / ${all.length}`)

        console.log(failed.map(_ => `${_.link} ${_.fen}`))

        expect(solved.length).toBe(all.length)
    })



    it('filter one', () => {
        let one = tenk.find(_ => _.id === '01TeF')!
        //let one = tenk.find(_ => _.id === '00Er4')!
        //let one = tenk.find(_ => _.id === '00B5A')!
        //let one = tenk.find(_ => _.id === '01Upi')!
        //let one = tenk.find(_ => _.id === '01Vbe')!
        //let one = tenk.find(_ => _.id === '01P8L')!

        solve_p_str(one, `
k =x 3
n
 k =x -3
 o
`)
    })


    it('long puzzle 006XF', () => {

        let one = tenk.find(_ => _.id === '006XF')!


        solve_p_str(one, `
q
 p
  q =x
   p =x
   .
`)
    })

    it('minmax simple', () => {

        let one = tenk.find(_ => _.id === '00008')!
        solve_p_str(one, `
p =x
r =x
`);

        (`
p =x
 q
  p =x
`)
    })

    it('minmax', () => {
        let one = tenk.find(_ => _.id === '00IUT')!
        solve_p_str(one, `
b =x
p
 r o
  p =x
  p
 q =x
  q =x
 q o
  p =x
  p
p =x
r =x
`)
    })


    it('0018S', () => {
        let one = tenk.find(_ => _.id === '0018S')!
        solve_p_str(one, `
r
 q
  r =x
  q =x
   r =x
`)
    })

    it('0018S Rc1', () => {

        let fen = '2kr3r/5p2/1p2p2p/pN1p2p1/8/1P1P4/2q2PPP/Q4RK1 w - - 0 22'

        bestsan(fen, `
q

r
 q
 . 1
  r =x
`)

    })


    it('000aY', () => {
        let one = tenk.find(_ => _.id === '000aY')!
        solve_p_str(one, `
q
 q =x
  n =x
   q =x
`)
    })


    it('0000D', () => {
        let one = tenk.find(_ => _.id === '0000D')!
        solve_p_str(one, `
r
 q
  q =x
`)
    })

    it('00143', () => {
        let one = tenk.find(_ => _.id === '00143')!
        solve_p_str(one, `
q
 . 1
  q =x
   p =x
`)
    })

    it('000aY', () => {
        let one = tenk.find(_ => _.id === '000aY')!
        solve_p_str(one, `
q =x
 p =x
`)
    })

    it('rule break 0018S', () => {
        let one = tenk.find(_ => _.id === '0018S')!
        solve_p_str(one, `
q
 p1
  r
   .1
    r =x
`)
    })


    it('pruning 000tp', () => {
        let one = tenk.find(_ => _.id === '000tp')!
        solve_p_str(one, `
n
 q
  n =x
  . 1
`)
    })
})



function solve_p_str(p: Puzzle, rules: string) {
    for (let i = 0; i < p.move_fens.length; i += 2) {
        let fen = p.move_fens[i]
        let san = p.sans[i]

        if (bestsan(fen, rules) !== san) {
            console.log('\n\n')
            console.log(p.link, fen, bestsan(fen, rules), san)
            return false
        }
        return true
    }
    return true
}
const rules = `
`

function solve_p(p: Puzzle, _rules: string = rules) {
    for (let i = 0; i < p.move_fens.length; i += 2) {
        let fen = p.move_fens[i]
        let san = p.sans[i]

        if (bestsan(fen, _rules) !== san) {
            return false
        }
    }
    return true
}
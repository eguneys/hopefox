import fs from 'fs'
import {it} from 'vitest'
import { gofchess, PositionManager } from '../src'
import { test_b_forks_kr_puzzles } from "./fixture"
//@ts-ignore
import './hello.gof?raw'
import { Gofer, SAN } from '../src/gof/gofer'


let m = await PositionManager.make()
let log_puzzles = test_b_forks_kr_puzzles

let data = fs.readFileSync('test/hello.gof').toString()
let [a, b] = data.split('##')
let gof!: Gofer

try {
    gof = gofchess(b, a)
} catch (e) {
    cf_begin()
    cf_log(`${e}`)
}



it('works', () => {
    let skips = [3]

    let single_i = -1
    //single_i = 23

    if (single_i != -1) {
        solve_i(single_i)
        return
    }

    let total = log_puzzles.length / 50
    let coverage: Coverage = { tp: 0, fp: 0, n: 0, log: [] }

    for (let i = 0; i < total; i++) {
        if (skips.includes(i)) continue
        let res!: PartialCoverage
        try {
        res = solve_i(i)
        } catch (e) {
            cf_begin()
            cf_log(`${e}`)
        }
        merge_coverage(coverage, res)
    }

    log_coverage(coverage)
})


function solve_i(i: number) {

    let fen = log_puzzles[i].move_fens[0]

    let pos = m.create_position(fen)
    let link = log_puzzles[i].link

    let solution = log_puzzles[i].sans

    let res = gof(m, pos)
    if (res.length === 0) {
      return { n: 1 }
    }
    if (match_solution(res, solution)) {
      return { tp: 1 }
    } else {
       let log = ''
       log += `${i} ${link}`
       log += `\n`
       log += `Solution: ${solution.join(' ')}`
       log += `\n`
       log += res.map(_ => `{ ${_.join(' ')} }`).join('\n')
       return { fp: 1, log }
    }
}


function match_solution(res: string[][], solution: string[]) {
   return res.some(_ => _.join(' ') === solution.join(' '))
}

type Coverage = { tp: number, fp: number, n: number, log: string[] }
type PartialCoverage = { tp: number } | { fp: number, log: string } | { n: number }


function merge_coverage(c: Coverage, res: PartialCoverage) {
   if ((res as any).n === 1) {
      c.n += 1
   }
   if ((res as any).tp === 1) {
      c.tp += 1
   }
   if ((res as any).fp === 1) {
      c.fp += 1
      c.log.push((res as any).log)
   }
}



function log_coverage(c: Coverage) {
    let N = c.n
    let Tp = c.tp
    let Fp = c.fp
    let TpFp = Tp + Fp
    let Total = TpFp + N
    let C_percent: any = Math.round(TpFp / Total * 100)
    let A_percent: any = Math.round(Tp / TpFp * 100)
    if (isNaN(C_percent)) C_percent = '--'
    if (isNaN(A_percent)) A_percent = '--'
    cf_begin()
    cf_log(`Coverage: %${C_percent} Accuracy: %${A_percent}`)
    cf_log(`Tp/Fp: ${Tp}/${Fp} N: ${N}`)
    cf_log('-----******----')
    cf_log(c.log.slice(0, 3).join('\n'))
    cf_log('-----*****----')
    cf_log(`Coverage: %${C_percent} Accuracy: %${A_percent}`)
    cf_log(`Tp/Fp: ${Tp}/${Fp} N: ${N}`)
}


function cf_begin () {
    fs.writeFileSync(__dirname + '/_output.txt', '')
}
function cf_log (str: string) {
    fs.appendFileSync(__dirname + '/_output.txt', str + '\n')
    console.log(str)
}
import fs from 'fs'
import { it } from 'vitest'
import { PositionManager, usage } from '../src'
import { a_hundred } from "./fixture"
// @ts-ignore
import './third.gof?raw'

let m = await PositionManager.make()
let log_puzzles = a_hundred

let data = fs.readFileSync('test/third.gof').toString()
let skips_config = data.split('===')[0].trim().split(' ').map(_ => parseInt(_))
data = data.split('===')[1]

let gof_run = usage(data)

it('works', () => {

    let skips = [...skips_config]

    let onlies = [-1]
    onlies.length = 0

    let fen = 'r1r4k/pp3p1p/3Qb1pP/q3p1PR/4P3/2N2P2/1PP5/2KR1B2 b - - 0 19'
    // fen = ''

    if (fen) {
        let pos = m.create_position(fen)
        let res = gof_run(m, pos)
        console.log(res)
        return
    }

    let single_i = -1
    //single_i =  2764

    if (single_i != -1) {
        console.log(log_puzzles[single_i].link)
        console.log(solve_i(single_i))
        return
    }

    let start_now = performance.now()
    let total = log_puzzles.length
    let coverage: Coverage = { tp: 0, fp: 0, n: 0, log: [], log_positive: [] }

    let ff = []

    for (let i = 0; i < total; i++) {

        if (onlies.length > 0) {
            if (!onlies.includes(i)) {
                continue
            }
        }
        if (skips.includes(i)) continue
        let res!: PartialCoverage
        try {
        res = solve_i(i)
        } catch (e) {
            cf_begin()
            cf_log(`${e}`)
        }
        if ((res as any).fp === 1) {
            ff.push(i)
        }
        merge_coverage(coverage, res)
    }

    let elapsed = performance.now() - start_now
    log_coverage(coverage, elapsed)

    //cf_log(JSON.stringify(ff))
})


function solve_i(i: number) {
    let fen = log_puzzles[i].move_fens[0]

    let pos = m.create_position(fen)
    let link = log_puzzles[i].link

    let solution = log_puzzles[i].sans

    let res = gof_run(m, pos)
    if (res.length === 0) {
      return { n: 1 }
    }
    if (match_solution(res, solution)) {
       let log_positive = ''
       log_positive += `${i} ${link}`
      return { tp: 1, log_positive }
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

type Coverage = { tp: number, fp: number, n: number, log: string[], log_positive: string[] }
type PartialCoverage = { tp: number, log_positive: string } | { fp: number, log: string } | { n: number }


function merge_coverage(c: Coverage, res: PartialCoverage) {
   if ((res as any).n === 1) {
      c.n += 1
   }
   if ((res as any).tp === 1) {
      c.tp += 1
      c.log_positive.push((res as any).log_positive)
   }
   if ((res as any).fp === 1) {
      c.fp += 1
      c.log.push((res as any).log)
   }
}



function log_coverage(c: Coverage, elapsed: number) {
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
    cf_log(`Time: ${Math.floor(elapsed / Total * 10) / 10}ms per puzzle`)
    cf_log(`Coverage: %${C_percent} Accuracy: %${A_percent}`)
    cf_log(`Tp/Fp: ${Tp}/${Fp} N: ${N} Total: ${Total}`)
    cf_log('-----******----')
    //cf_log(c.log.slice(0, 3).join('\n'))
    cf_log(c.log.map(_ => _.split('\n').slice(0, 3).join('\n')).join('\n'))
    cf_log('-----*****----')
    cf_log(`Coverage: %${C_percent} Accuracy: %${A_percent}`)
    cf_log(`Tp/Fp: ${Tp}/${Fp} N: ${N} Total: ${Total}`)
    cf_log(`Time: ${Math.floor(elapsed / Total * 1000) / 1000}ms per puzzle`)
    cf_log('----*** Positives ****----')
    cf_log(c.log_positive.join('\n'))
}


function cf_begin () {
    fs.writeFileSync(__dirname + '/_output3.txt', '')
}
function cf_log (str: string) {
    fs.appendFileSync(__dirname + '/_output3.txt', str + '\n')
    console.log(str)
}
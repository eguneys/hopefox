import fs from 'fs'
import { it } from 'vitest'
import { PositionManager, usage } from '../src'
import { test_b_forks_kr_puzzles } from "./fixture"
// @ts-ignore
import './second.gof?raw'

let m = await PositionManager.make()
let log_puzzles = test_b_forks_kr_puzzles

let data = fs.readFileSync('test/second.gof').toString()

let gof_run = usage(data)

it('works', () => {

    let skips = [7875, 8921, 10462]

    let onlies = [
        489, 1057, 1099, 1403, 2014, 2330, 2780, 3307, 3402, 3703, 4003, 5310, 5379, 5503, 5536, 5762, 6760, 7129, 7875, 8056, 8068, 8383, 8431, 8481, 8664, 8921, 9164, 9319, 9658, 9930, 10462, 10691, 10740, 10749, 11386, 11411, 11488, 11603, 11665, 12067, 12155, 12287, 12765, 12819, 12868, 13266, 13373, 13721, 13822, 14098, 14139, 14371, 14658, 15204, 15459, 15570, 15914, 15976, 16895, 17372, 17785, 17957, 20342, 20401, 20764, 21278, 21354, 21820, 22468, 22940, 23107, 23319, 23361, 23490, 23664, 23704, 23743, 24211, 24409, 24696, 24775, 25636, 25696, 25914, 26694, 26995, 27290, 27384, 27440, 27453, 27659, 28488, 28822, 29002, 29280, 29562, 29639, 29930, 30074, 30327, 30437, 31383, 31482, 31561, 31583, 32090, 32973, 33081, 33290, 33926, 33969, 34316, 34855, 34965, 36622, 37333, 38218, 38286, 38379, 38548, 39956, 39994, 40586, 40789, 40932, 41310, 42989, 43074, 43422, 44287, 44365, 45312, 45721, 47490, 47571, 47986, 48009, 48114, 48241, 50279, 51127, 51321, 51437, 51660, 51684, 52537, 53779, 53858, 54357, 54541, 55026, 55265, 55366, 55663, 55925, 56030, 56223, 56541, 57299, 57378, 57528, 58264, 58658, 58698, 58713, 58988, 59049, 59297, 59552, 59883, 60151, 60160, 60486, 60575, 60624, 61194, 61222, 61316, 61737, 61846, 62271, 62319, 62594, 62636, 62987, 63083, 63453, 63572, 63782, 63943, 64289, 64621, 64670, 64767, 64985, 65103, 65492, 65549, 65901, 66649, 66678, 67468, 67568, 67716, 67892, 67992, 68964, 69202, 69513, 69573, 69808, 70060, 70725, 71030, 71252, 71380, 71450, 71629, 71737, 71987, 72550, 72600, 72730
    ]
    //onlies.length = 0

    let single_i = -1
    //single_i =  16895

    if (single_i != -1) {
        console.log(log_puzzles[single_i].link)
        console.log(solve_i(single_i))
        return
    }

    let start_now = performance.now()
    let total = log_puzzles.length
    let coverage: Coverage = { tp: 0, fp: 0, n: 0, log: [] }

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
        if ((res as any).n !== 1) {
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
    cf_log(c.log.slice(0, 3).join('\n'))
    cf_log('-----*****----')
    cf_log(`Coverage: %${C_percent} Accuracy: %${A_percent}`)
    cf_log(`Tp/Fp: ${Tp}/${Fp} N: ${N} Total: ${Total}`)
    cf_log(`Time: ${Math.floor(elapsed / Total * 1000) / 1000}ms per puzzle`)
}


function cf_begin () {
    fs.writeFileSync(__dirname + '/_output2.txt', '')
}
function cf_log (str: string) {
    fs.appendFileSync(__dirname + '/_output2.txt', str + '\n')
    console.log(str)
}
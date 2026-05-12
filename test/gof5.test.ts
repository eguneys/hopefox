import fs from 'fs'
import { it } from 'vitest'
import { PositionManager, usage, Visual_CompositeNestedGraphNode, Visual_CompositeNestedGraphRoot, visual_node_log } from '../src'
import { a_hundred } from './fixture'
// @ts-ignore
import './fifth.gof?raw'

let m = await PositionManager.make()
let log_puzzles = a_hundred

let data = fs.readFileSync('test/fifth.gof').toString()
let [skips_config_str, only_config_str] = data.split('===')[0].trim().split('\n')

let only_config = only_config_str !== undefined ? parseInt(only_config_str.trim()) : -1
let skips_config = skips_config_str.split(' ').map(_ => parseInt(_))
data = data.split('===')[1]

let gof_run = usage(data)

type Vn = {
    i: number
    tp: Visual_CompositeNestedGraphNode[]
    fp: Visual_CompositeNestedGraphNode[]
    n: Visual_CompositeNestedGraphNode[]
}

type Coverage = Vn[]

function is_positive(node: Visual_CompositeNestedGraphNode, solution: string[]) {
    function false_conditions(node: Visual_CompositeNestedGraphNode): boolean {
        if (node.children.length > 0) {
            return node.children.some(_ => false_conditions(_))
        }

        if (node.data.tags.includes('cond')) {
            return node.data.call[0].witness.length === 0
        }
        return false

    }

    function win_condition(node: Visual_CompositeNestedGraphNode): boolean {
        if (node.children.length > 0) {
            return node.children.some(_ => win_condition(_))
        }

        if (node.data.tags.includes('win')) {
            if (node.data.call[0].witness.length > 0) {
                for (let w of temporary_dedup(node.data.call[0].witness)) {
                    if (w.join(' ') === solution.join(' ')) {
                        return true
                    }
                }
            }
        }
        return false
    }

    if (false_conditions(node)) {
        return false
    }
    return win_condition(node)
}

function is_false_positive(node: Visual_CompositeNestedGraphNode) {
    return false
}

function bucket_res(res: Visual_CompositeNestedGraphRoot, solution: string[]) {

    let tp: Visual_CompositeNestedGraphNode[] = []
    let fp: Visual_CompositeNestedGraphNode[] = []
    let n: Visual_CompositeNestedGraphNode[] = []

    for (let node of res) {
         if (is_positive(node, solution)) {
            tp.push(node)
        } else if (is_false_positive(node)) {
            fp.push(node)
        } else {
            n.push(node)
        }
    }
    return { tp, fp, n }
}

function find_Vn(i: number) {

    let solution = log_puzzles[i].sans

    let pos = m.create_position(log_puzzles[i].move_fens[0])
    let res = gof_run(m, pos)
    m.delete_position(pos)

    let { tp, fp, n } = bucket_res(res, solution)

    return {
        i,
        tp,
        fp,
        n
    }
}

it('works', () => {

    let skips = [...skips_config]

    let start_now = performance.now()
    let total = log_puzzles.length / 7000
    let coverage: Coverage = []

    let should_break = false
    for (let i = 0; i < total; i++) {
        if (skips.includes(i)) continue
        if (only_config !== -1) {
            i = only_config
            should_break = true
        }
        try {
            coverage.push(find_Vn(i))
        } catch (e) {
            cf_begin()
            cf_log(`${e}`)
            break
        }
        if (should_break) {
            break
        }
    }

    let N = coverage.filter(_ => _.tp.length === 0 && _.fp.length === 0)
    let Fp = coverage.filter(_ => _.tp.length === 0 && _.fp.length > 0)
    let Tp = coverage.filter(_ => _.tp.length > 0)

    let elapsed = performance.now() - start_now
    cf_begin()
    log_coverage(N.length, Fp.length, Tp.length, elapsed)
    log_trees(N, Fp, Tp)
    log_coverage(N.length, Fp.length, Tp.length, elapsed)
})

function log_positives(aa: Vn[]) {
    for (let i = 0; i < Math.min(10, aa.length); i++) {
        let a = aa[i]
        cf_log(`${a.i} ${log_puzzles[a.i].link}`)
        cf_log(`[${log_puzzles[a.i].sans.join(' ')}]`)
        if (i > 2) continue
        for (let tp of a.tp) {
            cf_log(visual_node_log([tp]))
            break
        }
    }
}
function log_false_positives(aa: Vn[]) {
    for (let i = 0; i < Math.min(10, aa.length); i++) {
        let a = aa[i]
        cf_log(`${a.i} ${log_puzzles[a.i].link}`)
        cf_log(`[${log_puzzles[a.i].sans.join(' ')}]`)
        if (i > 2) continue
        for (let fp of a.fp) {
            cf_log(visual_node_log([fp]))
            break
        }
    }
}
function log_negatives(aa: Vn[]) {
    for (let i = 0; i < Math.min(10, aa.length); i++) {
        let a = aa[i]
        cf_log(`${a.i} ${log_puzzles[a.i].link}`)
        cf_log(`[${log_puzzles[a.i].sans.join(' ')}]`)
        if (i > 2) continue
        for (let n of a.n) {
            cf_log(visual_node_log([n]))
            break
        }
    }
}

function log_trees(N: Vn[], Fp: Vn[], Tp: Vn[]) {

    cf_log(`----*** Positives ****----`)
    log_positives(Tp)
    cf_log(`----*** False Positives ****----`)
    log_false_positives(Fp)
    cf_log(`----*** Negatives ****----`)
    log_negatives(N)

}

function log_coverage(N: number, Fp: number, Tp: number, elapsed: number) {
    let TpFp = Tp + Fp
    let Total = TpFp + N
    let C_percent: any = Math.round(TpFp / Total * 100)
    let A_percent: any = Math.round(Tp / TpFp * 100)
    if (isNaN(C_percent)) C_percent = '--'
    if (isNaN(A_percent)) A_percent = '--'
    cf_log(`Time: ${Math.floor(elapsed / Total * 10) / 10}ms per puzzle took ${Math.round(elapsed/1000)}s`)
    cf_log(`Coverage: %${C_percent} Accuracy: %${A_percent}`)
    cf_log(`Tp/Fp: ${Tp}/${Fp} N: ${N} Total: ${Total}`)
}

function cf_begin () {
    fs.writeFileSync(__dirname + '/_output5.txt', '')
}
function cf_log (str: string) {
    fs.appendFileSync(__dirname + '/_output5.txt', str + '\n')
    console.log(str)
}


function temporary_dedup(arr: string[][]) {
    let dd = new Set()
    let res = []

    for (let i = 0; i < arr.length; i++) {
        let str = arr[i].join(' ')
        if (!dd.has(str)) {
            dd.add(str)
            res.push(arr[i])
        }
    }
    return res
}
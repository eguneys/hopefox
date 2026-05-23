import { it } from 'vitest'
import { GofUsage, PositionManager, usage, Visual_CompositeNestedGraphNode, visual_node_log } from '../src'
import fs from 'fs'
import { cf_begin, cf_log, export_log, export_log_append, generateHash, log_coverage, solve_in_lines } from './gof6.test'
import { bucket_res, visual_data_score } from './gof5.test'
import { parse_puzzles, Puzzle } from './fixture'

// @ts-ignore
const modules = import.meta.glob('./categofer_work/scripts/*.gof?raw')

let m = await PositionManager.make()

it('works', async () => {
    await categorize_run_with_cache()
}, { timeout: 1000000 })

async function categorize_run_with_cache() {

    let scripts_base_dir = import.meta.dirname + '/categofer_work/scripts'
    let logs_base_dir = import.meta.dirname + '/categofer_work/x_logs'


    if (!fs.existsSync(logs_base_dir)) {
        fs.mkdirSync(logs_base_dir)
    }

    let res = fs.readdirSync(scripts_base_dir)

    let scripts = res.filter(_ => _.split('.')[1] === 'gof')

    scripts.sort()


    let hashes_path = logs_base_dir + '/hashes.txt'

    if (!fs.existsSync(hashes_path)) {
        fs.writeFileSync(hashes_path, '{}')
    }
    let hashes = JSON.parse(fs.readFileSync(hashes_path).toString())

    for (let script_dot_gof of scripts) {

        let filename = script_dot_gof.split('.')[0]

        let script_path = scripts_base_dir + `/${script_dot_gof}`
        let output_base_path = `${logs_base_dir}/${filename}`

        let aa = fs.readFileSync(script_path).toString()

        let existing_hash = hashes[script_path]

        let hash = generateHash(aa)
        if (hash === existing_hash) {
            continue
        }
        hashes[script_path] = hash

        let m = aa.match(/input=([^\s]*)/)

        if (m) {
            let input_end_path = m[1]

            let input_path = `data/${input_end_path}`
            if (!fs.existsSync(input_path)) {
                input_path = `${logs_base_dir}/${input_end_path}`
                if (!fs.existsSync(input_path)) {
                    console.warn(`Input File doesn't exist ${input_path} for ${script_path}`)
                    continue
                }
            }


            let res = make_gof_runner_categorize(script_path, input_path, output_base_path)

            await res()
        }
    }


    fs.writeFileSync(hashes_path, JSON.stringify(hashes))
}



function make_gof_runner_categorize(script_path: string, input_path: string, output_base_path: string) {

    let data = fs.readFileSync(script_path).toString()
    let [skips_config_str, only_config_str] = data.split('===')[0].trim().split('\n')

    let only_config = only_config_str !== undefined ? parseInt(only_config_str.trim()) : -1
    let skips_config = skips_config_str.split(' ').map(_ => parseInt(_))
    data = data.split('===')[1]

    data.split('\n').map(_ => {
        let m = _.match(/only=(\d*)/)

        if (m) {
            only_config = parseInt(m[1])
        }
    })

    let gof_run = usage(data)

    return async () => {

        let output_path = `${output_base_path}._output.txt`
        await runner(gof_run, output_base_path, input_path, skips_config, only_config)
    }
}


async function runner(gof_run: GofUsage, base_path: string, input_path: string, skips: number[], only_config: number) {

    let output_path = `${base_path}._output.txt`


    let start_now = performance.now()
    let total = 0
    let coverage: Coverage = []

    let N_length = 0
    let Tp_length = 0
    let Fp_length = 0

    await solve_in_lines(input_path, async (line: string, i: number) => {

        if (i % 10000 === 0) {
            cf_begin(output_path)
            cf_log(output_path, input_path.split('/').slice(-2).join('/'))
            cf_log(output_path, `Progress nb: ${i}`)
        }

        if (i % 100000 === 0) {

            let N = coverage.filter(_ => _.tp.length === 0 && _.fp.length === 0)
            let Fp = coverage.filter(_ => _.tp.length === 0 && _.fp.length > 0)
            let Tp = coverage.filter(_ => _.tp.length > 0)

            N_length += N.length
            Tp_length += Tp.length
            Fp_length += Fp.length

            export_log_append_input_output(base_path, N, Fp, Tp, i === 0)

            coverage = []
        }

        let should_break = false
        if (skips.includes(i)) return false
        if (only_config !== -1) {
            i = only_config
            should_break = true
        }
        try {
            coverage.push(find_Vn(gof_run, parse_puzzles(line)[0], i))
        } catch (e) {
            cf_begin(output_path)
            cf_log(output_path, `${i}, ${line}, ${e}`)
            return false
        }
        if (should_break) {
            return true
        }

        return false
    })

    cf_begin(output_path)
    cf_log(output_path, input_path.split('/').slice(-2).join('/'))
    let N = coverage.filter(_ => _.tp.length === 0 && _.fp.length === 0)
    let Fp = coverage.filter(_ => _.tp.length === 0 && _.fp.length > 0)
    let Tp = coverage.filter(_ => _.tp.length > 0)

    N_length += N.length
    Tp_length += Tp.length
    Fp_length += Fp.length



    let elapsed = performance.now() - start_now
    log_coverage(output_path, N_length, Fp_length, Tp_length, elapsed)
    log_trees(base_path, N, Fp, Tp)
    log_coverage(output_path, N_length, Fp_length, Tp_length, elapsed)

    export_log_append_input_output(base_path, N, Fp, Tp, false)
}



export function find_Vn(gof_run: GofUsage, puzzle: Puzzle, i: number): Vn {

    let { line, link, sans } = puzzle
    let solution = puzzle.sans

    let pos = m.create_position(puzzle.move_fens[0])
    let res = gof_run(m, pos)
    m.delete_position(pos)

    let { tp, fp, n } = bucket_res(res, solution)

    return {
        i,
        tp,
        fp,
        n,
        line,
        link,
        sans
    }
}

function export_log_append_input_output(base_path: string, N: Vn[], Fp: Vn[], Tp: Vn[], first_time: boolean) {
    let false_positives_path = `${base_path}._false_positives.input`
    let true_positives_path = `${base_path}._true_positives.input`
    let negatives_path = `${base_path}._negatives.input`

    if (first_time) {
        export_log(true_positives_path, Tp.map(_ => _.line).join('\n'))
        export_log(false_positives_path, Fp.map(_ => _.line).join('\n'))
        export_log(negatives_path, N.map(_ => _.line).join('\n'))
    } else {
        export_log_append(true_positives_path, Tp.map(_ => _.line).join('\n'))
        export_log_append(false_positives_path, Fp.map(_ => _.line).join('\n'))
        export_log_append(negatives_path, N.map(_ => _.line).join('\n'))
    }
}


function log_trees(base_path: string, N: Vn[], Fp: Vn[], Tp: Vn[]) {

    let path = `${base_path}._output.txt`

    cf_log(path, `----*** False Positives ****----`)
    log_false_positives(Fp)
    cf_log(path, `----*** Negatives ****----`)
    log_negatives(N)
    cf_log(path, `----*** Positives ****----`)
    log_positives(Tp)


    function log_positives(aa: Vn[]) {
        for (let i = 0; i < Math.min(10, aa.length); i++) {
            let a = aa[i]
            cf_log(path, `${a.i} ${a.link}`)
            cf_log(path, `[${a.sans.join(' ')}]`)
            if (i > 2) continue
            for (let tp of a.tp) {
                cf_log(path, visual_node_log([tp]))
                break
            }
        }
    }
    function log_false_positives(aa: Vn[]) {
        for (let i = 0; i < Math.min(10, aa.length); i++) {
            let a = aa[i]
            cf_log(path, `${a.i} ${a.link}`)
            cf_log(path, `[${a.sans.join(' ')}]`)
            if (i > 2) continue
            for (let fp of a.fp) {
                cf_log(path, visual_node_log([fp]))
                break
            }
        }
    }
    function log_negatives(aa: Vn[]) {
        for (let i = 0; i < Math.min(10, aa.length); i++) {
            let a = aa[i]
            cf_log(path, `${a.i} ${a.link}`)
            cf_log(path, `[${a.sans.join(' ')}]`)
            if (i > 2) continue
            a.n.sort((a, b) => visual_data_score(b) - visual_data_score(a))
            for (let n of a.n) {
                cf_log(path, visual_node_log([n]))
                break
            }
        }
    }

}

export type Vn = {
    i: number
    line: string
    sans: string[]
    link: string
    tp: Visual_CompositeNestedGraphNode[]
    fp: Visual_CompositeNestedGraphNode[]
    n: Visual_CompositeNestedGraphNode[]
}

export type Coverage = Vn[]
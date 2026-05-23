import fs from 'fs'
import { it } from 'vitest'
import { bucket_res, Coverage, visual_data_score, Vn } from './gof5.test'
import { parse_puzzles, Puzzle } from './fixture'
import { GofUsage, PositionManager, usage, visual_node_log } from '../src'

let m = await PositionManager.make()


function categorize_run_with_cache() {

    let scripts_base_dir = import.meta.dirname + '/categofer_work/scripts'
    let logs_base_dir = import.meta.dirname + '/categofer_work/logs'

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
            let input_path = m[1]

            if (!fs.existsSync(input_path)) {
                console.warn(`Input File doesn't exist ${input_path} for ${script_path}`)
                continue
            }


            let res = make_gof_runner_categorize(script_path, input_path, output_base_path)

            res()
        }
    }


    fs.writeFileSync(hashes_path, JSON.stringify(hashes))
}

it('works', () => {
    categorize_run_with_cache()
})


function make_gof_runner_categorize(script_path: string, input_path: string, output_base_path: string) {


    const log_puzzles = parse_puzzles(fs.readFileSync(input_path).toString())

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

    return () => {

        let output_path = `${output_base_path}._output.text`
        cf_begin(output_path)
        cf_log(output_path, input_path)
        runner(gof_run, output_base_path, log_puzzles, skips_config, only_config)
    }

}



function runner(gof_run: GofUsage, base_path: string, log_puzzles: Puzzle[], skips: number[], only_config: number) {

    let output_path = `${base_path}._output.text`

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




    let start_now = performance.now()
    let total = log_puzzles.length
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
            cf_begin(output_path)
            cf_log(output_path, `${e}`)
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
    log_coverage(output_path, N.length, Fp.length, Tp.length, elapsed)
    log_trees(base_path, log_puzzles, N, Fp, Tp)
    log_coverage(output_path, N.length, Fp.length, Tp.length, elapsed)
}


export function cf_begin(path: string) {
    fs.writeFileSync(path, '')
}
export function cf_log(path: string, str: string) {
    fs.appendFileSync(path, str + '\n')
    console.log(str)
}

export function export_log(path: string, str: string) {
    fs.writeFileSync(path, str)
}


function log_coverage(path: string, N: number, Fp: number, Tp: number, elapsed: number) {
    let TpFp = Tp + Fp
    let Total = TpFp + N
    let C_percent: any = Math.round(TpFp / Total * 100)
    let A_percent: any = Math.round(Tp / TpFp * 100)
    if (isNaN(C_percent)) C_percent = '--'
    if (isNaN(A_percent)) A_percent = '--'
    cf_log(path, `Time: ${Math.floor(elapsed / Total * 10) / 10}ms per puzzle took ${Math.round(elapsed/1000)}s`)
    cf_log(path, `Coverage: %${C_percent} Accuracy: %${A_percent}`)
    cf_log(path, `Tp/Fp: ${Tp}/${Fp} N: ${N} Total: ${Total}`)
}

function log_trees(base_path: string, log_puzzles: Puzzle[], N: Vn[], Fp: Vn[], Tp: Vn[]) {

    let path = `${base_path}._output.text`
    let false_positives_path = `${base_path}._false_positives.txt`
    let true_positives_path = `${base_path}._true_positives.txt`
    let negatives_path = `${base_path}._negatives.txt`


    cf_log(path, `----*** False Positives ****----`)
    log_false_positives(Fp)
    cf_log(path, `----*** Negatives ****----`)
    log_negatives(N)
    cf_log(path, `----*** Positives ****----`)
    log_positives(Tp)


    function log_positives(aa: Vn[]) {
        for (let i = 0; i < Math.min(10, aa.length); i++) {
            let a = aa[i]
            cf_log(path, `${a.i} ${log_puzzles[a.i].link}`)
            cf_log(path, `[${log_puzzles[a.i].sans.join(' ')}]`)
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
            cf_log(path, `${a.i} ${log_puzzles[a.i].link}`)
            cf_log(path, `[${log_puzzles[a.i].sans.join(' ')}]`)
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
            cf_log(path, `${a.i} ${log_puzzles[a.i].link}`)
            cf_log(path, `[${log_puzzles[a.i].sans.join(' ')}]`)
            if (i > 2) continue
            a.n.sort((a, b) => visual_data_score(b) - visual_data_score(a))
            for (let n of a.n) {
                cf_log(path, visual_node_log([n]))
                break
            }
        }
    }

    export_log(true_positives_path, Tp.map(_ => log_puzzles[_.i].line).join('\n'))
    export_log(false_positives_path, Fp.map(_ => log_puzzles[_.i].line).join('\n'))
    export_log(negatives_path, N.map(_ => log_puzzles[_.i].line).join('\n'))
}


export const generateHash = (str: string) => {
  let hash = 0;
  for (const char of str) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0; // Constrain to 32bit integer
  }
  return hash;
};
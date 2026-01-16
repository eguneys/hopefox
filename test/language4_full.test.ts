import { it } from 'vitest'
import { puzzles } from './fixture'
import { bindings, extract_line, extract_sans, fen_pos, PositionManager } from '../src'
import { rules2_1 } from './answer_fixtures2'

let base_rules = `${rules2_1}`

it.skip('works', () => {
    solve_lines_4(0)
})


it('works bench', () => {
    let ten0_skips = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    let ten1_skips = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
    let ten2_skips = [21, 22, 23, 24, 25, 26, 27, 28, 29, 30]
    let ten3_skips = [31, 32, 33, 34, 35, 36, 37, 38, 39, 40]
    let ten4_skips = [41, 42, 43, 44, 45, 46, 47, 48, 49, 50]
    let ten5_skips = [51, 52, 53, 54, 55, 56, 57, 58, 59, 60]

    let ten6_skips = [61, 62, 63, 64, 65, 66, 67, 68, 69, 70]
    let ten7_skips = [71, 72, 73, 74, 75, 76, 77, 78, 79, 80]
    let ten8_skips = [81, 82, 83, 84, 85, 86, 87, 88, 89, 90]
    let ten9_skips = [91, 92, 93, 94, 95, 96, 97, 98, 99, 100]


    bench_only(ten6_skips)
    bench_only(ten7_skips)
    bench_only(ten8_skips)
    bench_only(ten9_skips)
    return
    //console.log(solve_lines_4(23))
    bench_only(ten0_skips)
    bench_only(ten1_skips)
    bench_only(ten2_skips)
    bench_only(ten3_skips)
    bench_only(ten4_skips)
    bench_only(ten5_skips)
})


function bench_only(skips: number[]) {
  let res = []
  for (let i = 0; i < skips.length; i++) {
    render(i + ':' + skips[i])
    if (!solve_lines_4(skips[i])) {
      res.push(skips[i])
    }
  }
  return res
}

let m = await PositionManager.make()
function solve_lines_4(i: number, rules = base_rules) {
    let pos2 = fen_pos(puzzles[i].move_fens[0])
    let pos = m.create_position(puzzles[i].move_fens[0])
    let res = bindings(m, pos, rules)

    let lines: string[] = []
    for (let i = 0; i < 150; i++) {
        let binding = res.get('binding' + i)
        if (!binding) {
            break
        }
        let rows = binding.get_relation_starting_at_world_id(0).rows.map(row => {
            let aa = extract_line(row)

            let resaa = extract_sans(pos2, aa)
            if (resaa.length > 0) {
                lines.push(resaa.join(' '))
            }
        })
    }


    let sans = puzzles[i].sans.join(' ')

    //console.log(lines, sans, lines.includes(sans))
    if (!lines.includes(sans)) {

        console.log(puzzles[i].link)

        console.log(sans, `expected [#${i}] got: `, lines)
        return false
  }


  return true
}



import fs from 'fs'

function render(data: string) {
    fs.writeFileSync(__dirname + '/_output.txt', data)
}


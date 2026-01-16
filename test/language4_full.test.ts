import { it } from 'vitest'
import { puzzles } from './fixture'
import { bindings, extract_line, extract_sans, fen_pos, PositionManager } from '../src'
import { rules2_1 } from './answer_fixtures2'

let base_rules = `${rules2_1}`

it('works', () => {
    solve_lines_4(0)
})

let m = await PositionManager.make()
function solve_lines_4(i: number, rules = base_rules) {
    let pos2 = fen_pos(puzzles[i].move_fens[0])
    let pos = m.create_position(puzzles[i].move_fens[0])
    let res = bindings(m, pos, rules)

    let lines: string[] = []
    let rows = res.get('binding0')!.get_relation_starting_at_world_id(0).rows.map(row => {
        let aa = extract_line(row)

        let resaa = extract_sans(pos2, aa)
        if (resaa.length > 0) {
            lines.push(resaa.join(' '))
        }
    })


    console.log(lines)


}
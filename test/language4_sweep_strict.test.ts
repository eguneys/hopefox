import { it } from 'vitest'
import { render } from './util'
import { puzzles } from './fixture'
import { bindings, extract_line, extract_sans, fen_pos, PositionManager } from '../src'

let rules = `
binding
  rook_checks_king_moves


legal rook_checks_king_moves

fact rook_checks_king
  .from = check.from
  .to = check.to
  check.piece = Rook
  check.to_piece = King


fact check
 alias occ occupies
 .from = attacks2.from
 .to = attacks2.to
 .to2 = attacks2.to2
 .piece = occupies.piece
 .to_piece = occ.piece
 attacks2.from = occupies.square
 attacks2.to2 = occ.square
 attacks2.from != attacks2.to2
 occupies.color != occ.color


fact check_king
 .from = check.from
 .to = check.to
 .to2 = check.to2
 .piece = check.piece
 check.to_piece = King
`

it('works', () => {
    let [yes, no, ignore] = sweep(rules)

    console.log(`yes: ${yes.length} no: ${no.length} ignore: ${ignore.length}`)
    console.log(no)
})



function sweep(rules: string) {
    let yes = []
    let no = []
    let ignore = []
    for (let i = 0; i < 100; i++) {
        let res = loose_solve_lines_4(i, rules)
        if (res === 'yes') {
            render(i + `+ PASS #${yes.length}/${no.length}/${ignore.length}`)
            yes.push(i)
        }
        if (res ===  'no') {
            render(i + `- PASS #${yes.length}/${no.length}/${ignore.length}`)
            no.push(i)
        }
        if (res === 'ignore') {
            render(i + `- PASS #${yes.length}/${no.length}/${ignore.length}`)
            ignore.push(i)
        }
    }
    return [yes, no, ignore]
}

type SAN = string
let m = await PositionManager.make()
function loose_solve_lines_4(i: number, rules: string) {
    let pos2 = fen_pos(puzzles[i].move_fens[0])
    let pos = m.create_position(puzzles[i].move_fens[0])
    let res = bindings(m, pos, rules)

    let lines: SAN[][] = []
    for (let i = 0; i < 150; i++) {
        let binding = res.get('binding' + i)
        if (!binding) {
            break
        }
        let rows = binding.get_relation_starting_at_world_id(0).rows.map(row => {
            let aa = extract_line(row)

            let resaa = extract_sans(pos2, aa)
            if (resaa.length > 0) {
                lines.push(resaa)
            }
        })
    }


    let sans = puzzles[i].sans

    if (lines.length > 0) {
        if (lines.find(line => line[0] === sans[0])) {
            return 'yes'
        }
        return 'no'
    }

    return 'ignore'
}
import { it } from 'vitest'

let rules_0 = `
binding
  knight_forks_bishop_and_queen_moves

  queen_evades_fork_moves

  knight_captures_bishop_moves

legal knight_captures_bishop_moves

fact knight_captures_bishop
  .from = captures.from
  .to = captures.to
  captures.piece = Knight
  captures.to_piece = Bishop


fact captures
  alias occ occupies
  .from = attacks.from
  .to = attacks.to
  .piece = occupies.piece
  .to_piece = occ.piece
  attacks.from = occupies.square
  attacks.to = occ.square
  occupies.color != occ.color



legal queen_evades_fork_moves


fact queen_evades_fork
  .from = attacks.from
  .to = attacks.to
  attacks.from = occupies.square
  occupies.piece = Queen


legal knight_forks_bishop_and_queen_moves

fact knight_forks_bishop_and_queen
  .from = fork_a_b.from
  .to = fork_a_b.to
  fork_a_b.piece = Knight
  fork_a_b.piece_a = Bishop
  fork_a_b.piece_b = Queen


fact fork_a_b
  alias occ_a occupies
  alias occ_b occupies
  alias fork_a attacks2
  alias fork_b attacks2
  .from = fork_a.from
  .to = fork_a.to
  .to_a = fork_a.to2
  .to_b = fork_b.to2
  .piece = occupies.piece
  .piece_a = occ_a.piece
  .piece_b = occ_b.piece
  fork_a.from = fork_b.from
  fork_a.to = fork_b.to
  fork_a.to2 != fork_b.to2
  fork_a.from = occupies.square
  fork_a.to2 = occ_a.square
  fork_b.to2 = occ_b.square
  occupies.color != occ_a.color
  occupies.color != occ_b.color
`

it.skip('works', () => {

    console.log(puzzles[738].link)
    console.log(puzzles[957].link)
})


it.skip('works', () => {

    let pass = []
    for (let i = 0; i < 1000; i++) {
        if (solve_lines_4(i, rules_0)) {
            render(i + `+ PASS #${pass.length}`)
            pass.push(i)
        } else {
            render(i + `- PASS #${pass.length}`)
        }
    }
    console.log(pass)

})



let m = await PositionManager.make()
function solve_lines_4(i: number, rules: string) {
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

        //console.log(puzzles[i].link)

        //console.log(sans, `expected [#${i}] got: `, lines)
        return false
  }


  return true
}



import fs from 'fs'
import { bindings, extract_line, extract_sans, fen_pos, PositionManager } from '../src'
import { puzzles } from './fixture'

function render(data: string) {
    fs.writeFileSync(__dirname + '/_output.txt', data)
}


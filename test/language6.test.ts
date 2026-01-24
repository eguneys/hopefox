import { it } from 'vitest'
import { puzzles } from './fixture'
import { extract_sans_relation, PositionManager, Search6 } from '../src'

let m = await PositionManager.make()

it.skip('links', () => {
    console.log(puzzles[0].link)
    console.log(puzzles[1].link)
    console.log(puzzles[2].link)
    console.log(puzzles[3].link)
})

it('works', () => {
    let rules = `
fact friendly_goes
 alias occ occupies
 .from = attacks.from
 .to = attacks.to
 attacks.from = occupies.on
 attacks.to = occ.on
 occ.color = occupies.color

idea checks
  alias occ occupies
  move checks attacks
  .from = checks.from
  .to = checks.to
  .start_world_id = checks.start_world_id
  .end_world_id = checks.end_world_id
  checks.attacks.to2 = occupies.on
  occupies.piece = King
  checks.from = occ.on
  occupies.color != occ.color


idea
  move checks
`
    let i = 0
    let pos = m.create_position(puzzles[i].move_fens[0])
    pos = m.create_position(puzzles[i].move_fens[0])


    console.log(puzzles[i].link)
    let res = Search6(m, pos, rules)

    //console.log(extract_sans_relation(m, pos, res[0].get_relation_starting_at_world_id(0)))
    console.log(puzzles[i].link)
})
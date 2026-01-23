import { it } from 'vitest'
import { extract_sans, PositionManager, Rs, Search } from '../src'
import { puzzles } from './fixture'

let m = await PositionManager.make()

it.skip('links', () => {
    console.log(puzzles[0].link)
    console.log(puzzles[1].link)
    console.log(puzzles[2].link)
    console.log(puzzles[3].link)
})

it.skip('works', () => {
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
    let res = Search(m, pos, rules)

    console.log(extract_sans(m, pos, res[0].get_relation_starting_at_world_id(0)))
    console.log(puzzles[i].link)
})

it.skip('move works', () => {

let rules = `
fact friendly_goes
 alias occ occupies
 attacks.from = occupies.square
 attacks.to = occ.square
 occ.color = occupies.color

fact goes
 .from = attacks.from
 .to = attacks.to
 .start_world_id = attacks.start_world_id
 .end_world_id = attacks.end_world_id
 attacks.from = occupies.on

idea checks
  alias occ occupies
  move checks attacks
  .from = checks.from
  .to = checks.to
  .start_world_id = checks.start_world_id
  .end_world_id = checks.end_world_id
  checks.to = checks.attacks.from2
  checks.attacks.to2 = occupies.on
  occupies.piece = King
  checks.from = occ.on
  occupies.color != occ.color

idea check_replies
  line blocks checks.goes

idea g2
 .from = one.from
 .to = one.to
 .start_world_id = one.start_world_id
 .end_world_id = one.end_world_id
 move one goes
 one.from = one.from

idea
line goes
line check_replies.blocks
`

let fen = '6k1/p4ppp/8/8/4r3/P7/1P1R1PPP/K7 b - - 0 26'
/*
  let i = 6
  let pos = m.create_position(puzzles[i].move_fens[0])
  pos = m.create_position(puzzles[i].move_fens[0])
  */

  let i = 0
  let pos = m.create_position(fen)
  pos = m.create_position(fen)


  console.log(puzzles[i].link)
  let res = Search(m, pos, rules)

  console.log(extract_sans(m, pos, res[0].get_relation_starting_at_world_id(0)))
  console.log(puzzles[i].link)


})


it('idea more moves works', () => {

let rules = `
fact friendly_goes
 alias occ occupies
 attacks.from = occupies.square
 attacks.to = occ.square
 occ.color = occupies.color

fact unsafe_goes
 alias occ occupies
 alias att2 attacks
 attacks.from = occupies.square
 attacks.to = att2.to
 att2.from = occ.square
 occ.color != occupies.color

fact safe_goes
 alias _ attacks - friendly_goes
 alias _ _ - unsafe_goes


idea checks
  alias occ occupies
  move checks attacks
  .from = checks.from
  .to = checks.to
  .start_world_id = checks.start_world_id
  .end_world_id = checks.end_world_id
  checks.to = checks.attacks.from2
  checks.attacks.to2 = occupies.on
  occupies.piece = King
  checks.from = occ.on
  occupies.color != occ.color

idea check_replies
  move one checks
  move evades one.safe_goes
  move captures one.captures
  move blocks one.blocks

idea
  line check_replies.evades
`

  let i = 0
  let pos = m.create_position(puzzles[i].move_fens[0])
  pos = m.create_position(puzzles[i].move_fens[0])

  console.log(puzzles[i].link)
  let res = Search(m, pos, rules)

  console.log(extract_sans(m, pos, res[0].get_relation_starting_at_world_id(0)))
  console.log(puzzles[i].link)


})




let rules = `
fact friendly_goes
 alias occ occupies
 attacks.from = occupies.square
 attacks.to = occ.square
 occ.color = occupies.color

fact unsafe_goes
 alias occ occupies
 alias att2 attacks
 attacks.from = occupies.square
 attacks.to = att2.to
 att2.from = occ.square
 occ.color != occupies.color

fact safe_goes
 alias _ attacks - friendly_goes
 alias _ _ - unsafe_goes

idea checks
  move checks attacks
  checks.attacks.to = occupies.square
  occupies.square = King

idea check_replies
  move checks checks
  move evades checks.safe_goes
  move captures checks.captures
  move blocks checks.blocks

idea checkmate
  move check_replies.checks
  !check_replies.blocks
  !check_replies.captures
  !check_replies.evades

idea only_blockable_checks
  !check_replies.captures
  !check_replies.evades
  move check_replies.blocks

idea checkmate2
  move check_blocks only_blockable_checks
  move capture_checks check_blocks.captures and
                      check_blocks.checks
  capture_checks.to = check_blocks.to

idea block_or_capture_checks
  !check_replies.evades
  move check_replies.blocks or
       check_replies.captures

idea
 move one unblocks_attack_on_queen and
          forks_queen_and_rook and
          sacrifices_knight
 move two one.accepts_sacrifice and
          one.sacrifices_queen
 move thr two.accepts_sacrifice


idea
 move one check_replies.evades and
          ignore_mate_threat
 side one.only_capturable_checks
 move two one.sacrifice_queen and
          one.remove_mating_support
 move three two.accepts_sacrifice
`



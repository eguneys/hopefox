import { it } from 'vitest'
import { parse_program } from '../src'

it('works', () => {

    let res = parse_program(`
fact pressures
     .from = attacks.from
     .to = attacks.to
  attacks.to = occupies.square
  occupies.color = turn

fact check
     .from = attacks2.from
     .to = attacks2.to
     .check = attacks2.to2
  attacks2.to2 = occupies.square
  occupies.color = turn

fact capture
     .from = attacks.from
     .to = attacks.to
  attacks.to = occupies.square

fact block
     .blocks.from = attacks.from
     .blocks.to = attacks.to
     .blocks.block_from = pressures.from
     .blocks.block_to = pressures.to
  attacks.to between pressures.from pressures.to



fact fork
  alias a2 attacks
     .fork.from = attacks.from
     .fork.to1 = attacks.to
     .forks.to2 = a2.to
  attacks.from = a2.from
  attacks.to != a2.to


idea blockable_check
   line block check
     .blockable_check.from = block.from
     .blockable_check.to = block.to
     .blockable_check.check_from = check.from
     .blockable_check.check_to = check.to
  block.block_from = check.to
  block.block_to = check.check

idea double_capture
  alias c2 capture
  alias c3 capture
  alias c4 capture
  line capture c2 c3 c4
    .double_capture.from = capture.from
    .double_capture.to = capture.to
    .double_capture.from2 = c2.from
    .double_capture.from3 = c3.from
    .double_capture.from4 = c4.from
  c2.to = capture.to
  c3.to = c2.to
  
idea check_to_lure_into_double_capture
  line blockable_check double_capture
     .check_to_lure_into_double_capture.from = blockable_check.check_from
  blockable_check.check_from = double_capture.from
  blockable_check.to = double_capture.to
`)


    console.log(res)
})
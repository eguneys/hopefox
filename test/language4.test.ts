import { it } from 'vitest'
import { bindings, extract_line, extract_sans, fen_pos, PositionManager, relations } from '../src'
import { puzzles } from './fixture'

let m = await PositionManager.make()

let base_rules = `
fact accept_sacrifice
  alias occ occupies
  .from = attacks.from
  .to = attacks.to
  attacks.from = occupies.square
  attacks.to = occ.square
  occupies.color != occ.color
  occupies.piece = Pawn
  

legal accept_sacrifice_moves

legal setup_discovered_check_on_king_moves

legal skewer_queen_rook_moves

legal sacrifice_bishop_to_pawn_moves

fact setup_discovered_check
  alias occ occupies
  alias occ2 occupies
  .d_from = attacks_through.from
  .d_to = attacks_through.to
  .t_piece = occ.piece
  .to = attacks_through.block
  .from = attacks.from
  attacks_through.block = attacks.to
  attacks_through.to = occ.square
  attacks.from = occupies.square
  attacks_through.from = occ2.square
  attacks.from != attacks_through.from
  attacks.from != attacks_through.to
  occ.color != occupies.color
  occupies.color = occ2.color


fact setup_discovered_check_on_king
  alias sdc setup_discovered_check
  .from = sdc.from
  .to = sdc.to
  sdc.t_piece = King

fact skewer_queen_rook
  .from = skewer.from
  .to = skewer.to
  skewer.piece = Bishop
  skewer.through_piece = Rook 
  skewer.block_piece = Queen

fact skewer
  alias occ occupies
  alias occ2 occupies
  .from = attacks2_through.from
  .to = attacks2_through.to
  .to2 = attacks2_through.to2
  .piece = occupies.piece
  .through_piece = occ.piece
  .block_piece = occ2.piece
  attacks2_through.from = occupies.square
  attacks2_through.to2 = occ.square
  attacks2_through.block = occ2.square


fact sacrifice_bishop_to_pawn
  .from = sacrifice_to_pawn.from
  .to = sacrifice_to_pawn.to
  sacrifice_to_pawn.piece = Bishop

fact sacrifice_to_pawn
  alias att attacks
  alias occ occupies
 .from = attacks.from
 .to = attacks.to
 .piece = occupies.piece
 attacks.from = occupies.square
 attacks.to = att.to
 att.from = occ.square
 occ.piece = Pawn
 occ.color != occupies.color


`

it.skip('works', () => {

    let rules = `
idea this_example_1
  align one sacrifice_bishop_to_pawn_moves | skewer_queen_rook_moves | setup_discovered_check_on_king_moves
  alias two accept_sacrifice_moves
  line one two
`

    rules += base_rules

    let pos2 = fen_pos(puzzles[902].move_fens[0])
    let pos = m.create_position(puzzles[902].move_fens[0])
    let res = relations(m, pos, rules)

    let lines: string[] = []
    let rows = res.get('this_example_1')!.get_relation_starting_at_world_id(0).rows.map(row => {
        let aa = extract_line(row)

        let resaa = extract_sans(pos2, aa)
        if (resaa.length > 0) {
            lines.push(resaa.join(' '))
        }
    })


    console.log(lines)


})

it('align regression', () => {

  let rules = `
  
binding
  knight_unpins_bishop_queen_moves
  knight_attacks_queen_moves

legal knight_attacks_queen_moves

fact knight_attacks_queen
  alias occ occupies
  .from = attacks2.from
  .to = attacks2.to
  attacks2.from = occupies.square
  attacks2.to2 = occ.square
  occupies.piece = Knight
  occ.piece = Queen

legal knight_unpins_bishop_queen_moves

fact knight_unpins_bishop_queen
  .from = unpins.from
  .to = unpins.to
  unpins.piece = Knight
  unpins.pin_piece = Bishop
  unpins.to_piece = Queen

fact unpins
  alias pin attacks_through
  alias occ occupies
  alias occ_to occupies
  .from = attacks.from
  .to = attacks.to
  .piece = occupies.piece
  .pin_piece = occ.piece
  .to_piece = occ_to.piece
  pin.block = attacks.from
  attacks.from = occupies.square
  pin.from = occ.square
  pin.to = occ_to.square

`

    let pos2 = fen_pos(puzzles[54].move_fens[0])
    let pos = m.create_position(puzzles[54].move_fens[0])
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

})


it.skip('works 2 binding', () => {

    let rules = `
binding
  sacrifice_bishop_to_pawn_moves 
  skewer_queen_rook_moves 
  setup_discovered_check_on_king_moves

  accept_sacrifice_moves

`

    rules += base_rules

    let pos2 = fen_pos(puzzles[902].move_fens[0])
    let pos = m.create_position(puzzles[902].move_fens[0])
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


})
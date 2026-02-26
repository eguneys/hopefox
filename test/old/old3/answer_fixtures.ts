export let rules_200_skip0 = `

idea solution200_28
  alias one check_king_moves
  alias one_e evade_king_moves
  alias two check_king_moves
  alias two_e evade_king_moves
  alias three check_king_moves
  line one one_e two two_e three


idea solution200_26
  alias one exchange_rooks
  alias two fork_king_and_b_moves
  alias three evade_king_moves
  alias four capture_hanging_piece_moves
  line one two three four


idea solution200_25
  alias one fork_king_and_b_moves
  alias two block_check
  alias three capture_hanging_piece_moves
  line one two three


idea solution200_24
  alias one exchange_rooks
  alias two check_king_moves
  line one two


idea solution200_22
  alias one check_king_moves
  alias two sacrifice_queen_accept
  line one two



idea solution200_21
  alias one bishop_vs_knight_exchange
  alias two fork_king_and_b_moves
  alias three block_check
  alias four capture_hanging_piece_moves
  line one two three four



idea solution200_20
  alias one push_and_discover_check
  alias two block_check
  alias three captures_moves
  line one two three
  one.to2 = two.from
  two.to = three.to


idea push_and_discover_check
  alias one push_and_discover_attack_moves
  line one
  .to2 = one.to2
  one.d_to_piece = King

idea block_check
  alias one block_attack_moves
  line one
  one.block_to_piece = King

legal block_attack_moves

fact block_attack 
 alias occ occupies 
 alias occ_to occupies 
 alias check attacks 
 .from = attacks.from 
 .to = attacks.to 
 .block_from = check.from  
 .block_to = check.to 
 .piece = occupies.piece 
 .block_piece = occ.piece
 .block_to_piece = occ_to.piece
 attacks.to between check.from check.to 
 attacks.from = occupies.square 
 check.from = occ.square 
 check.to = occ_to.square 
 


idea solution200_15
 alias one exchange_rooks
 alias two fork_king_and_b_moves
 alias three evade_king_moves
 alias four capture_hanging_piece_moves
 line one two three four

idea exchange_rooks
  alias one captures_moves 
  alias two captures_moves 
  line one two 
  one.piece = Rook
  one.to_piece = Rook
  one.to = two.to 



idea solution200_14
  alias one push_and_discover_attack_moves
  alias two evade_king_moves
  alias three capture_hanging_piece_moves
  line one two three
  one.piece2 = King

fact push_and_discover_attack
  alias d attacks_through
  alias occ occupies
  alias occ_d occupies
  alias occ_e occupies
  .from = push.from
  .to = push.to
  .to2 = push.to2
  .d_from = d.from
  .d_to = d.to
  .piece = occupies.piece
  .piece2 = occ.piece
  .d_piece = occ_d.piece
  .d_to_piece = occ_e.piece
  d.block = push.from
  push.from = occupies.square
  push.to2 = occ.square
  d.from = occ_d.square
  d.to = occ_e.square

legal push_and_discover_attack_moves


idea solution200_13
  alias one fork_king_blockable
  alias two capture_hanging_piece_moves
  line one two
  one.to_b = two.to

idea fork_king_blockable
  alias fork fork_king_and_b_moves
  alias block moves
  line fork block
  .to_b = fork.to_b
  block.to between fork.to fork.to_a


idea solution200_11
 alias one fork_king_and_b_moves
 alias two sacrifice_queen_accept
 line one two
 one.piece_b = Rook

idea sacrifice_queen_accept
  alias one captures_moves
  alias two captures_moves
  line one two
  one.piece = Queen
  one.to = two.to


fact fork_a_b
  alias occ_a occupies
  alias occ_b occupies
  alias fork_a attacks2
  alias fork_b attacks2
  .from = fork_a.from
  .to = fork_a.to
  .to_a = fork_a.to2
  .to_b = fork_b.to2
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


fact fork_king_and_b
  .from = fork_a_b.from
  .to = fork_a_b.to
  .to_a = fork_a_b.to_a
  .to_b = fork_a_b.to_b
  .piece_b = fork_a_b.piece_b
  fork_a_b.piece_a = King


legal fork_king_and_b_moves

idea solution200_10
 alias one captures_moves
 alias two bishop_vs_knight_exchange
 line one two
  one.piece = Bishop
  one.to_piece = Queen

idea bishop_vs_knight_exchange
  alias one captures_moves
  alias two captures_moves
  line one two
  one.piece = Bishop
  one.to_piece = Knight
  one.to = two.to

idea solution200_7
  alias one capture_exchange_moves
  alias two exchange_queens
  line one two

idea exchange_queens
  alias one captures_moves
  alias two captures_moves
  line one two
  one.piece = Queen
  one.to_piece = Queen
  one.to = two.to

fact capture_exchange
  alias occ occupies
  .from = captures_moves.from
  .to = captures_moves.to
  captures_moves.from = occupies.square
  captures_moves.to = occ.square
  occ.piece = Rook
  occupies.piece = Bishop

legal capture_exchange_moves


idea solution200_3
  alias one check_blockable
  alias two check_blockable
  alias three check_king_moves
  line one two three


idea check_blockable
  alias check check_king_moves
  alias block moves
  line check block
  block.to between check.to check.to2


idea solution200_2
  alias one push_check_king_moves
  alias two evade_king_moves
  alias three check_king_moves
  line one two three


fact evade_piece
  .from = attacks.from
  .to = attacks.to
  .piece = occupies.piece
  attacks.from = occupies.square


fact evade_king
  .from = evade_piece.from
  .to = evade_piece.to
  evade_piece.piece = King


legal evade_king_moves


fact push_check
  alias occ occupies
  .from = push.from
  .to = push.to
  .to2 = push.to2
  .piece2 = occ.piece
  push.from = occupies.square
  push.to2 = occ.square
  
  
fact push_check_king
  .from = push_check.from
  .to = push_check.to
  .to2 = push_check.king
  push_check.piece2 = King

legal push_check_king_moves


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


legal check_king_moves


idea solution200_1
 alias one capture_hanging_piece_moves
 alias two attack_hanging_piece_moves
 alias three defend_hanging_piece_moves
 line one two three


legal defend_hanging_piece_moves

fact defend_hanging_piece
  alias occ occupies
  .from = attacks2.from
  .to = attacks2.to
  .to2 = attacks2.to2
  attacks2.from = occupies.square
  attacks2.to2 = occ.square
  attacks2.from != attacks2.to2
  occ.color = occupies.color
  attacks2.to2 = hanging1.square


fact attack_hanging_piece
  alias occ occupies
  .from = attacks2.from
  .to = attacks2.to
  .to2 = attacks2.to2
  attacks2.from = occupies.square
  attacks2.to2 = occ.square
  attacks2.from != attacks2.to2
  occ.color != occupies.color
  attacks2.to2 = hanging0.square

legal attack_hanging_piece_moves

fact hanging_piece
  .square = hanging1.square
  hanging1.square = occupies.square


fact captures
 alias occ occupies
 .from = attacks.from
 .to = attacks.to
 .piece = occupies.piece
 .to_piece = occ.piece
 attacks.from = occupies.square
 attacks.to = occ.square
 occ.color != occupies.color
 
legal captures_moves

fact capture_hanging_piece
  .from = captures.from
  .to = captures.to
  captures.to = hanging_piece.square


legal capture_hanging_piece_moves

`




export let rules_skips0_13 = `

`

export let rules_skips0_12 = `
idea fork_king_blockable
  alias fork fork_king_and_b_moves
  alias block moves
  line fork block
  .to_b = fork.to_b
  block.to between fork.to fork.to_a

idea check_blockable
  alias check check_king_moves
  alias block moves
  line check block
  block.to between check.to check.to2
  
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


legal check_king_moves


idea solution
 alias one fork_king_blockable
 alias three captures_moves
 line one three
 one.to_b = three.to



fact captures
 alias occ occupies
 .from = attacks.from
 .to = attacks.to
 attacks.from = occupies.square
 attacks.to = occ.square


legal captures_moves


fact fork_a_b
  alias occ_a occupies
  alias occ_b occupies
  alias fork_a attacks2
  alias fork_b attacks2
  .from = fork_a.from
  .to = fork_a.to
  .to_a = fork_a.to2
  .to_b = fork_b.to2
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


fact fork_king_and_b
  .from = fork_a_b.from
  .to = fork_a_b.to
  .to_a = fork_a_b.to_a
  .to_b = fork_a_b.to_b
  .piece_b = fork_a_b.piece_b
  fork_a_b.piece_a = King


legal fork_king_and_b_moves

`


export let rules_skips0_11 = `
fact hanging_piece
  .square = hanging1.square
  hanging1.square = occupies.square


fact captures
 alias occ occupies
 .from = attacks.from
 .to = attacks.to
 attacks.from = occupies.square
 attacks.to = occ.square
 occ.color != occupies.color
 

fact capture_hanging_piece
  .from = captures.from
  .to = captures.to
  captures.to = hanging_piece.square


legal capture_hanging_piece_moves


idea solution
  alias one capture_hanging_piece_moves
  alias two capture_exchange_moves
  alias three captures_moves
  line one two three
  two.to = three.to


legal capture_exchange_moves

fact capture_exchange
  alias occ occupies
  .from = captures.from
  .to = captures.to
  captures.from = occupies.square
  captures.to = occ.square
  occupies.piece = Bishop
  occ.piece = Rook

fact captures
 alias occ occupies
 .from = attacks.from
 .to = attacks.to
 attacks.from = occupies.square
 attacks.to = occ.square


legal captures_moves

`


export let rules_skips0_9_half = `
fact unpins
  alias ato attacks_through
  alias at attacks
  alias occ occupies
  .from = at.from
  .to = at.to
  .unpin_from = ato.from
  .unpin_to = ato.to
  ato.block = at.from
  at.to != ato.from
  at.from = occupies.square
  ato.from = occ.square
  occupies.color != occ.color
 

fact unpins_capture
  .from = unpins.from
  .to = unpins.to
  captures.from = unpins.from
  captures.to = unpins.to

fact unpins_queen
  .from = unpins.from
  .to = unpins.to
  unpins.unpin_to = occupies.square
  occupies.piece = Queen

fact unpins_queen_capture
  .from = unpins_capture.from
  .to = unpins_capture.to
  unpins_capture.from = unpins_queen.from
  unpins_capture.to = unpins_queen.to


fact attacks2_queen
  .from = attacks2.from
  .to = attacks2.to
  attacks2.to2 = occupies.square
  occupies.piece = Queen


fact unpins_queen_capture_and_attacks2_queen
  .from = unpins_queen_capture.from
  .to = unpins_queen_capture.to
  unpins_queen_capture.from = attacks2_queen.from
  unpins_queen_capture.to = attacks2_queen.to
  
legal unpins_queen_capture_and_attacks2_queen_moves

idea solution1
 alias one unpins_queen_capture_and_attacks2_queen_moves
 alias two capture_queen_moves
 alias three capture_queen_moves
 line one two three

idea solution
  alias one unpins_queen_capture_and_attacks2_queen_moves
  alias two captures_moves
 line one two
 one.to = two.to

fact capture_queen
 .from = captures.from
 .to = captures.to
 captures.to = occupies.square
 occupies.piece = Queen

legal capture_queen_moves

legal captures_moves

fact captures
 alias occ occupies
 .from = attacks.from
 .to = attacks.to
 attacks.from = occupies.square
 attacks.to = occ.square
 occ.color != occupies.color
`


export let rules_skips0_6 = `
fact unpins
  alias ato attacks_through
  alias at attacks
  alias occ occupies
  .from = at.from
  .to = at.to
  .unpin_from = ato.from
  .unpin_to = ato.to
  ato.block = at.from
  at.to != ato.from
  at.from = occupies.square
  ato.from = occ.square
  occupies.color != occ.color
 

fact unpins_capture
  .from = unpins.from
  .to = unpins.to
  captures.from = unpins.from
  captures.to = unpins.to

fact unpins_queen
  .from = unpins.from
  .to = unpins.to
  unpins.unpin_to = occupies.square
  occupies.piece = Queen

fact unpins_queen_capture
  .from = unpins_capture.from
  .to = unpins_capture.to
  unpins_capture.from = unpins_queen.from
  unpins_capture.to = unpins_queen.to


fact attacks2_queen
  .from = attacks2.from
  .to = attacks2.to
  attacks2.to2 = occupies.square
  occupies.piece = Queen


fact unpins_queen_capture_and_attacks2_queen
  .from = unpins_queen_capture.from
  .to = unpins_queen_capture.to
  unpins_queen_capture.from = attacks2_queen.from
  unpins_queen_capture.to = attacks2_queen.to
  
legal unpins_queen_capture_and_attacks2_queen_moves

idea solution
 alias one unpins_queen_capture_and_attacks2_queen_moves
 alias two capture_queen_moves
 alias three capture_queen_moves
 line one two three

fact capture_queen
 .from = captures.from
 .to = captures.to
 captures.to = occupies.square
 occupies.piece = Queen

legal capture_queen_moves

fact captures
 alias occ occupies
 .from = attacks.from
 .to = attacks.to
 attacks.from = occupies.square
 attacks.to = occ.square
 occ.color != occupies.color

`

export let rules_skips0_4 = `

idea solution
 alias one capture_hanging_piece_moves
 line one


fact hanging_piece
  .square = hanging1.square
  hanging1.square = occupies.square


fact captures
 alias occ occupies
 .from = attacks.from
 .to = attacks.to
 attacks.from = occupies.square
 attacks.to = occ.square
 occ.color != occupies.color
 


fact capture_hanging_piece
  .from = captures.from
  .to = captures.to
  captures.to = hanging_piece.square

legal capture_hanging_piece_moves

`


export let rules_skips0_3 = `

legal push_moves


idea solution
 alias one fork_king_and_b_moves
 alias two push_moves
 alias three captures_moves
 line one two three
 one.to_b = three.to




fact captures
 alias occ occupies
 .from = attacks.from
 .to = attacks.to
 attacks.from = occupies.square
 attacks.to = occ.square


legal captures_moves


fact fork_a_b
  alias occ_a occupies
  alias occ_b occupies
  alias fork_a attacks2
  alias fork_b attacks2
  .from = fork_a.from
  .to = fork_a.to
  .to_a = fork_a.to2
  .to_b = fork_b.to2
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


fact fork_king_and_b
  .from = fork_a_b.from
  .to = fork_a_b.to
  .to_b = fork_a_b.to_b
  .piece_b = fork_a_b.piece_b
  fork_a_b.piece_a = King


legal fork_king_and_b_moves

`


export let rules_skips0_2 = `
fact skewer_a_b
  alias occ occupies
  .from = attacks2_through.from
  .to = attacks2_through.to
  .to_a = attacks2_through.block
  .to_b = attacks2_through.to2
  attacks2_through.from = occupies.square
  attacks2_through.to2 = occ.square
  occupies.color != occ.color
  
fact skewer_king_and_piece
  alias occ occupies
  .from = skewer_a_b.from
  .to = skewer_a_b.to
  .to_b = skewer_a_b.to_b
  skewer_a_b.from = occupies.square
  skewer_a_b.to_a = occ.square
  occ.piece = King

legal skewer_king_and_piece_moves



idea solution
 alias one skewer_king_and_piece_moves
 alias two evade_king_moves
 alias three captures_moves
 line one two three
 one.to_b = three.to
 

fact evade_piece
  .from = attacks.from
  .to = attacks.to
  .piece = occupies.piece
  attacks.from = occupies.square

fact evade_king
  .from = evade_piece.from
  .to = evade_piece.to
  evade_piece.piece = King

legal evade_king_moves



fact captures
 alias occ occupies
 .from = attacks.from
 .to = attacks.to
 attacks.from = occupies.square
 attacks.to = occ.square


legal captures_moves
`

export let rules_skips0_1 = `
fact hanging_piece
  .square = hanging1.square
  hanging1.square = occupies.square

fact captures
 alias occ occupies
 .from = attacks.from
 .to = attacks.to
 attacks.from = occupies.square
 attacks.to = occ.square
 occ.color != occupies.color
 

fact capture_hanging_piece
  .from = captures.from
  .to = captures.to
  captures.to = hanging_piece.square

legal capture_hanging_piece_moves



idea solution
  alias one capture_hanging_piece_moves
  alias two fork_king_and_b_moves
  alias three captures_moves
  line one two three
  two.to_b = one.to
  three.to = two.to


fact captures
 alias occ occupies
 .from = attacks.from
 .to = attacks.to
 attacks.from = occupies.square
 attacks.to = occ.square


legal captures_moves



fact fork_king_and_b
  .from = fork_a_b.from
  .to = fork_a_b.to
  .to_b = fork_a_b.to_b
  .piece_b = fork_a_b.piece_b
  fork_a_b.piece_a = King


legal fork_king_and_b_moves




fact fork_a_b
  alias occ_a occupies
  alias occ_b occupies
  alias fork_a attacks2
  alias fork_b attacks2
  .from = fork_a.from
  .to = fork_a.to
  .to_a = fork_a.to2
  .to_b = fork_b.to2
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


export let rules_no_skips0 = `
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


legal check_king_moves


idea check_blockable
  alias check check_king_moves
  alias block moves
  line check block
  block.to between check.to check.to2


idea check_capturable
  alias check check_king_moves
  alias capture moves
  line check capture
  capture.to = check.to


fact captures
 alias occ occupies
 .from = attacks.from
 .to = attacks.to
 attacks.from = occupies.square
 attacks.to = occ.square


legal captures_moves


idea solution1
 alias one check_blockable
 alias two check_capturable
 alias three captures_moves
 line one two three


idea solution2
 alias one check_king_moves
 line one


idea solution3
 alias one check_blockable
 alias two check_king_moves
 line one two 



idea capture_capturable
  alias one captures_moves
  alias two captures_moves
  line one two
  one.to = two.to



idea solution4
  alias one capture_capturable
  alias two captures_moves
  line one two
  one.to = two.to


fact fork_a_b
  alias occ_a occupies
  alias occ_b occupies
  alias fork_a attacks2
  alias fork_b attacks2
  .from = fork_a.from
  .to = fork_a.to
  .to_a = fork_a.to2
  .to_b = fork_b.to2
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


fact fork_king_and_b
  .from = fork_a_b.from
  .to = fork_a_b.to
  .to_b = fork_a_b.to_b
  .piece_b = fork_a_b.piece_b
  fork_a_b.piece_a = King


legal fork_king_and_b_moves

fact evade_piece
  .from = attacks.from
  .to = attacks.to
  .piece = occupies.piece
  attacks.from = occupies.square

fact evade_king
  .from = evade_piece.from
  .to = evade_piece.to
  evade_piece.piece = King

legal evade_king_moves


idea fork_evadable
 alias one fork_king_and_b_moves
 alias two evade_king_moves
 alias three captures_moves
 line one two three
 one.to_b = three.to

idea solution5
 line fork_evadable


idea liquidate
  alias one check_capturable
  alias two check_capturable
  line one two
  one.to = two.to


idea solution6
  line liquidate


idea check_mate
  alias one check_capturable
  alias two check_king_moves
  line one two

idea solution7
  line check_mate

idea check_mate2
  alias one check_capturable
  alias two check_blockable
  alias three check_king_moves
  line one two three


idea solution8
  line check_mate2


idea check_evadable
 alias check check_king_moves
 alias evade evade_king_moves
 line check evade


idea check_evade_mate
 alias one check_evadable
 alias two check_king_moves
 line one two


idea solution9
  line check_evade_mate
`
export let rules2_1 = `

`


export let rules2_0 = `
binding
  knight_attacks_rook_moves

  queen_defends_knight_moves
  
  captures_rook_moves


legal queen_defends_knight_moves

fact queen_defends_knight
  .from = defends_plus.from
  .to = defends_plus.to
  defends_plus.piece = Queen
  defends_plus.to_piece = Knight

legal knight_attacks_rook_moves

fact knight_attacks_rook
  .from = attacks_plus.from
  .to = attacks_plus.to
  attacks_plus.piece = Knight
  attacks_plus.to_piece = Rook

fact attacks_plus
  alias occ occupies
  .from = attacks2.from
  .to = attacks2.to
  .to2 = attacks2.to2
  .piece = occupies.piece
  .to_piece = occ.piece
  attacks2.from = occupies.square
  attacks2.to2 = occ.square
  occ.color != occupies.color

fact defends_plus
  alias occ occupies
  .from = attacks2.from
  .to = attacks2.to
  .to2 = attacks2.to2
  .piece = occupies.piece
  .to_piece = occ.piece
  attacks2.from = occupies.square
  attacks2.to2 = occ.square
  occ.color = occupies.color

fact pawn_push
  .from = push.from
  .to = push.to
  push.from = occupies.square


legal pawn_kicks_bishop_moves

fact pawn_kicks_bishop
  .from = kick.from
  .to = kick.to
  kick.piece = Pawn
  kick.kicked_piece = Bishop

fact kick
  alias occ occupies
  .from = attacks2.from
  .to = attacks2.to
  .to2 = attacks2.to2
  .piece = occupies.piece
  .kicked_piece = occ.piece
  attacks2.from = occupies.square
  attacks2.to2 = occ.square


binding
  evade_king_moves
  attack_hanging_bishop_moves

  evade_rook_moves

  capture_hanging_bishop_moves

legal capture_hanging_bishop_moves

fact capture_hanging_bishop
  .from = captures_bishop.from
  .to = captures_bishop.to
  captures_bishop.from = captures_bishop.from

legal attack_hanging_bishop_moves

fact attack_hanging_bishop
  .from = attack_hanging.from
  .to = attack_hanging.to
  attack_hanging.hanging = Bishop

fact attack_hanging
  alias occ occupies
  .from = attacks2.from
  .to = attacks2.to
  .to2 = attacks2.to2
  .piece = occupies.piece
  .hanging = occ.piece
  attacks2.from = occupies.square
  attacks2.to2 = occ.square
  

legal evade_king_moves
legal evade_rook_moves
legal evade_bishop_moves

fact evade_piece
  .from = attacks.from
  .to = attacks.to
  .piece = occupies.piece
  attacks.from = occupies.square


fact evade_king
  .from = evade_piece.from
  .to = evade_piece.to
  evade_piece.piece = King

fact evade_rook
  .from = evade_piece.from
  .to = evade_piece.to
  evade_piece.piece = Rook

fact evade_bishop
  .from = evade_piece.from
  .to = evade_piece.to
  evade_piece.piece = Bishop

binding
  pawn_captures_moves
  fork_queen_and_knight_moves

  queen_evades_fork_moves
  
  pawn_captures_moves


legal queen_evades_fork_moves

fact queen_evades_fork
  .from = attacks.from
  .to = attacks.to
  attacks.from = occupies.square
  occupies.piece = Queen


legal pawn_captures_moves

binding
  rook_sacrifice_moves
  check_king_moves

  accept_moves

  captures_queen_moves



legal accept_moves
legal rook_sacrifice_moves

fact rook_sacrifice
  .from = sacrifice.from
  .to = sacrifice.to
  sacrifice.piece = Rook

fact sacrifice
  alias a2 attacks
  alias occ occupies
  .from = attacks.from
  .to = attacks.to
  .accept_from = a2.from
  .piece = occupies.piece
  attacks.to = a2.to
  attacks.from != a2.from
  attacks.from = occupies.square
  a2.from = occ.square
  occupies.square != occ.square


fact accept
  alias occ occupies
  .from = attacks.from
  .to = attacks.to
  .piece = occupies.piece
  .accept_piece = occ.piece
  attacks.from = occupies.square
  attacks.to = occ.square



binding
  knight_exchange_moves
  check_king_moves

  captures_knight_moves

  captures_bishop_moves


legal knight_exchange_moves

fact knight_exchange
  .from = captures.from
  .to = captures.to
  captures.piece = Knight
  captures.to_piece = Knight
  
legal check_king_moves

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


binding
  sacrifice_knight_to_pawn_moves
  fork_rook_and_queen_moves
  
  acc_counter_sacs_knight_vs_queen


idea acc_counter_sacs_knight_vs_queen 
  alias one captures_knight_moves
  alias two captures_queen_moves
  line one two


legal fork_queen_and_knight_moves

fact fork_queen_and_knight
  .from = fork_a_b.from
  .to = fork_a_b.to
  fork_a_b.piece_a = Queen
  fork_a_b.piece_b = Knight


legal fork_rook_and_queen_moves

fact fork_rook_and_queen
  .from = fork_a_b.from
  .to = fork_a_b.to
  fork_a_b.piece_a = Rook
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

legal sacrifice_knight_to_pawn_moves

fact sacrifice_knight_to_pawn
  .from = sacrifice_to_pawn.from
  .to = sacrifice_to_pawn.to
  sacrifice_to_pawn.piece = Knight





binding
  setup_discovered_check_on_king_moves
  sacrifice_bishop_to_pawn_moves
  skewer_queen_rook_moves

  accept_sacrifice_moves
  
  rook_check_moves

  queen_sacrifice_vs_rook


idea queen_sacrifice_vs_rook
  alias one captures_rook_moves
  alias two captures_moves
  line one two
  one.to = two.to


legal captures_bishop_moves
legal captures_queen_moves
legal captures_knight_moves
legal captures_rook_moves
legal captures_moves

fact captures_queen
  .from = captures.from
  .to = captures.to
  captures.to_piece = Queen

fact captures_knight
  .from = captures.from
  .to = captures.to
  captures.to_piece = Knight

fact captures_rook 
  .from = captures.from
  .to = captures.to
  captures.to_piece = Rook

fact captures_bishop
  .from = captures.from
  .to = captures.to
  captures.to_piece = Bishop

fact pawn_captures
  .from = captures.from
  .to = captures.to
  captures.piece = Pawn

fact captures
  alias occ occupies
  .from = attacks.from
  .to = attacks.to
  .piece = occupies.piece
  .to_piece = occ.piece
  attacks.from = occupies.square
  attacks.to = occ.square
  occupies.color != occ.color


legal rook_check_moves

fact rook_check
  .from = check.from
  .to = check.to
  check.piece = Rook

legal accept_sacrifice_moves


fact accept_sacrifice
  alias occ occupies
  .from = attacks.from
  .to = attacks.to
  .piece = occ.piece
  attacks.from = occupies.square
  attacks.to = occ.square
  occupies.color != occ.color
  occupies.piece = Pawn
  


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
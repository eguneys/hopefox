import { it } from 'vitest'
import { Language9_Build, PositionManager } from '../src'
import { PositionMaterializer } from '../src/language6/engine6'
import { puzzles } from './fixture'


let m = await PositionManager.make()
it('works', () => {

  let i = 0
  console.log(puzzles[i].link)
    let pos = m.create_position(puzzles[i].move_fens[0])
    let mz = new PositionMaterializer(m, pos)

    let res = Language9_Build(`

world(W) :- root_world(_, W).
world(W) :- world_edge(_, _, W).

forced_reachable(R, W) :-
  root_world(R, W).

forced_reachable(R, C) :-
  world_edge(R, P, C)
  forced_reachable(R, P).


attacker_to_move(R, W) :-
  forced_reachable(R, W)
  $is_attacker(W).

defender_to_move(R, W) :-
  forced_reachable(R, W)
  $is_defender(W).


expand_ready(R, W) :-
  forced_reachable(R, W)
  attacker_to_move(R, W)
  NOT attacker_moves_enumerated(R, W).

expand_ready(R, W) :-
  forced_reachable(R, W)
  defender_to_move(R, W)
  NOT defender_replies_enumerated(R, W).


forcing_attacker_move(R, P, C) :-
  expand_ready(R, P)
  attacker_to_move(R, P)
  $legal_world(P, C)
  $is_forcing_move(P, C).

world_edge(R, P, C) :-
  forcing_attacker_move(R, P, C).


open_obligation(R, P, C) :-
  expand_ready(R, P)
  defender_to_move(R, P)
  $legal_world(P, C).


attacker_moves_enumerated(R, P) :-
  expand_ready(R, P)
  attacker_to_move(R, P).


world_edge(R, P, C) :-
  open_obligation(R, P, C).

defender_replies_enumerated(R, P) :-
  expand_ready(R, P)
  defender_to_move(R, P).


#boundary

world_classified(R, W) :-
  forced_reachable(R, W).

forced_recapture_exists(R, W) :-
  forced_reachable(R, W)
  $forced_recapture_exists(W).

invariant(R, W) :-
  forced_reachable(R, W)
  $is_checkmate(W).

#boundary

terminal_forced(R, W) :-
  attacker_to_move(R, W)
  attacker_moves_enumerated(R, W)
  NOT forcing_attacker_move(R, W, _).

terminal_forced(R, W) :-
  defender_to_move(R, W)
  defender_replies_enumerated(R, W)
  NOT open_obligation(R, W, _).

#boundary

root_success(R) :-
  terminal_forced(R, W)
  invariant(R, W).

puzzle_solved(R) :-
  root_success(R).

#boundary

query(R, W) :-
  root_world(R, W).


`, mz)

    console.log(res)
})
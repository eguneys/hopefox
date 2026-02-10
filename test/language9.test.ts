import { it } from 'vitest'
import { Language9_Build, PositionManager } from '../src'
import { PositionMaterializer } from '../src/language6/engine6'
import { puzzles } from './fixture'


let m = await PositionManager.make()
it('works', () => {

    let pos = m.create_position(puzzles[0].move_fens[0])
    let mz = new PositionMaterializer(m, pos)

    let res = Language9_Build(`
world(W) :- root_world(_, W).
world(W) :- world_edge(_, _, W).

forced_reachable(R, W) :-
  root_world(R, W).

forced_reachable(R, C) :-
  world_edge(R, P, C)
  forced_reachable(R, P).

world_edge(R, P, C) :-
  expand_ready(R, P)
  $legal_world(P, C).

attacker_to_move(R, W) :-
  forced_reachable(R, W)
  $is_attacker(W).

defender_to_move(R, W) :-
  forced_reachable(R, W)
  $is_defender(W).
`, mz)

    console.log(res)
})
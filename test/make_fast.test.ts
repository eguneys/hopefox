import { it } from 'vitest'
import { StrataRun, PositionC, PositionManager } from '../src'
import { test_b_forks_kr_puzzles, test_qr_puzzles } from './fixture'

let m = await PositionManager.make()

function make_fast(m: PositionManager, pos: PositionC) {
    return StrataRun(`
world(W) :- root_world(W).

turn(W, From, Role, Color, Piece) :- world(W)
$turn(W, From, Role, Color, Piece).

opponent(W, From, Role, Color, Piece) :- world(W)
$opponent(W, From, Role, Color, Piece).


vacant_see(W, From, To) :- world(W)
$vacant_see(W, From, To).

attack_see(W, From, To) :- world(W)
$attack_see(W, From, To).

defend_see(W, From, To) :- world(W)
$defend_see(W, From, To).

vacant_see2(W, From, To, To2) :- world(W)
$vacant_see2(W, From, To, To2).

attack_see2(W, From, To, To2) :- world(W)
$attack_see2(W, From, To, To2).

defend_see2(W, From, To, To2) :- world(W)
$defend_see2(W, From, To, To2).

vacant_see_through(W, From, To, To_through) :- world(W)
$vacant_see_through(W, From, To, To_through).

attack_see_through(W, From, To, To_through) :- world(W)
$attack_see_through(W, From, To, To_through).

defend_see_through(W, From, To, To_through) :- world(W)
$defend_see_through(W, From, To, To_through).

legal_worlds(W, From, To, W2) :- world(W)
$legal_worlds(W, From, To, W2).

turn_kings(W, From) :- turn(W, From, "KING", Color, Piece).
turn_bishops(W, From) :- turn(W, From, "BISHOP", Color, Piece).
opponent_bishops(W, From) :- turn(W, From, "BISHOP", Color, Piece).
opponent_kings(W, From) :- opponent(W, From, "KING", Color, Piece).
opponent_rooks(W, From) :- opponent(W, From, "ROOK", Color, Piece).


opponent_see(W, From, To) :- opponent(W, From, _, _, _) attack_see(W, From, To).
opponent_see(W, From, To) :- opponent(W, From, _, _, _) defend_see(W, From, To).
opponent_see(W, From, To) :- opponent(W, From, _, _, _) vacant_see(W, From, To).


fork(W, From, To, Fork_a, Fork_b) :- 
   attack_see2(W, From, To, Fork_a)
   attack_see2(W, From, To, Fork_b)
   Fork_a != Fork_b.

#boundary

bishop_forks(W, From, To) :- turn_bishops(W, From) fork(W, From, To, Fork_a, Fork_b)
  Not opponent_see(W, _, To)
  opponent_kings(W, Fork_a)
  opponent_rooks(W, Fork_b).


solution(P, From, To) :- turn_bishops(W, From)
  fork(W, From, To, Fork_a, _)
  Not opponent_see(W, _, To)
  opponent_kings(W, Fork_a)
  legal_worlds(W, From, To, P).



`, m, pos)
}

it('works', () => {

    let log_puzzles = test_qr_puzzles
    log_puzzles = test_b_forks_kr_puzzles

    let total = log_puzzles.length / 20

    let Tp = []
    let Fp = []
    let Tn = []
    let Fn = []
    for (let k = 0; k < total; k++) {
        let i = k
        //i = 7
        let fen = log_puzzles[i].move_fens[0]
        //if (i > 100) break
        //if (k === 1) break
        //fen = '3qr1k1/p4p1p/6p1/3Q4/8/1P3P2/P5PP/3R2K1 b - - 0 26'
        let pos = m.create_position(fen)
        let link = log_puzzles[i].link

        //console.log(i + ' ' + link)
        let res = make_fast(m, pos)
        if (res.length === 0) {

            Tn.push(link)
            continue
        }

        if (res.length > 0) {
            let cc = res[0][0]
            let ss = log_puzzles[i].sans[0]

            if (cc === ss) {
                Tp.push(link)
            } else {
                Fp.push(`${i} ${link} :> [${res.length}] ${res[0].join(' ')}`)
            }
            continue
        }

        Tn.push(link)

        m.delete_position(pos)
    }

    let C_percent = Math.round(((Tp.length + Fp.length) / Tn.length) * 100)
    let Tp_percent = Math.round((Fp.length / (Tp.length + Fp.length)) * 100)
    console.log(`Coverage % ${C_percent} Error %${Tp_percent}`)
    console.log(`Tp/Fp/N ${Tp.length}/${Fp.length}/${Tn.length}`)
    console.log(Fp.slice(0, 20))
    console.log(`Coverage % ${C_percent} Error %${Tp_percent}`)
    console.log(`Tp/Fp/N ${Tp.length}/${Fp.length}/${Tn.length}`)
})
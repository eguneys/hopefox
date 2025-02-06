import { move_c_to_Move, PositionC, PositionManager, SquareSet } from '../src'
import {it} from 'vitest'
import { INITIAL_FEN } from '../src/fen'
import { squareSet } from '../src/debug'

it('works', async () => {
    let m = await PositionManager.make()

    let b = m.create_position("8/3k4/8/8/8/8/3K2N1/8 w - - 0 1")
    let a = m.create_position(INITIAL_FEN)

    console.log(m.get_legal_moves(b).map(move_c_to_Move))

    console.log(squareSet(m.attacks(3, 8, new SquareSet(0, 0))))
    console.log(perft(m, a, 5))
})


function perft(m: PositionManager, pos: PositionC, depth: number) {
    if (depth === 0) {
        return 1
    }

    let res = 0
    for (let move of m.get_legal_moves(pos)) {

        m.make_move(pos, move)

        res += perft(m, pos, depth - 1)

        m.unmake_move(pos, move)
    }
    return res
}


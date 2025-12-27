import { it } from 'vitest'
import { quiescence_plus } from '../src'


it('works', () => {
    let fen = "4rr2/1ppq1pk1/p1n2R2/5b2/3p1Q2/1B3N2/PPP2PPP/4R1K1 b - - 0 21"
    fen = "5rk1/pQ4pp/5q2/8/8/2P5/bP2N1PP/3R2K1 b - - 0 24"

    console.log(quiescence_plus(fen))
})
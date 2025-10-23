import { expect, it } from 'vitest'
import { Chess, l_attack_pieces, mor_long, mor_short, parse_piece, piece_to_c, PositionManager, print_a_piece } from '../src'
import { parseFen } from '../src/fen'
import { squareSet } from '../src/debug'

let m = await PositionManager.make()
it.skip('c_attacks', async () => {

    let fen = "3r1rk1/1b3pp1/3p4/p3nPPQ/4P3/3q1BN1/8/2R2RK1 w - - 2 29"


    let p = parse_piece('r')
    let sq = 59
    let occupied = Chess.fromSetupUnchecked(parseFen(fen).unwrap()!).board.occupied
    let res =  m.attacks(piece_to_c(p), sq, occupied)

    console.log(squareSet(occupied))
    console.log(squareSet(res))


    let pos = m.create_position(fen)

    let res2 = m.pos_attacks(pos, sq)
    console.log(squareSet(res2))


    console.log(squareSet(m.pos_attacks(pos, 53)))
    //console.log(m.attacks(piece_to_c(parse_piece('p')), 53, occupied))

})

it.skip('c_attacks 2', async () => {

    let fen = "5k2/8/8/1p6/2N5/8/8/5K2 w - - 0 1"

    let occupied = Chess.fromSetupUnchecked(parseFen(fen).unwrap()!).board.occupied
    let res = m.attacks(piece_to_c(parse_piece('p')), 33, occupied)


    console.log(squareSet(occupied))
    console.log(squareSet(res))

    let pos = m.create_position(fen)

    let res2 = m.pos_attacks(pos, 5)
    console.log(squareSet(res2))


})

it('works', () => {

    /* https://lichess.org/training/7wsWE */
    let fen = "3r4/p1p2kpp/4rn2/1p6/2N1P3/3n1P2/PB4PP/R2R2K1"


    let text = `
K Z+ z+ +R2 +N2
k Z+ r+ r2+/r
r +R/N r2+ k+
N +b R+ r+
b +N2 n+ r2+
n z+ P+

n=e5 +K +N b+ R2+
`

    //fen = "8/4k3/8/8/8/8/8/4K3 w - - 0 1"
    //fen = "8/4k3/8/8/8/5N2/8/4K3 w - - 0 1"
    //fen = "8/4k3/8/5n2/3N4/8/2K5/8 w - - 0 1"
    //fen = "3r4/8/8/8/3n4/8/8/3R4 w - - 0 1"
    //fen = "3r4/8/8/8/2N5/3n4/8/3R4 w - - 0 1"

    // fen = "3r4/5k2/4rn2/8/2N5/3n4/1B6/R2R2K1 w - - 0 1"

    //fen = "5Q2/3Q4/6Q1/Q7/7Q/1Q6/4Q3/2Q5 w - - 0 1"
    //fen = "8/8/6Q1/Q7/7Q/1Q6/4Q3/2Q5 w - - 0 1"
    //fen = "8/8/8/8/8/8/4Q3/2Q5 w - - 0 1"


    /* 002LW */
    fen = "3r1rk1/1b3pp1/3p4/p3nPPQ/4P3/3q1BN1/8/2R2RK1 w - - 2 29"
    /* 004Ys */
    fen = "r4rk1/5pbp/p1n1p1p1/2p3NP/1p1q1B2/3P3Q/PPP3P1/R3R1K1 w - - 3 20"
    /* 0FfNo */
    fen = "1rb2rk1/1p3p1p/pN2qbp1/3Rp3/1P2P3/P7/2Q1BPPP/R5K1 w - - 1 21"

    //fen = "8/2r3pp/8/6b1/6Q1/6R1/6P1/8 w - - 4 26" // no -queen -king


    /* 003jb */
    fen = "r3kb1r/p4ppp/b3p3/2pq4/3Q4/4BN2/PPP2PPP/R3K2R w KQkq - 0 12"

    /* 00Ec4 */
    fen = "3q1r1k/p1r3pp/8/1p1BpPb1/2Pp2Q1/P2P2R1/6PP/R5K1 w - - 4 26"

    console.log(mor_short(fen).map(print_a_piece))
    let res = mor_short(fen).map(print_a_piece).join('\n')

    expect(mor_long(res).map(print_a_piece).join('\n')).toBe(res)

    let res2 = l_attack_pieces(mor_long(res))
    console.log(res2, res2.length)
})
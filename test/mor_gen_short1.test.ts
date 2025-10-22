import { expect, it } from 'vitest'
import { l_attack_pieces, mor_long, mor_short, print_a_piece } from '../src'

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

//fen = "3r4/5k2/4rn2/8/2N5/3n4/1B6/R2R2K1 w - - 0 1"

//fen = "5Q2/3Q4/6Q1/Q7/7Q/1Q6/4Q3/2Q5 w - - 0 1"
//fen = "8/8/6Q1/Q7/7Q/1Q6/4Q3/2Q5 w - - 0 1"
//fen = "8/8/8/8/8/8/4Q3/2Q5 w - - 0 1"


    console.log(mor_short(fen).map(print_a_piece))
    let res = mor_short(fen).map(print_a_piece).join('\n')

    expect(mor_long(res).map(print_a_piece).join('\n')).toBe(res)

    console.log(l_attack_pieces(mor_long(res)))
})
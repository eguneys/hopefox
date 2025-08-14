import { it } from 'vitest'
import { mor_short, print_a_piece } from '../src'


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

    console.log(mor_short(fen).map(print_a_piece))
})
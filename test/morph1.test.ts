import { it, expect } from 'vitest'
import { mor1 } from '../src'

let a = `
:link: https://lichess.org/training/TYW5G
:situation:
Knight blocks queen Queen alignment
Queen protected_by Bishop
Bishop Queen battery eyes king, protected by knight
queen is unprotected
bishop is protected by queen
Knight can fork queen bishop and knight by sacrificing to a pawn, a bishop or the knight, if taken Queen takes queen, white is up a queen winning. If the queen moves, Knight takes knight with check, then Bishop Queen battery delivers mate. If queen takes Queen, preventing mate, Knight intermezzo takes undefended bishop with check, before Bishop recaptures queen.
`

it('works', () => {
    let b = mor1(a)
    expect(b).toBe(``)
})
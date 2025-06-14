import { it, expect } from 'vitest'
import { mor1 } from '../src'

let a = `
:link: https://lichess.org/training/TYW5G
:situation:
king protected_by knight
Knight blocks queen Queen alignment
Queen protected_by Bishop
Bishop Queen battery_eyes king protected_by knight
bishop protected_by queen
Knight can_fork queen bishop knight, if queen moves, Knight takes knight with_check
`
let b = `
queen is unprotected
Knight can_fork queen bishop knight, if queen moves, Knight takes knight with_check, then battery_delivers_mate.
Knight can fork queen bishop and knight by sacrificing to a pawn bishop and a knight, if taken Queen takes queen, white is up a queen winning. If the queen moves, Knight takes knight with check, then Bishop Queen battery delivers mate. If queen takes Queen, preventing mate, Knight intermezzo takes undefended bishop with check, before Bishop recaptures queen.
`

it('works', () => {
    let b = mor1(a)
    expect(b).toBe(``)
})
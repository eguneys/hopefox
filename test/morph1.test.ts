import { it, expect } from 'vitest'
import { mor1 } from '../src'

let a = `
:link: https://lichess.org/training/k1PXu
:situation:
both rooks are_aligned on_the_2nd_rank
King is_at_the_backrank and attacks a rook so_there_is_no_mate_threat
`

let b = `
King is_at_the_backrank and attacks a rook so_there_is_no_mate_threat
king on_backrank and knights are_aligned around_the_king
Rook is_onto king protected_by Pawn
Queen eyes king and both knights
Queen can_check and_then deliver_mate if king moves, but the knight or rook can_block protected_by a pawn
`



let a1 = `
:link: https://lichess.org/training/TYW5G
:situation:
king protected_by knight
Knight blocks queen Queen alignment
Queen protected_by Bishop
Bishop Queen battery_eyes king protected_by knight
bishop protected_by queen
queen is_unprotected
Knight can_fork queen bishop knight, if queen moves, Knight takes knight with_check, if queen takes Queen, preventing_mate, Knight intermezzo takes undefended bishop with_check, before Bishop recaptures queen
`


it('works', () => {
    let b = mor1(a)
    expect(b).toBe(``)
})
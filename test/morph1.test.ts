import { it, expect } from 'vitest'
import { mor1 } from '../src'

let a = `
:link: https://lichess.org/training/qsJ3w
:situation:
queen Queen alignment
bishop queen alignment
Pawn attacks bishop
rook Rook alignment blocked_by bishop
queen eyes Knight blocked_by Pawn
Queen is_hanging
rooks are_aligned
`

let b = `
material rook up
Knight eyes king pawn and can fork king and queen protected by king pawn
Queen can eye king blocked by king pawn and threaten mate on king pawn, king cant escape mate, black cant defend both mate and Knight fork, queen can defend mate but cannot escape Knight fork winning.
`

let a2 = `
:link: https://lichess.org/training/k1PXu
:situation:
both rooks are_aligned on_the_2nd_rank
King is_at_the_backrank 
King attacks a rook so_there_is_no_mate_threat
knights are_aligned around_the_king
Queen eyes king and both knights
Rook is_onto king protected_by Pawn
Queen can_check_and_then_deliver_mate_if_king_moves, but the knight and rook can_block protected_by a pawn
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
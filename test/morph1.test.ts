import { it, expect } from 'vitest'
import { mor1 } from '../src'
import { mor2 } from '../src'


let a = `
:link: https://lichess.org/training/39zmg
:situation:
king is_controlling APP push
knight2 is_blockading Queening_Square
Rook is_defending Pawn from_behind
Pawn is_defending APP
knight and king are_attacking Pawn
King can_attack knight
`



let basdf = `
:link: https://lichess.org/training/39zmg
:situation:
king is_controlling APP push
knight2 is_blockading Queening_Square
Rook is_defending Pawn from_behind
knight and king are_attacking Pawn
King can_attack knight
`


let aa = `
:link: https://lichess.org/training/39zmg
:situation:
two knights vs Rook and an Connected APP
king is controlling Connected APP push
knight 2 is blockading queening square
edge 2 connected passed pawns connected by another pawn
King is aside
Rook is defending Pawn from behind
knight and king are attacking Pawn
Rook king alignment blocked by Pawn
King can attack blockading knight
if King attacks knight 2, knight 2's 2 escape squares are controlled by the King and 1 escape square is occupied by king, so it is trapped, then knight 2 can take Pawn 2 pinning itself to Rook king alignment, If King takes knight, king takes APP, Rook vs knight and three connected pps losing.

:line:
King attacks knight 2, knight takes Pawn, if Rook takes knight immediately, king takes Rook, and creating an escape square for the knight 2, knight and 3 connected pp vs a Pawn is losing.
So APP push first, threatening Rook takes knight followed by King takes knight 2 and queen, knight 2 decoys King by moving to an escape square controlled by the King, Rook takes knight first, decoying king attack the app about to promote, then King takes knight 2, app is unstoppable winning.
`


let a4 = `
:link: https://lichess.org/training/qsJ3w
:situation:
queen Queen alignment
bishop queen alignment
Pawn attacks bishop
rook Rook alignment blocked_by bishop
queen eyes Knight blocked_by Pawn
rooks are_aligned
pawn is_around_the_king
Knight eyes pawn
Knight can_fork king queen
Queen is_hanging
Queen can_threaten_mate_on pawn with Knight
`

let ac = `
:link: https://lichess.org/training/qsJ3w
:situation:
queen Queen alignment
bishop queen alignment
Pawn attacks bishop
rook Rook alignment blocked_by bishop
queen eyes Knight blocked_by Pawn
Queen is_hanging
rooks are_aligned
pawn is_around_the_king
Knight eyes pawn
Knight can_fork king queen
Queen can_threaten_mate_on pawn with Knight
`

let b = `
Knight eyes pawn and can_fork king and queen protected_by pawn
Queen can_eye king blocked_by pawn and threaten_mate_on pawn
:link: https://lichess.org/training/qsJ3w
:situation:
queen Queen alignment
bishop queen alignment
Pawn attacks bishop
rook Rook alignment blocked by bishop
queen eyes Knight blocked by Pawn
Queen is hanging
rooks are aligned
material rook up

Knight eyes king pawn and can fork king and queen protected by king pawn
Queen can_eye king blocked by king pawn and threaten mate on king pawn, king cant escape mate, black cant defend both mate and Knight fork, queen can defend mate but cannot escape Knight fork winning.
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


it.skip('works', () => {
    let b = mor1(a)
    expect(b).toBe(``)
})

it('mor2', () => {
    let b = mor2(a)
    expect(b).toBe(``)
})
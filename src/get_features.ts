import { BISHOP, KING, KNIGHT, make_move_from_to, move_c_to_Move, PAWN, piece_c_color_of, piece_c_type_of, PieceTypeC, QUEEN, ROOK } from "./distill/hopefox_c"
import { SquareSet } from "./distill/squareSet"
import { Square } from "./distill/types"
import { PositionMaterializer } from "./pos_materializer"


export type MZ_Typed_Forks = {
    knight_takes_hanging_queen: { from: Square, to: Square }[]
    bishop_forks_king_and_rook: { from: Square, to: Square, king: Square, rook: Square }[]
    queen_see_king_with_bishop: { queen: Square, king_to: Square, bishop: Square }[]
    queen_bishop_mate: { queen: Square, to: Square, king: Square, bishop: Square }[]
    queen_rook_through_mate: { queen: Square, to: Square, king: Square, rook: Square }[]
    queen_attacks_hanging_knight: { from: Square, to: Square, knight: Square }[]
    rook_captures_rook: { from: Square, to: Square }[]
    queen_captures_queen: { from: Square, to: Square }[]
    pawn_captures_bishop: { from: Square, to: Square }[]
}

export function mz_typed_forks(mz_views: MZ_Views, mz_forks: MZ_Forks): MZ_Typed_Forks {
    
    let bishop_forks_king_and_rook: { from: Square, to: Square, king: Square, rook: Square }[] = []
    let queen_see_king_with_bishop: { queen: Square, king_to: Square, bishop: Square }[] = []

    let queen_bishop_mate: { queen: Square, to: Square, king: Square, bishop: Square }[] = []

    let queen_see_king_with_rook_through: { queen: Square, king_to: Square, rook: Square }[] = []

    for (let a of mz_forks.attack_double_from_see_through) {
        for (let k of mz_forks.opponent_king_see) {
            if (k.to !== a.to) {
                continue
            }
            for (let q of mz_forks.turn_queens) {
                if (q.from !== a.from_a) {
                    continue
                }
                for (let b of mz_forks.turn_rooks) {
                    if (b.from !== a.from_b) {
                        continue
                    }

                    queen_see_king_with_rook_through.push({ queen: q.from, king_to: a.to, rook: b.from })
                }
            }
        }
    }




    for (let a of mz_forks.attack_double_from_see) {
        for (let k of mz_forks.opponent_king_see) {
            if (k.to !== a.to) {
                continue
            }
            for (let q of mz_forks.turn_queens) {
                if (q.from !== a.from_a) {
                    continue
                }
                for (let b of mz_forks.turn_bishops) {
                    if (b.from !== a.from_b) {
                        continue
                    }

                    queen_see_king_with_bishop.push({ queen: q.from, king_to: a.to, bishop: b.from })
                }
            }
        }
    }


    for (let q of queen_see_king_with_bishop) {
        for (let b of mz_forks.opponent_non_king_uncapturable) {
            if (b.to !== q.king_to) {
                continue
            }

            queen_bishop_mate.push({ queen: q.queen, to: q.king_to, king: mz_forks.opponent_king.from, bishop: q.bishop })
        }
    }


    for (let f of mz_forks.fork) {
        for (let b of mz_forks.turn_bishops) {
            if (b.from !== f.from) {
                continue
            }

            let king = mz_forks.opponent_king

            if (king.from !== f.fork_a) {
                continue
            }


            for (let rook of mz_forks.opponent_rooks) {
                if (rook.from !== f.fork_b) {
                    continue
                }

                bishop_forks_king_and_rook.push({ from: f.from, to: f.to, king: king.from, rook: rook.from })
            }
        }
    }

    let turn_queen_attack_see2: { from: Square, to: Square, to2: Square }[] = []

    for (let q of mz_forks.turn_queens) {
        for (let a2 of mz_views.attack_see2) {
            if (a2.from === q.from) {
                turn_queen_attack_see2.push(a2)
            }
        }
    }


    let opponent_hanging_queen: { from: Square }[] = []

    for (let q of mz_forks.opponent_queens) {
        for (let h of mz_forks.hanging) {
            if (q.from === h.from) {
                opponent_hanging_queen.push(h)
            }
        }
    }



    let opponent_hanging_knight: { from: Square }[] = []

    for (let k of mz_forks.opponent_knights) {
        for (let h of mz_forks.hanging) {
            if (k.from === h.from) {
                opponent_hanging_knight.push(h)
            }
        }
    }

    let queen_attacks_hanging_knight: { from: Square, to: Square, knight: Square }[] = []

    for (let h of opponent_hanging_knight) {
        for (let q of turn_queen_attack_see2) {
            if (h.from === q.to2) {
                queen_attacks_hanging_knight.push({ from: q.from, to: q.to, knight: h.from })
            }
        }
    }

    let turn_knight_attack: { from: Square, to: Square }[] = []

    for (let q of mz_forks.turn_knights) {
        for (let a of mz_views.attack_see) {
            if (a.from === q.from) {
                turn_knight_attack.push(a)
            }
        }
    }



    let turn_rook_attack: { from: Square, to: Square }[] = []

    for (let q of mz_forks.turn_rooks) {
        for (let a of mz_views.attack_see) {
            if (a.from === q.from) {
                turn_rook_attack.push(a)
            }
        }
    }



    let turn_queen_attack: { from: Square, to: Square }[] = []

    for (let q of mz_forks.turn_queens) {
        for (let a of mz_views.attack_see) {
            if (a.from === q.from) {
                turn_queen_attack.push(a)
            }
        }
    }


    let turn_pawn_attack: { from: Square, to: Square }[] = []

    for (let q of mz_forks.turn_pawns) {
        for (let a of mz_views.attack_see) {
            if (a.from === q.from) {
                turn_pawn_attack.push(a)
            }
        }
    }




    let knight_takes_hanging_queen: { from: Square, to: Square }[] = []

    for (let h of opponent_hanging_queen) {
        for (let k of turn_knight_attack) {
            if (h.from === k.to) {
                knight_takes_hanging_queen.push(k)
            }
        }
    }

    let rook_captures_rook: { from: Square, to: Square }[] = []
    for (let r2 of mz_forks.opponent_rooks) {
        for (let r of turn_rook_attack) {
            if (r2.from === r.to) {
                rook_captures_rook.push(r)
            }
        }
    }


    let queen_captures_queen: { from: Square, to: Square }[] = []
    for (let r2 of mz_forks.opponent_queens) {
        for (let r of turn_queen_attack) {
            if (r2.from === r.to) {
                queen_captures_queen.push(r)
            }
        }
    }

    let pawn_captures_bishop: { from: Square, to: Square }[] = []
    for (let r2 of mz_forks.opponent_bishops) {
        for (let r of turn_pawn_attack) {
            if (r2.from === r.to) {
                pawn_captures_bishop.push(r)
            }
        }
    }


    let queen_rook_through_mate: { queen: Square, to: Square, king: Square, rook: Square }[] = []

    for (let q of queen_see_king_with_rook_through) {
        for (let b of mz_forks.opponent_non_king_uncapturable) {
            if (b.to !== q.king_to) {
                continue
            }

            queen_rook_through_mate.push({ queen: q.queen, to: q.king_to, king: mz_forks.opponent_king.from, rook: q.rook })
        }
    }





    return {
        knight_takes_hanging_queen,
        queen_see_king_with_bishop,
        bishop_forks_king_and_rook,
        queen_bishop_mate,
        queen_rook_through_mate,
        queen_attacks_hanging_knight,
        rook_captures_rook,
        queen_captures_queen,
        pawn_captures_bishop,
    }
}



export type MZ_Forks = {
    turn_king: { from: Square }
    turn_pawns: { from: Square }[]
    turn_queens: { from: Square }[]
    turn_bishops: { from: Square }[]
    turn_knights: { from: Square }[]
    turn_rooks: { from: Square }[]
    opponent_knights: { from: Square }[]
    opponent_bishops: { from: Square }[]
    opponent_rooks: { from: Square }[]
    opponent_queens: { from: Square }[]
    opponent_king: { from: Square }
    opponent_king_see: { to: Square }[]
    opponent_non_king_uncapturable: { to: Square }[]
    turn_king_capturable: { from: Square, to: Square }[]
    fork: { from: Square, to: Square, fork_a: Square, fork_b: Square }[]
    attack_double_from_see: { from_a: Square, from_b: Square, to: Square }[]
    attack_double_from_see_through: { from_a: Square, from_b: Square, to: Square }[]
    hanging: { from: Square }[]
}

export type AttackSee2 = { from: Square, to: Square, to2: Square }

export function mz_forks(mz_views: MZ_Views): MZ_Forks {

    let turn_pawns: { from: Square }[] = []
    let turn_queens: { from: Square }[] = []
    let turn_bishops: { from: Square }[] = []
    let turn_knights: { from: Square }[] = []
    let turn_rooks: { from: Square }[] = []

    let opponent_bishops: { from: Square }[] = []
    let opponent_knights: { from: Square }[] = []
    let opponent_rooks: { from: Square }[] = []
    let opponent_queens: { from: Square }[] = []
    let opponent_king!: { from: Square }
    let opponent_king_see: { to: Square }[] = []

    let turn_king!: { from: Square }

    let attack_double_from_see: { from_a: Square, from_b: Square, to: Square }[] = []
    let attack_double_from_see_through: { from_a: Square, from_b: Square, to: Square }[] = []

    let opponent_non_king_uncapturable: { to: Square }[] = []

    let turn_king_capturable: { from: Square, to: Square }[] = []

    let hanging: { from: Square }[] = []

    for (let b of mz_views.turn) {
        if (b.role === KNIGHT) {
            turn_knights.push({ from: b.from })
        } else if (b.role === BISHOP) {
            turn_bishops.push({ from: b.from })
        } else if (b.role === ROOK) {
            turn_rooks.push({ from: b.from })
        } else if (b.role === QUEEN) {
            turn_queens.push({ from: b.from })
        } else if (b.role === KING) {
            turn_king = { from: b.from }
        } else if (b.role === PAWN) {
            turn_pawns.push({ from: b.from})
        }
    }

    for (let b of mz_views.opponent) {
        if (b.role === BISHOP) {
            opponent_bishops.push({ from: b.from })
        } else if (b.role === KNIGHT) {
            opponent_knights.push({ from: b.from })
        } else if (b.role === ROOK) {
            opponent_rooks.push({ from: b.from })
        } else if (b.role === QUEEN) {
            opponent_queens.push({ from: b.from })
        } else if (b.role === KING) {
            opponent_king = { from: b.from }
        }
    }

    for (let a of mz_views.attack_see) {
        if (a.from === opponent_king.from) {
            opponent_king_see.push({ to: a.to })
        }
    }
    for (let a of mz_views.defend_see) {
        if (a.from === opponent_king.from) {
            opponent_king_see.push({ to: a.to })
        }
    }
    for (let a of mz_views.vacant_see) {
        if (a.from === opponent_king.from) {
            opponent_king_see.push({ to: a.to })
        }
    }



    for (let a of mz_views.attack_see) {
        for (let b of mz_views.attack_see) {
            if (a.to === b.to) {
                if (a.from !== b.from) {
                    attack_double_from_see.push({ from_a: a.from, from_b: b.from, to: a.to })
                }
            }
        }
    }

    for (let a of mz_views.attack_see) {
        for (let b of mz_views.attack_see_through) {
            if (a.to === b.to) {
                if (a.from !== b.from) {
                    if (a.from === b.to_through) {
                        attack_double_from_see_through.push({ from_a: a.from, from_b: b.from, to: a.to })
                    }
                }
            }
        }
    }



    for (let o of mz_views.attack_see) {
        if (o.from !== turn_king.from) {
            continue
        }

        turn_king_capturable.push({ from: o.from, to: o.to })
    }

    let defend_or_vacant_see = [...mz_views.defend_see, ...mz_views.vacant_see]

    let non_king_opponent_capturable = SquareSet.empty()
    for (let o of mz_views.opponent) {
        if (o.from === opponent_king.from) {
            continue
        }

        for (let a of defend_or_vacant_see) {
           if (o.from === a.from) {
                non_king_opponent_capturable = non_king_opponent_capturable.set(a.to, true)
            }
        }
    }

    let non_king_opponent_uncapturable = non_king_opponent_capturable.complement()
    for (let sq of non_king_opponent_uncapturable) {
        opponent_non_king_uncapturable.push({ to: sq })
    }


    let fork: { from: Square, to: Square, fork_a: Square, fork_b: Square }[] = []

    let bishop_attacks = new Map<Square, AttackSee2[]>()
    for (let b of mz_views.turn) {
        for (let a of mz_views.attack_see2) {
            if (a.from === b.from) {
                let move = make_move_from_to(a.from, a.to)
                if (!bishop_attacks.has(move)) {
                    bishop_attacks.set(move, [a])
                } else {
                    bishop_attacks.get(move)!.push(a)
                }
            }
        }
    }

    for (let [move, a2s] of bishop_attacks) {
        if (a2s.length === 2) {
            if (a2s[0].to2 === a2s[1].to2) {
                continue
            }
            let { from } = move_c_to_Move(move)
            fork.push({ from, to: a2s[0].to, fork_a: a2s[0].to2, fork_b: a2s[1].to2 })
            fork.push({ from, to: a2s[0].to, fork_a: a2s[1].to2, fork_b: a2s[0].to2 })
        }
    }

    let defended_set = SquareSet.empty()
    for (let a of mz_views.defend_see) {
        defended_set = defended_set.set(a.to, true)
    }
    let hanging_set = defended_set.complement()

    for (let a of hanging_set) {
        hanging.push({ from: a })
    }

    return {
        fork,
        turn_king,
        turn_pawns,
        turn_queens,
        turn_rooks,
        turn_bishops,
        turn_knights,
        opponent_knights,
        opponent_bishops,
        opponent_rooks,
        opponent_king,
        opponent_king_see,
        attack_double_from_see,
        attack_double_from_see_through,
        opponent_non_king_uncapturable,
        turn_king_capturable,
        hanging,
        opponent_queens
    }
}


export type MZ_Views = {
    turn: { from: Square, role: PieceTypeC }[]
    opponent: { from: Square, role: PieceTypeC }[]
    vacant_see: { from: Square, to: Square }[]
    defend_see: { from: Square, to: Square }[]
    attack_see: { from: Square, to: Square }[]
    vacant_see2: { from: Square, to: Square, to2: Square }[]
    defend_see2: { from: Square, to: Square, to2: Square }[]
    attack_see2: { from: Square, to: Square, to2: Square }[]
    attack_see_through: { from: Square, to: Square, to_through: Square }[]
}

export function mz_views(mz: PositionMaterializer): MZ_Views {

    let attack_see_through: { from: Square, to: Square, to_through: Square }[] = []

    let vacant_see2: { from: Square, to: Square, to2: Square }[] = []
    let defend_see2: { from: Square, to: Square, to2: Square }[] = []
    let attack_see2: { from: Square, to: Square, to2: Square }[] = []

    let vacant_see: { from: Square, to: Square }[] = []
    let defend_see: { from: Square, to: Square }[] = []
    let attack_see: { from: Square, to: Square }[] = []

    let turn: { from: Square, role: PieceTypeC }[] = []
    let opponent: { from: Square, role: PieceTypeC }[] = []

    let occupied = mz.m.pos_occupied(mz.pos)
    let turn_color = mz.m.pos_turn(mz.pos)

    for (let sq of occupied) {
        let piece = mz.m.get_at(mz.pos, sq)!
        let piece_color = piece_c_color_of(piece)
        let is_turn = piece_color === turn_color
        if (is_turn) {
            turn.push({ from: sq, role: piece_c_type_of(piece) })
        } else {
            opponent.push({ from: sq, role: piece_c_type_of(piece) })
        }


        let aa_occupied = occupied.without(sq)
        let aa = mz.m.pos_attacks(mz.pos, sq)

        for (let a of aa) {
            let piece2 = mz.m.get_at(mz.pos, a)

            let is_vacant = !piece2

            let is_defend = piece2 && piece_c_color_of(piece2) === piece_color

            if (is_vacant) {
                vacant_see.push({ from: sq, to: a })
            } else if (is_defend) {
                defend_see.push({ from: sq, to: a })
            } else {
                attack_see.push({ from: sq, to: a })
            }


            let aa2 = mz.m.attacks(piece, a, aa_occupied)

            for (let a2 of aa2) {
                let piece3 = mz.m.get_at(mz.pos, a2)

                let is_vacant = !piece3

                let is_defend = piece3 && piece_c_color_of(piece3) === piece_color

                if (is_vacant) {
                    vacant_see2.push({ from: sq, to: a, to2: a2 })
                } else if (is_defend) {
                    defend_see2.push({ from: sq, to: a, to2: a2 })
                } else {
                    attack_see2.push({ from: sq, to: a, to2: a2 })
                }
            }


            let aa_through = 
                mz.m.attacks(piece, a, aa_occupied.without(a))
                    .diff(aa)

            for (let a_through of aa_through) {
                let piece3 = mz.m.get_at(mz.pos, a_through)

                let is_vacant = !piece3

                let is_defend = piece3 && piece_c_color_of(piece3) === piece_color

                if (is_vacant) {
                    //vacant_see2.push({ from: sq, to: a, to2: a2 })
                } else if (is_defend) {
                    //defend_see2.push({ from: sq, to: a, to2: a2 })
                } else {
                    attack_see_through.push({ from: sq, to: a_through, to_through: a })
                }
            }



        }
    }

    return {
        turn,
        opponent,
        vacant_see,
        defend_see,
        attack_see,
        vacant_see2,
        defend_see2,
        attack_see2,
        attack_see_through
    }
}
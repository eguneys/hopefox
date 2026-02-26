import { Position } from "./distill/chess";
import { BISHOP, KING, KNIGHT, make_move_from_to, move_c_to_Move, MoveC, piece_c_color_of, piece_c_type_of, PositionC, PositionManager, QUEEN, ROOK } from "./distill/hopefox_c";
import { makeSan } from "./distill/san";
import { Move, Square } from "./distill/types";
import { NodeId, NodeManager } from "./node_manager";
import { PositionMaterializer, san_moves_c, WorldId } from "./pos_materializer";

type Row = {
    id: number
    [key: string]: number
}

type Relation = {
    rows: Row[]
}


type Build0 = {
    occupies: Relation
    attacks: Relation
    defended_by: Relation
    attacked_by: Relation
    bishops: Relation
    bishop_defended_by: Relation
    bishop_defended_by_knight: Relation
    bishop_only_defended_by_knight: Relation
    attacks2: Relation
    attacked_by2: Relation
    defended_by2: Relation
    checks: Relation


    knights: Relation
    queens: Relation
    bishop_attacked_by_queen: Relation


    queen_defended_by: Relation
    queen_attacked_by: Relation
    queen_only_defended_by_rook: Relation
    queen_defended_by_rook: Relation
    queen_attacked_by_queen: Relation

    rooks: Relation

    rook_attacks_to2: Relation

    rook_attacks_to2_piece: Relation
    rook_attacks_to2_2pieces: Relation

    rook_forks2_king_and_rook: Relation

    kings: Relation


    queen_attacks: Relation
    queen_attacks_through: Relation
}


function build0(id: WorldId, mz: PositionMaterializer): Build0 {
    mz.make_to_world(id)
    let occ = mz.m.pos_occupied(mz.pos)

    let occupies: Relation = { rows: [] }
    let attacks: Relation = { rows: [] }

    for (let sq of occ) {
        let piece = mz.m.get_at(mz.pos, sq)!
        let aa = mz.m.pos_attacks(mz.pos, sq)

        let role = piece_c_type_of(piece)
        let color = piece_c_color_of(piece)

        occupies.rows.push({ id, from: sq, role, color, piece })
        for (let a of aa) {
            attacks.rows.push({ id, from: sq, to: a })
        }
    }

    let attacks2: Relation = { rows: [] }
    for (let a of attacks.rows) {
        for (let o of occupies.rows) {
            if (a.from !== o.from) {
                continue
            }

            let occ = mz.m.pos_occupied(mz.pos).without(a.from).with(a.to)
            let aa = mz.m.attacks(o.piece, a.to, occ)

            for (let a2 of aa) {
                if (a2 == a.from) {
                    continue
                }
                attacks2.rows.push({ id, from: a.from, to: a.to, to2: a2 })
            }
        }
    }




    let defended_by: Relation = { rows: [] }
    let attacked_by: Relation = { rows: [] }

    let rows = []
    for (let a of attacks.rows) {
        for (let o of occupies.rows) {
            if (a.from !== o.from) {
                continue
            }
            rows.push({ ...a, ...o })
        }
    }

    for (let r of rows) {
        for (let o of occupies.rows) {
            if (r.to !== o.from) {
                continue
            }
            if (r.color !== o.color) {
                attacked_by.rows.push({ id, from: r.from, to: r.to })
            } else {
                defended_by.rows.push({ id, from: r.from, to: r.to })
            }
        }
    }

    let bishops: Relation = { rows: [] }

    for (let o of occupies.rows) {
        if (o.role !== BISHOP) {
            continue
        }
        bishops.rows.push(o)
    }

    let knights: Relation = { rows: [] }

    for (let o of occupies.rows) {
        if (o.role !== KNIGHT) {
            continue
        }
        knights.rows.push(o)
    }

    let queens: Relation = { rows: [] }

    for (let o of occupies.rows) {
        if (o.role !== QUEEN) {
            continue
        }
        queens.rows.push(o)
    }


    let rooks: Relation = { rows: [] }

    for (let o of occupies.rows) {
        if (o.role !== ROOK) {
            continue
        }
        rooks.rows.push(o)
    }

    let kings: Relation = { rows: [] }

    for (let o of occupies.rows) {
        if (o.role !== KING) {
            continue
        }
        kings.rows.push(o)
    }




    let bishop_defended_by: Relation = { rows: [] }

    for (let d of defended_by.rows) {
        for (let b of bishops.rows) {
            if (d.to !== b.from) {
                continue
            }
            bishop_defended_by.rows.push({ id, from: d.from, to: d.to })
        }
    }


    let bishop_defended_by_knight: Relation = { rows: [] }
    for (let d of bishop_defended_by.rows) {
        for (let k of knights.rows) {
            if (d.from !== k.from) {
                continue
            }
            bishop_defended_by_knight.rows.push({ id, from: d.from, to: d.to })
        }
    }

    let bishop_only_defended_by_knight: Relation = { rows: [] }
    outer: for (let d of bishop_defended_by_knight.rows) {
        let only = false
        for (let b of bishop_defended_by.rows) {
            if (d.to !== b.to) {
                continue
            }
            if (!only) {
                only = true
                continue
            }
            continue outer
        }
        bishop_only_defended_by_knight.rows.push(d)
    }

    let attacked_by2: Relation = { rows: [] }
    let defended_by2: Relation = { rows: [] }

    rows = []
    for (let a2 of attacks2.rows) {
        for (let o of occupies.rows) {
            if (a2.from !== o.from) {
                continue
            }
            rows.push({ ...a2, ...o })
        }
    }
    for (let r of rows) {
        for (let o2 of occupies.rows) {
            if (r.to2 !== o2.from) {
                continue
            }
            if (r.color === o2.color) {
                defended_by2.rows.push({ id: r.id, from: r.from, to: r.to, to2: r.to2 })
            } else {
                attacked_by2.rows.push({ id: r.id, from: r.from, to: r.to, to2: r.to2 })
            }
        }
    }

    let checks: Relation = { rows: [] }

    for (let a2 of attacked_by2.rows) {
        for (let o of occupies.rows) {
            if (a2.to2 !== o.from) {
                continue
            }
            if (o.role !== KING) {
                continue
            }
            checks.rows.push(a2)
        }
    }

    let bishop_attacked_by: Relation = { rows: [] }
    for (let a of attacked_by.rows) {
        for (let b of bishops.rows) {
            if (a.to !== b.from) {
                continue
            }
            bishop_attacked_by.rows.push({ id, from: a.from, to: a.to })
        }
    }

    let bishop_attacked_by_queen: Relation = { rows: [] }
    for (let d of bishop_attacked_by.rows) {
        for (let q of queens.rows) {
            if (d.from !== q.from) {
                continue
            }
            bishop_attacked_by_queen.rows.push({ id, from: d.from, to: d.to })
        }
    }

    let queen_attacked_by: Relation = { rows: [] }
    let queen_defended_by: Relation = { rows: [] }

    
    for (let a of attacked_by.rows) {
        for (let q of queens.rows) {
            if (a.to !== q.from) {
                continue
            }
            queen_attacked_by.rows.push({ id: a.id, from: a.from, to: a.to })
        }
    }

    for (let d of defended_by.rows) {
        for (let q of queens.rows) {
            if (d.to !== q.from) {
                continue
            }
            queen_defended_by.rows.push({ id, from: d.from, to: d.to })
        }
    }


    let queen_defended_by_rook: Relation = { rows: [] }
    for (let d of queen_defended_by.rows) {
        for (let k of rooks.rows) {
            if (d.from !== k.from) {
                continue
            }
            queen_defended_by_rook.rows.push({ id, from: d.from, to: d.to })
        }
    }



    let queen_only_defended_by_rook: Relation = { rows: [] }
    outer: for (let d of queen_defended_by_rook.rows) {
        let only = false
        for (let b of queen_defended_by.rows) {
            if (d.to !== b.to) {
                continue
            }
            if (!only) {
                only = true
                continue
            }
            continue outer
        }
        queen_only_defended_by_rook.rows.push(d)
    }

    let queen_attacked_by_queen: Relation = { rows: [] }
    for (let d of queen_attacked_by.rows) {
        for (let q of queens.rows) {
            if (d.from !== q.from) {
                continue
            }
            queen_attacked_by_queen.rows.push({ id, from: d.from, to: d.to })
        }
    }


    let rook_attacks_to2: Relation = { rows: [] }
    for (let a of attacks2.rows) {
        for (let r of rooks.rows) {
            if (a.from !== r.from) {
                continue
            }
            rook_attacks_to2.rows.push(a)
        }
    }

    let rook_attacks_to2_piece: Relation = { rows: [] }
    rows = []
    for (let r2 of rook_attacks_to2.rows) {
        for (let o of occupies.rows) {
            if (r2.from !== o.from) {
                continue
            }
            rows.push({ ...r2, ...o })
        }
    }

    for (let r2 of rows) {
        for (let o2 of occupies.rows) {
            if (r2.to2 !== o2.from) {
                continue
            }
            if (r2.color === o2.color) {
                continue
            }
            rook_attacks_to2_piece.rows.push(r2)
        }
    }

    let rook_attacks_to2_2pieces: Relation = { rows: [] }

    let group_by_fromTo: Map<number, Relation> = new Map()
    for (let r2 of rook_attacks_to2_piece.rows) {
        let fromToKey = make_move_from_to(r2.from, r2.to)
        let group = group_by_fromTo.get(fromToKey)

        if (!group) {
            group_by_fromTo.set(fromToKey, { rows: [] })
            group = group_by_fromTo.get(fromToKey)
        }

        group!.rows.push(r2)
    }

    for (let ra_to of group_by_fromTo.keys()) {
        let group = group_by_fromTo.get(ra_to)!
        if (group.rows.length === 2) {
            rook_attacks_to2_2pieces.rows.push({ 
                id, 
                from: group.rows[0].from, 
                to: group.rows[0].to, 
                to2_a: group.rows[0].to2, 
                to2_b: group.rows[1].to2 
            })
            rook_attacks_to2_2pieces.rows.push({ 
                id, 
                from: group.rows[0].from, 
                to: group.rows[0].to, 
                to2_a: group.rows[1].to2, 
                to2_b: group.rows[0].to2 
            })
        }
    }

    let rook_forks2_king_and_rook: Relation = { rows: [] }

    for (let r2 of rook_attacks_to2_2pieces.rows) {
        let a_is_found = false
        for (let k of rooks.rows) {
            if (r2.to2_b !== k.from) {
                continue
            }
            a_is_found = true
            break
        }

        if (!a_is_found) {
            continue
        }

        for (let k of kings.rows) {
            if (r2.to2_a !== k.from) {
                continue
            }
            rook_forks2_king_and_rook.rows.push(r2)
        }
    }


    let queen_attacks: Relation = { rows: [] }

    for (let a of attacks.rows) {
        for (let q of queens.rows) {
            if (a.from !== q.from) {
                continue
            }
            queen_attacks.rows.push(a)
        }
    }


    let queen_attacks_through: Relation = { rows: [] }


    for (let q of queen_attacks.rows) {

        for (let o of occupies.rows) {
            if (q.from !== o.from) {
                continue
            }

            let occ = mz.m.pos_occupied(mz.pos)

            let aa1 = mz.m.attacks(o.piece, o.from, occ)
            let aa2 = mz.m.attacks(o.piece, o.from, occ.without(q.to))
            let aa = aa2.diff(aa1)

            for (let a of aa) {
                queen_attacks_through.rows.push({ id, from: q.from, to: a, to_through: q.to })
            }
        }
    }


    mz.unmake_world(id)

    return {
        occupies,
        attacks,
        defended_by,
        attacked_by,
        bishops,
        bishop_defended_by,
        bishop_defended_by_knight,
        bishop_only_defended_by_knight,
        attacks2,
        attacked_by2,
        defended_by2,
        checks,

        knights,
        queens,
        bishop_attacked_by_queen,

        queen_attacked_by,
        queen_defended_by,
        queen_only_defended_by_rook,
        queen_defended_by_rook,
        queen_attacked_by_queen,

        rooks,
        rook_attacks_to2,
        rook_attacks_to2_2pieces,
        rook_attacks_to2_piece,

        rook_forks2_king_and_rook,
        kings,

        queen_attacks,
        queen_attacks_through
    }
}


function build3(id: WorldId, mz: PositionMaterializer) {

    let b0 = build0(id, mz)

    let queen_rook_queen_alignment: Relation = { rows: [] }

    let rows = []
    for (let q of b0.queen_only_defended_by_rook.rows) {
        for (let q2 of b0.queen_attacked_by_queen.rows) {
            if (q.to !== q2.to) {
                continue
            }

            rows.push({ id, from: q.from, to: q.to, queen2: q2.from })
        }
    }

    for (let q of rows) {
        for (let qt of b0.queen_attacks_through.rows) {
            if (q.queen2 !== qt.from) {
                continue
            }
            if (q.to !== qt.to_through) {
                continue
            }
            if (q.from !== qt.to) {
                continue
            }
            queen_rook_queen_alignment.rows.push(qt)
        }
    }

    let goods: Relation = { rows: [] }

    for (let r2 of b0.rook_forks2_king_and_rook.rows) {
        let to_rook = r2.to2_b
        for (let q of queen_rook_queen_alignment.rows) {
            if (q.to !== to_rook) {
                continue
            }

            goods.rows.push(r2)
        }
    }

    let b2 = build2(id, mz)

    let legal_goods: Relation = { rows: [] }

    for (let legal of b2.legal_moves.rows) {

        for (let g of goods.rows) {
            if (legal.from !== g.from) {
                continue
            }
            if (legal.to !== g.to) {
                continue
            }


            legal_goods.rows.push({id: legal.id2})
        }
    }

    let candidates: Relation = legal_goods

    return {
        candidates
    }
}




export function make_fast(m: PositionManager, pos: PositionC) {
    let mz = new PositionMaterializer(m, pos)

    let res = build3(0, mz).candidates


    return res.rows.map(_ => mz.sans(_.id))
}





    function build2(id: WorldId, mz: PositionMaterializer) {
        let b0 = build0(id, mz)

        let legal_moves: Relation = { rows: [] }

        for (let move of mz.generate_legal_moves(id)) {
            let { from, to } = move_c_to_Move(move)
            let id2 = mz.add_move(id, move)
            legal_moves.rows.push({ id, from, to, id2 })
        }

        let legal_checks: Relation = { rows: [] }

        for (let check of b0.checks.rows) {
            for (let move of legal_moves.rows) {
                if (check.from !== move.from) {
                    continue
                }
                if (check.to !== move.to) {
                    continue
                }
                legal_checks.rows.push(move)
            }
        }

        let legal_knight_checks: Relation = { rows: [] }

        for (let k of b0.knights.rows) {
            for (let l of legal_checks.rows) {
                if (k.from !== l.from) {
                    continue
                }
                legal_knight_checks.rows.push(l)
            }
        }

        let legal_knight_checks_captures_the_knight: Relation = { rows: [] }

        for (let check of legal_knight_checks.rows) {
            for (let k of b0.bishop_only_defended_by_knight.rows) {
                if (check.to !== k.from) {
                    continue
                }
                legal_knight_checks_captures_the_knight.rows.push({...check, bishop_only_defended_by_knight: k.to})
            }
        }


        let responses1: Relation = { rows: [] }

        for (let lc of legal_knight_checks_captures_the_knight.rows) {
            responses1.rows.push(...build2(lc.id2, mz).legal_moves.rows.map(_ => ({..._, bishop_only_defended_by_knight: lc.bishop_only_defended_by_knight })))
        }

        let responses1_b: Relation = { rows: [] }
        for (let r1 of responses1.rows) {
            let bishop_attacked_by_queen = build0(r1.id2, mz).bishop_attacked_by_queen

            for (let b of bishop_attacked_by_queen.rows) {
                if (r1.bishop_only_defended_by_knight !== b.to) {
                    continue
                }
                responses1_b.rows.push({ id: r1.id, from: r1.from, to: r1.to})
            }
        }

        let res = {
            responses1_b,
            legal_moves,
            legal_checks
        }

        return res
    }


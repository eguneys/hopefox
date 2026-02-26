import { Position } from "./distill/chess";
import { BISHOP, KING, KNIGHT, make_move_from_to, move_c_to_Move, MoveC, piece_c_color_of, piece_c_type_of, PositionC, PositionManager } from "./distill/hopefox_c";
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
}


function build0(id: WorldId, m: PositionManager, pos: PositionC): Build0 {
    let occ = m.pos_occupied(pos)

    let occupies: Relation = { rows: [] }
    let attacks: Relation = { rows: [] }

    for (let sq of occ) {
        let piece = m.get_at(pos, sq)!
        let aa = m.pos_attacks(pos, sq)

        let role = piece_c_type_of(piece)
        let color = piece_c_color_of(piece)

        occupies.rows.push({ id, from: sq, role, color, piece })
        for (let a of aa) {
            attacks.rows.push({ id, from: sq, to: a })
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

    let attacks2: Relation = { rows: [] }
    for (let a of attacks.rows) {
        for (let o of occupies.rows) {
            if (a.from !== o.from) {
                continue
            }

            let occ = m.pos_occupied(pos).without(a.from).with(a.to)
            let aa = m.attacks(o.piece, a.to, occ)

            for (let a2 of aa) {
                if (a2 == a.from) {
                    continue
                }
                attacks2.rows.push({ id, from: a.from, to: a.to, to2: a2 })
            }
        }
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
        checks
    }
}



export function make_fast(m: PositionManager, pos: PositionC) {
    let mz = new PositionMaterializer(m, pos)

    function build2(id: WorldId, b0: Build0 = build0(id, m, pos)) {

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

        let legal_checks_captures_the_knight: Relation = { rows: [] }

        for (let check of legal_checks.rows) {
            for (let k of b0.bishop_only_defended_by_knight.rows) {
                if (check.to !== k.from) {
                    continue
                }
                legal_checks_captures_the_knight.rows.push(check)
            }
        }


        let responses1: Relation = { rows: [] }

        for (let lc of legal_checks_captures_the_knight.rows) {
            responses1.rows.push(...build2(lc.id2).legal_moves.rows)
        }

        let responses1_b: Relation = { rows: [] }
        for (let r1 of responses1.rows) {
            responses1_b.rows.push(...build0(r1.id2, m, pos).attacks.rows)
        }

        for (let r1b of responses1_b.rows) {
        }

        let res = {
            legal_moves,
            legal_checks_captures_the_knight,
            responses1,
            responses1_b
        }

        return res
    }

    let res = build2(0).responses1_b


    return res.rows.map(_ => mz.sans(_.id2))
}
import { Position } from "./distill/chess";
import { BISHOP, color_c_opponent, KING, KNIGHT, make_move_from_to, move_c_to_Move, MoveC, PAWN, piece_c_color_of, piece_c_type_of, PositionC, PositionManager, QUEEN, ROOK } from "./distill/hopefox_c";
import { makeSan } from "./distill/san";
import { Move, Square } from "./distill/types";
import { NodeId, NodeManager } from "./node_manager";
import { PositionMaterializer, san_moves_c, WorldId } from "./pos_materializer";

type Row = {
    id: number
    [key: string]: number
}

class Relation {
    rows: Row[]

    constructor() {
        this.rows = []
    }

    push(row: Row) {
        this.rows.push(row)
    }
}

class RelationManager {


    static add_world_build0 = (id: WorldId, mz: PositionMaterializer, rm: RelationManager) => {
        mz.make_to_world(id)

        let occ = mz.m.pos_occupied(mz.pos)
        let turn = mz.m.pos_turn(mz.pos)

        for (let o of occ) {
            let piece = mz.m.get_at(mz.pos, o)!
            let role = piece_c_type_of(piece)
            let color = piece_c_color_of(piece)

            let has_turn = color === turn ? 1 : 0

            if (has_turn) {
                rm.turns.push({ id, from: o, role, color, piece })
            } else {
                rm.opponent.push({ id, from: o, role, color, piece })
            }
        }

        for (let o of occ) {
            let piece = mz.m.get_at(mz.pos, o)!
            let aa = mz.m.attacks(piece, o, occ)
            for (let a of aa) {
                let piece2 = mz.m.get_at(mz.pos, a)

                if (!piece2) {
                    rm.vacant_see.push({ id, from: o, to: a })
                    continue
                }

                if (piece_c_color_of(piece) === piece_c_color_of(piece2)) {
                    rm.defend_see.push({ id, from: o, to: a })
                } else {
                    rm.attack_see.push({ id, from: o, to: a })
                }
            }
        }


        for (let o of occ) {
            let piece = mz.m.get_at(mz.pos, o)!
            let aa = mz.m.attacks(piece, o, occ)
            for (let a of aa) {

                let aa2 = mz.m.attacks(piece, a, occ)
                for (let a2 of aa2) {

                    let piece2 = mz.m.get_at(mz.pos, a2)

                    if (!piece2) {
                        rm.vacant_see2.push({ id, from: o, to: a, to2: a2 })
                        continue
                    }

                    if (piece_c_color_of(piece) === piece_c_color_of(piece2)) {
                        rm.defend_see2.push({ id, from: o, to: a, to2: a2 })
                    } else {
                        rm.attack_see2.push({ id, from: o, to: a, to2: a2 })
                    }
                }
            }
        }


        for (let o of occ) {
            let piece = mz.m.get_at(mz.pos, o)!
            let aa = mz.m.attacks(piece, o, occ)
            for (let a of aa) {

                let aa1 = mz.m.attacks(piece, o, occ)
                let aa2 = mz.m.attacks(piece, o, occ.without(a))
                let aa3 = aa2.diff(aa1)
                for (let a2 of aa3) {

                    let piece2 = mz.m.get_at(mz.pos, a2)

                    if (!piece2) {
                        rm.vacant_see_through.push({ id, from: o, to: a, to_through: a2 })
                        continue
                    }

                    if (piece_c_color_of(piece) === piece_c_color_of(piece2)) {
                        rm.defend_see_through.push({ id, from: o, to: a, to_through: a2 })
                    } else {
                        rm.attack_see_through.push({ id, from: o, to: a, to_through: a2 })
                    }
                }
            }
        }

        mz.unmake_world(id)


        for (let move of mz.generate_legal_moves(id)) {
            let { from, to } = move_c_to_Move(move)
            let id2 = mz.add_move(id, move)

            rm.legal_moves.push({ id, from, to, id2 })
        }
    }

    turns = new Relation()
    opponent = new Relation()

    vacant_see = new Relation()
    attack_see = new Relation()
    defend_see = new Relation()

    vacant_see2 = new Relation()
    attack_see2 = new Relation()
    defend_see2 = new Relation()

    vacant_see_through = new Relation()
    attack_see_through = new Relation()
    defend_see_through = new Relation()

    legal_moves = new Relation()

    forEach(a: Relation, f: (a: Row) => void) {
        for (let a_row of a.rows) {
            f(a_row)
        }
    }

    join_forEach(a: Relation, b: Relation, f: (a: Row, b: Row) => void) {
        for (let a_row of a.rows) {
            for (let b_row of b.rows) {
                f(a_row, b_row)
            }
        }
    }

    get turn_attack_see2() {
        return this.select_right(this.turns, this.attack_see2, (a, b) => a.from === b.from)
    }

    fork = new Relation()


    add_world_build1() {


        const group_by_move: Map<number, Row[]> = new Map()
        this.forEach(this.turn_attack_see2, (a) => {
            let move = make_move_from_to(a.from, a.to)
            if (!group_by_move.has(move)) {
                group_by_move.set(move, [])
            }
            group_by_move.get(move)!.push(a)
        })

        for (let group of group_by_move.values()) {

            if (group.length === 2) {
                let a = group[0]
                let b = group[1]
                this.fork.push({
                    id: a.id,
                    from: a.from,
                    to: a.to,
                    fork_a: a.to2,
                    fork_b: b.to2
                })
                this.fork.push({
                    id: a.id,
                    from: a.from,
                    to: a.to,
                    fork_a: b.to2,
                    forK_b: a.to2
                })
            }
        }
    }

    select_left(aa: Relation, bb: Relation, select: (a: Row, b: Row) => boolean) {
        let res = new Relation()
        for (let a of aa.rows) {
            for (let b of bb.rows) {
                if (select(a, b)) {
                    res.push(a)
                }
            }
        }
        return res
    }



    select_right(aa: Relation, bb: Relation, select: (a: Row, b: Row) => boolean) {
        let res = new Relation()
        for (let a of aa.rows) {
            for (let b of bb.rows) {
                if (select(a, b)) {
                    res.push(b)
                }
            }
        }
        return res
    }


    select(aa: Relation, select: (a: Row) => boolean) {
        let res = new Relation()
        for (let a of aa.rows) {
            if (select(a)) {
                res.push(a)
            }
        }
        return res
    }


    get turn_bishops() {
        return this.select(this.turns, (a) => a.role === BISHOP)
    }

    get opponent_kings() {
        return this.select(this.opponent, (a) => a.role === KING)
    }
    get opponent_rooks() {
        return this.select(this.opponent, (a) => a.role === ROOK)
    }


    get opponent_see() {
        let a = this.select_right(this.opponent, this.attack_see, (a, b) => a.from === b.from)
        let b = this.select_right(this.opponent, this.defend_see, (a, b) => a.from === b.from)
        let c = this.select_right(this.opponent, this.vacant_see, (a, b) => a.from === b.from)

        return this.merge(a, b, c)
    }

    merge(a: Relation, b: Relation, c: Relation) {

        let res = new Relation()

        res.rows.push(...a.rows)
        res.rows.push(...b.rows)
        res.rows.push(...c.rows)

        return res
    }

    bishop_forks_king_and_rook() {
        let bishop_forks = this.select_right(this.turn_bishops, this.fork, (a, b) => a.from === b.from)

        let bishops_cannot_be_captured = this.anti_filter(bishop_forks, this.opponent_see, (a, b) => a.to === b.to)

        let next_bishops = bishops_cannot_be_captured

        let bishop_forks_king = this.select_right(this.opponent_kings, next_bishops, (a, b) => 
            a.from === b.fork_a
        )
        let bishop_forks_king_and_rook = this.select_right(this.opponent_rooks, bishop_forks_king, (a, b) => 
            a.from === b.fork_b
        )

        return this.select_left(this.legal_moves, bishop_forks_king_and_rook, (a, b) => a.from === b.from && a.to === b.to)
    }


    anti_filter(aa: Relation, bb: Relation, filter: (a: Row, b: Row) => boolean) {
        let res: Relation = new Relation()
        outer: for (let a of aa.rows) {
            for (let b of bb.rows) {
                if (filter(a, b)) {
                    continue outer
                }
            }

            res.push(a)
        }
        return res
    }
}


export function make_fast(m: PositionManager, pos: PositionC) {

    let mz = new PositionMaterializer(m, pos)
    let rm = new RelationManager()
    RelationManager.add_world_build0(0, mz, rm)
    rm.add_world_build1()

    let result = rm.bishop_forks_king_and_rook()


    return result.rows.map(_ => mz.sans(_.id2))
}
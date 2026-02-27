import { Position } from "./distill/chess";
import { BISHOP, color_c_opposite, KING, KNIGHT, make_move_from_to, move_c_to_Move, MoveC, PAWN, piece_c_color_of, piece_c_type_of, PositionC, PositionManager, QUEEN, ROOK } from "./distill/hopefox_c";
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
                rm.opposite.push({ id, from: o, role, color, piece })
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
                        rm.vacant_see2.push({ id, from: o, to: a2 })
                        continue
                    }

                    if (piece_c_color_of(piece) === piece_c_color_of(piece2)) {
                        rm.defend_see2.push({ id, from: o, to: a2 })
                    } else {
                        rm.attack_see2.push({ id, from: o, to: a2 })
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
                        rm.vacant_see_through.push({ id, from: o, to: a2 })
                        continue
                    }

                    if (piece_c_color_of(piece) === piece_c_color_of(piece2)) {
                        rm.defend_see_through.push({ id, from: o, to: a2 })
                    } else {
                        rm.attack_see_through.push({ id, from: o, to: a2 })
                    }
                }
            }
        }

        mz.unmake_world(id)
    }

    turns = new Relation()
    opposite = new Relation()

    vacant_see = new Relation()
    attack_see = new Relation()
    defend_see = new Relation()

    vacant_see2 = new Relation()
    attack_see2 = new Relation()
    defend_see2 = new Relation()

    vacant_see_through = new Relation()
    attack_see_through = new Relation()
    defend_see_through = new Relation()

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



    static add_world_build1 = (id: WorldId, mz: PositionMaterializer, rm: RelationManager) => {

    }
}


export function make_fast(m: PositionManager, pos: PositionC) {

    let rm = new RelationManager()

    let result = new Relation()
    return result
}
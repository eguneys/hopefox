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

            rm.occupies.push({ id, from: o, role, color, piece, has_turn })
        }

        rm.join_forEach(rm.occupies, rm.occupies, (a, b) => {
            if (a.from === b.from) {
                return
            }
            rm.occupies2.push({
                id,
                from_a: a.from,
                from_b: b.from,
                role_a: a.role,
                role_b: b.role,
                color_a: a.color,
                color_b: b.color,
                piece_a: a.piece,
                piece_b: b.piece,
                has_turn_a: a.has_turn,
                has_turn_b: b.has_turn,
            })
        })

        rm.join_forEach(rm.occupies, rm.occupies2, (a, bc) => {
            if (a.from === bc.from_a || a.from === bc.from_b) {
                return
            }
            rm.occupies3.push({
                id,
                from_a: a.from,
                from_b: bc.from_a,
                from_c: bc.from_b,
                role_a: a.role,
                role_b: bc.role_a,
                role_c: bc.role_b,
                color_a: a.color,
                color_b: bc.color_a,
                color_c: bc.color_b,
                piece_a: a.piece,
                piece_b: bc.piece_a,
                piece_c: bc.piece_b,
                has_turn_a: a.has_turn,
                has_turn_b: bc.has_turn_a,
                has_turn_c: bc.has_turn_b,
            })
        })


        rm.forEach(rm.occupies, (row) => {
            switch (row.role) {
                case ROOK:
                    rm.rooks.push(row)
                    break
                case KNIGHT:
                    rm.knights.push(row)
                    break
                case BISHOP:
                    rm.bishops.push(row)
                    break
                case QUEEN:
                    rm.queens.push(row)
                    break
                case KING:
                    rm.kings.push(row)
                    break
                case PAWN:
                    rm.pawns.push(row)
                    break
            }
        })


        rm.forEach(rm.occupies2, (a) => {
            switch (a.role_a) {
                case BISHOP:
                    switch (a.role_b) {
                        case BISHOP:
                            rm.bishops.push(a)
                            break
                        case QUEEN:
                            rm.bishop_queens.push(a)
                            break
                        case ROOK:
                            rm.bishop_rooks.push(a)
                            break
                        case KNIGHT:
                            rm.bishop_knights.push(a)
                            break
                        case KING:
                            rm.bishop_kings.push(a)
                            break
                    }
                    break
                case KNIGHT:
                    switch (a.role_b) {
                        case KNIGHT:
                            rm.knights2.push(a)
                            break
                        case QUEEN:
                            rm.knight_queens.push(a)
                            break
                        case ROOK:
                            rm.knight_rooks.push(a)
                            break
                        case KING:
                            rm.knight_kings.push(a)
                            break
                    }
                    break
                case ROOK:
                    switch (a.role_b) {
                        case ROOK:
                            rm.rooks2.push(a)
                            break
                        case QUEEN:
                            rm.rook_queens.push(a)
                            break
                        case KING:
                            rm.rook_kings.push(a)
                            break
                    }
                    break
                case QUEEN:
                    switch (a.role_b) {
                        case QUEEN:
                            rm.queens2.push(a)
                            break

                        case KING:
                            rm.queen_kings.push(a)
                            break
                    }
                    break
                case KING:
                    switch (a.role_b) {
                        case KING:
                            rm.kings2.push(a)
                            break
                    }
                    break
            }
        })

        mz.unmake_world(id)
    }




    occupies = new Relation()
    occupies2 = new Relation()
    occupies3 = new Relation()

    bishops = new Relation()
    knights = new Relation()
    queens = new Relation()
    rooks = new Relation()
    kings = new Relation()
    pawns = new Relation()

    bishops2 = new Relation()
    knights2 = new Relation()
    queens2 = new Relation()
    rooks2 = new Relation()
    kings2 = new Relation()
    pawns2 = new Relation()

    bishop_knights = new Relation()
    bishop_rooks = new Relation()
    bishop_queens = new Relation()
    bishop_kings = new Relation()
    knight_rooks = new Relation()
    knight_queens = new Relation()
    knight_kings = new Relation()
    rook_queens = new Relation()
    rook_kings = new Relation()
    queen_kings = new Relation()

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

}


export function make_fast(m: PositionManager, pos: PositionC) {

    let rm = new RelationManager()

    let result = new Relation()
    return result
}
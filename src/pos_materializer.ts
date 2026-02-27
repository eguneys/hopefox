import { Position } from "./distill/chess"
import { move_c_to_Move, MoveC, PositionC, PositionManager } from "./distill/hopefox_c"
import { makeSan } from "./distill/san"
import { Move } from "./distill/types"
import { NodeId, NodeManager } from "./node_manager"

export type WorldId = NodeId

export class PositionMaterializer {
    m: PositionManager
    pos: PositionC

    nodes: NodeManager

    constructor(m: PositionManager, pos: PositionC) {
        this.m = m
        this.pos = pos
        this.nodes = new NodeManager()
    }


    is_checkmate(world_id: WorldId) {
        this.make_to_world(world_id)
        let res = this.m.is_checkmate(this.pos)
        this.unmake_world(world_id)
        return res
    }


    add_move(world_id: WorldId, move: MoveC) {
        return this.nodes.add_move(world_id, move)
    }


    make_to_world(world_id: WorldId) {
        let moves = this.nodes.history_moves(world_id)
        for (let i = 0; i < moves.length; i++) {
            this.m.make_move(this.pos, moves[i])
        }

    }

    unmake_world(world_id: WorldId) {
        let moves = this.nodes.history_moves(world_id)
        for (let i = moves.length - 1; i >= 0; i--) {
            this.m.unmake_move(this.pos, moves[i])
        }
    }


    pos_occupied(world_id: WorldId) {
        this.make_to_world(world_id)
        let res = this.m.pos_occupied(this.pos)
        this.unmake_world(world_id)
        return res
    }

    generate_legal_worlds(world_id: WorldId) {
        return this.generate_legal_moves(world_id).map(_ => this.add_move(world_id, _))
    }

    generate_legal_moves(world_id: WorldId) {
        this.make_to_world(world_id)
        let res = this.m.get_legal_moves(this.pos)
        this.unmake_world(world_id)
        return res
    }

    sans(world_id: WorldId) {

        let res = this.nodes.history_moves(world_id)
        let res2 = san_moves_c(this.m, this.pos, res)
        return res2
    }
}

export function san_moves_c(m: PositionManager, pos: PositionC, moves: MoveC[]) {
    return san_moves(m.get_pos_read_fen(pos), moves.map(m => move_c_to_Move(m)))
}


type SAN = string

export function san_moves(pos: Position, moves: Move[]) {
    let res: SAN[] = []
    let p2 = pos.clone()
    for (let move of moves) {
        res.push(makeSan(p2, move))
        p2.play(move)
    }
    return res
}

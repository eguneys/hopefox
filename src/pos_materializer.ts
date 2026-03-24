import { Position } from "./distill/chess"
import { make_move_from_to, move_c_to_Move, MoveC, PositionC, PositionManager } from "./distill/hopefox_c"
import { makeSan, parseSan } from "./distill/san"
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

    incremented_to_world: WorldId = 0
    inc_make_world(world_id: WorldId) {
        this.incremented_to_world = world_id
        this.m.make_move(this.pos, this.nodes.move_of_world(world_id))
    }

    inc_unmake_world(world_id: WorldId) {
        let parent = this.nodes.parent_world_id(world_id)
        if (parent === undefined) {
            throw new Error('No parent')
        }
        this.incremented_to_world = parent
        this.m.unmake_move(this.pos, this.nodes.move_of_world(world_id))
    }

    inc_generate_legal_worlds() {
        let world_id = this.incremented_to_world
        return this.inc_generate_legal_moves().map(_ => this.add_move(world_id, _))
    }

    inc_generate_legal_moves() {
        let res = this.m.get_legal_moves(this.pos)
        return res
    }

    inc_add_move(move: MoveC) {
        let world_id = this.incremented_to_world
        let res = this.nodes.add_move(world_id, move)
        return res
    }


    inc_sans() {
        let res = this.nodes.history_moves(this.incremented_to_world)

        let tmp = []

        while (this.incremented_to_world > 0) {
            tmp.unshift(this.incremented_to_world)
            this.inc_unmake_world(this.incremented_to_world)
        }

        let res2 = san_moves_c(this.m, this.pos, res)

        for (let i = 0; i < tmp.length; i++) {
            this.inc_make_world(tmp[i])
        }

        return res2
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

    last_san(world_id: WorldId) {
        let res = this.sans(world_id)
        return res[res.length - 1]
    }

    sans(world_id: WorldId) {
        let res = this.nodes.history_moves(world_id)

        let res2 = san_moves_c(this.m, this.pos, res)


        return res2
    }


    add_sans_get_line(sans: SAN[]) {
        let res2 = moves_c_from_sans(this.m, this.pos, sans)

        let w = 0
        let line = []
        for (let i = 0; i < res2.length; i++) {
            w = this.add_move(w, res2[i])
            line.push(w)
        }

        return line
    }
}

export function moves_c_from_sans(m: PositionManager, pos: PositionC, sans: SAN[]) {
    let moves = []
    let p = m.get_pos_read_fen(pos)
    for (let i = 0; i < sans.length; i++) {
        let move = parseSan(p, sans[i])!
        moves.push(make_move_from_to(move.from, move.to))
        p.play(move)
    }
    return moves
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

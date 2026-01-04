import { Position } from "../chess"
import { BLACK, move_c_to_Move, MoveC, PositionC, PositionManager, WHITE } from "../hopefox_c"
import { FEN } from "../mor3_hope1"
import { Linked } from "./linker"
import { NodeId, NodeManager } from "./node_manager"
import { parse_program, Program } from "./parser2"
import { Relation as R, select } from "./relational"

type Relation = R

type Column = string
type World = Record<Column, Relation>

type WorldId = NodeId

type Continuation = {
    expansion_moves: MoveC[]
    next_world_ids: WorldId[]
}

export class World_Manager {

    world: World
    nodes: NodeManager
    program: Program


    constructor(m: PositionManager, pos: PositionC, program: string) {
        this.nodes = new NodeManager()
        this.world = {}
        this.program = parse_program(program)

        this.Join_position(0, m, pos)
    }

    private select_Moves(world_id: WorldId) {
        return this.nodes.history_moves(world_id)
    }

    continuations(world_id: WorldId) {
        let moves = this.R(world_id, 'moves')
        return moves
    }


    add_Move(m: PositionManager, pos: PositionC, world_id: WorldId, move: MoveC) {
        m.make_move(pos, move)
        let cid = this.nodes.add_move(world_id, move)
        this.Join_position(cid, m, pos)
        m.unmake_move(pos, move)
    }

    Join_position(world_id: WorldId, m: PositionManager, pos: PositionC) {
        let base = join_position(world_id, m, pos)


        this.world = { ...this.world, ...base }
    }

    select_World(id: WorldId, relation: Relation) {
        return select(relation, a => this.nodes.prefix_test(a.get('wid')!, id))
    }

    R(id: WorldId, Column: Column) {
        if (this.world[Column] === undefined) {
            throw new Error('No such column ' + Column)
        }

        return this.select_World(id, this.world[Column])
        /*
        let world = this.select_World(id, this.world[Column])
        let override_key = this.world[Column].override_key

        let res: Relation = { rows: [] }

        let groups = group_by_key(override_key, world)
        
        for (let group of Object.values(groups)) {
            let max_item = group.rows[0]
            let max_depth = this.nodes.depth_of(max_item.get('wid')!)

            for (let row of group.rows) {
                let depth = this.nodes.depth_of(row.get('wid')!)
                if (depth > max_depth) {
                    max_item = row
                    max_depth = depth
                }
            }
            res.rows.push(max_item)
        }

        return res
        */
    }
}

function join_position(world_id: WorldId, m: PositionManager, pos: PositionC) {
    let turn = m.pos_turn(pos)
    let opponent = turn === WHITE ? BLACK : WHITE

    let occupies: Relation = { rows: [] }
    let vacants: Relation = { rows: [] }
    let attacks: Relation = { rows: [] }
    let attacks2: Relation = { rows: [] }
    let moves: Relation = { rows: [] }

    for (let move of m.get_legal_moves(pos)) {
        let { from, to } = move_c_to_Move(move)
        let row = new Map()
        row.set('wid', world_id)
        row.set('move.from', from)
        row.set('move.to', to)
        moves.rows.push(row)
    }


    return {
        attacks,
        moves
    }
}

export function group_by_key(key: number, r: Relation) {

    let res: Record<number, Relation> = {}
    for (let row of r.rows) {
        let key = row.get('o_key')!
        if (!res[key]) {
            res[key] = { rows: [row] }
        } else {
            res[key].rows.push(row)
        }
    }
    return res
}
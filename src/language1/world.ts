import { Position } from "../chess"
import { BLACK, move_c_to_Move, MoveC, PositionC, PositionManager, WHITE } from "../hopefox_c"
import { FEN } from "../mor3_hope1"
import { SquareSet } from "../squareSet"
import { Linked } from "./linker"
import { NodeId, NodeManager } from "./node_manager"
import { Fact, is_matches_between, parse_program, Program } from "./parser2"
import { join, mergeRows, Relation as R, select } from "./relational"

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

        this.Join_world(0, m, pos)
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
        this.Join_world(cid, m, pos)
        m.unmake_move(pos, move)
    }

    Join_world(world_id: WorldId, m: PositionManager, pos: PositionC) {
        let base = join_position(world_id, m, pos)

        this.world = { ...this.world, ...base }

        Join_facts(world_id, this.program.facts, this.world)


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

function Join_facts(world_id: WorldId, facts: Fact[], world: World) {
    for (let fact of facts) {
        join_fact(world_id, fact, world)
    }
}

function join_fact(world_id: WorldId, fact: Fact, world: World) {

    let w = { ...world }

    for (let alias of fact.aliases) {
        w[alias.alias] = w[alias.column]
    }

    let m = fact.matches[0]


    if (is_matches_between(m)) {
        return world
    }

    let [name, rest] = path_split(m.path_a)
    let [name2, rest2] = path_split(m.path_b)

    if (w[name] === undefined || w[name2] === undefined) {
        throw `Bad join: [${name}]x[${name2}] ${Object.keys(w)}`
    }

    let facts_relation = join(w[name], w[name2], (a, b) => {

        let ab_bindings = { [name]: a, [name2]: b }

        let cond = true

        for (let m of fact.matches) {

            if (is_matches_between(m)) {
                continue
            }

            let [name, rest] = path_split(m.path_a)
            let [name2, rest2] = path_split(m.path_b)
            let x = ab_bindings[name].get(rest)
            let y

            if (!rest2) {
                let turn = 0
                y = turn
            } else {
                y = ab_bindings[name2].get(rest2)
            }

            cond ||= m.is_different ? x === y : x !== y
        }

        return cond
            ? (() => {
                const r = new Map()
                for (let ass of fact.assigns) {
                    let [key] = Object.keys(ass)
                    let [r_rel, r_path] = path_split(ass[key])
                    r.set(
                        `${key}`,
                        ab_bindings[r_rel].get(`${r_path}`))
                }

                return r
            })() : null
    })

    world[fact.name] = mergeColumns(world[fact.name] ?? { rows: [] }, facts_relation)
}

type Path = string
function path_split(path: Path) {
    let [name, ...rest] = path.split('.')
    return [name, rest.join('.')]
}

function join_position(world_id: WorldId, m: PositionManager, pos: PositionC) {
    let turn = m.pos_turn(pos)
    let opponent = turn === WHITE ? BLACK : WHITE

    let occupies: Relation = { rows: [] }
    let vacants: Relation = { rows: [] }
    let attacks: Relation = { rows: [] }
    let attacks2: Relation = { rows: [] }
    let moves: Relation = { rows: [] }

    for (let on of SquareSet.full()) {
        let piece = m.get_at(pos, on)

        if (!piece) {
            let vacant = new Map()
            vacant.set('wid', world_id)
            vacant.set('square', on)
            vacants.rows.push(vacant)
        } else {
            let occupy = new Map()
            occupy.set('wid', world_id)
            occupy.set('square', on)
            occupy.set('piece', piece)
            occupy.set('color', turn)
            occupies.rows.push(occupy)
        } 


    }

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
        occupies,
        vacants,
        attacks2,
        moves
    }
}

export function mergeColumns(a: Relation, b: Relation) {

    return { rows: { ...a.rows, ...b.rows } }
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
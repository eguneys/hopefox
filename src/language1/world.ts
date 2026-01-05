import { between } from "../attacks"
import { Position } from "../chess"
import { BLACK, KING, make_move_from_to, move_c_to_Move, MoveC, PositionC, PositionManager, WHITE } from "../hopefox_c"
import { FEN } from "../mor3_hope1"
import { SquareSet } from "../squareSet"
import { Linked } from "./linker"
import { NodeId, NodeManager } from "./node_manager"
import { Alias, Fact, Idea, is_matches_between, parse_program, Program } from "./parser2"
import { join, mergeRows, Relation as R, select } from "./relational"
import { san_moves, san_moves_c } from "./san_moves_helper"

type Relation = R

type Column = string
type World = Record<Column, Relation>

type WorldId = NodeId

type Continuation = {
    expansion_moves: MoveC[]
    next_world_ids: WorldId[]
}

//let base_pos: Position

export class World_Manager {

    world: World
    nodes: NodeManager
    program: Program

    constructor(m: PositionManager, pos: PositionC, program: string) {
        this.nodes = new NodeManager()
        this.world = {}
        this.program = parse_program(program)

        //base_pos = m.get_pos_read_fen(pos)
        this.Join_world(0, m, pos, false)
    }

    continuations(world_id: WorldId, column: Column) {

        let moves = extract_moves(this.R(world_id, column))
        return moves.map(_ => [_])
    }

    get_Column(world_id: WorldId, column: Column) {
        return this.R(world_id, column)
    }

    Join_world(world_id: WorldId, m: PositionManager, pos: PositionC, break_ideas: boolean) {

        let base = join_position(world_id, m, pos)

        base = merge_worlds(base, join_position(world_id, m, pos))

        for (let fact of this.program.facts) {
            join_fact(world_id, fact, base)
        }

        for (let legal of this.program.legals) {
            join_legal(world_id, legal, base)
        }

        if (break_ideas) {
            this.world = merge_worlds(this.world, base)
            return
        }

        for (let idea of this.program.ideas) {

            this.world = merge_worlds(this.world, base)
            this.Materialize_moves_Until_lines_Exists(m, pos, world_id, fix_alias(idea.line, idea.aliases))
            base = this.world

            this.join_idea(world_id, idea, base)
        }

        this.world = base
    }

    Materialize_moves_Until_lines_Exists(m: PositionManager, pos: PositionC, world_id: WorldId, line: string[]) {

        let self = this
        function deeper(cid: WorldId, i: number) {

            let moves2 = extract_moves(self.R(cid, line[i]))

            moves2.forEach(move => {
                m.make_move(pos, move)
                let cid2 = self.nodes.add_move(cid, move)

                self.Join_world(cid2, m, pos, true)

                if (i + 1 < line.length) {
                    deeper(cid2, i + 1)
                }

                m.unmake_move(pos, move)
            })
        }

        deeper(world_id, 0)

    }

    select_World(id: WorldId, relation: Relation) {
        return select(relation, a => a.get('wid')! === id)
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

    is_a_successor_of_b(a: WorldId, b: WorldId) {
        return this.nodes.is_a_successor_of_b(a, b)
    }

    join_idea(world_id: WorldId, idea: Idea, world: World) {

        let w = { ...world }

        for (let alias of idea.aliases) {
            w[alias.alias] = w[alias.column]
        }

        let _: Relation = { rows: [] }

        for (let m of idea.matches) {

            if (is_matches_between(m)) {
                return world
            }

            let [name, rest] = path_split(m.path_a)
            let [name2, rest2] = path_split(m.path_b)

            if (idea.line.indexOf(name) > idea.line.indexOf(name2)) {
                ;[name, name2] = [name2, name]
            }

            if (name2 === 'KING') {
                _ = select(w[name], a => a.get(rest) === KING)
            } else {

                let w_name, w_name2

                if (name === '_') {
                    w_name = _
                } else if (name2 === '_') {
                    w_name2 = _
                } else {
                    if (w[name] === undefined || w[name2] === undefined) {
                        throw `Bad join: [${name}]x[${name2}] ${Object.keys(w)}`
                    }

                }

                w_name ??= select(w[name], _ => world_id === _.get('wid')!)
                w_name2 ??= select(w[name2], _ => this.is_a_successor_of_b(_.get('wid')!, world_id))

                if (w_name.rows.length + w_name2.rows.length > 100000) {
                    throw `Join too big: [${name}]x[${name2}] ${Object.keys(w)}`
                }

                _ = join(w_name, w_name2, (a, b) => {

                    let ab_bindings = { [name]: a, [name2]: b }

                    let cond = true

                    let x = ab_bindings[name].get(rest)
                    let y

                    if (!rest2) {
                        let turn = 0
                        y = turn
                    } else {
                        y = ab_bindings[name2].get(rest2)
                    }

                    cond &&= m.is_different ? x !== y : x === y

                    return cond
                        ? (() => {
                            const r = new Map()
                            r.set('wid', world_id)
                            for (let ass of idea.assigns) {
                                let [key] = Object.keys(ass)
                                let [r_rel, r_path] = path_split(ass[key])
                                if (ab_bindings[r_rel] === undefined) {
                                    if (ab_bindings['_']) {
                                        r.set(
                                            `${key}`,
                                            ab_bindings['_'].get(`${r_path}`))
                                    }
                                    continue
                                }
                                r.set(
                                    `${key}`,
                                    ab_bindings[r_rel].get(`${r_path}`))
                            }

                            return r
                        })() : null
                })
            }
    }

        world[idea.name] = mergeColumns(world[idea.name] ?? { rows: [] }, _)
    }
}


function fix_alias(line: string[], aliases: Alias[]) {
    return line.map(line => aliases.find(_ => _.alias === line)?.column ?? line)
}

function extract_moves(moves: Relation) {

    let res: MoveC[] = []
    for (let row of moves.rows) {
        res.push(make_move_from_to(row.get('from')!, row.get('to')!))
    }
    // todo fix
    res = [...new Set(res)]
    return res
}

function join_legal(world_id: WorldId, legal: string, world: World) {

    let w = {...world}

    let name = legal.replace('_moves', '')
    let name2 = 'moves'

    let w_name = select(w[name], _ => world_id === _.get('wid')!)
    let w_name2 = select(w[name2], _ => world_id === _.get('wid')!)

    let relation = join(w_name, w_name2, (a, b) => {

        let ab_bindings = { [name]: a, [name2]: b }

        let cond = ab_bindings[name].get('from') === ab_bindings[name2].get('from')
            && ab_bindings[name].get('to') === ab_bindings[name2].get('to')

        return cond
            ? (() => {
                const r = new Map()
                r.set('wid', world_id)
                for (let [key, value] of ab_bindings[name]) {
                    r.set(key, value)
                }
                return r
            })() : null
    })
    world[legal] = mergeColumns(w[legal] ?? { rows: [] }, relation)
}

function join_fact(world_id: WorldId, fact: Fact, world: World) {

    let w = { ...world }

    for (let alias of fact.aliases) {
        w[alias.alias] = w[alias.column]
    }

    let m = fact.matches[0]


    if (is_matches_between(m)) {
        join_between(world_id, fact, world)
        return
    }

    let facts_relation: Relation = { rows: [] }

    let [name, rest] = path_split(m.path_a)
    let [name2, rest2] = path_split(m.path_b)


    if (name2 === 'KING') {
        facts_relation = select(w[name], a => a.get(rest) === KING)
    } else {
        if (w[name] === undefined || w[name2] === undefined) {
            throw `Bad join: [${name}]x[${name2}] ${Object.keys(w)}`
        }
        let w_name = select(w[name], _ => world_id === _.get('wid')!)
        let w_name2 = select(w[name2], _ => world_id === _.get('wid')!)

        if (w_name.rows.length + w_name2.rows.length > 100000) {
            throw `Join too big: [${name}]x[${name2}] ${Object.keys(w)}`
        }

        facts_relation = join(w_name, w_name2, (a, b) => {

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

                cond &&= m.is_different ? x !== y : x === y
            }

            return cond
                ? (() => {
                    const r = new Map()
                    r.set('wid', world_id)
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
    }

    world[fact.name] = mergeColumns(w[fact.name] ?? { rows: [] }, facts_relation)
}



function join_between(world_id: WorldId, fact: Fact, world: World) {

    let w = { ...world }

    for (let alias of fact.aliases) {
        w[alias.alias] = w[alias.column]
    }

    let m = fact.matches[0]

    if (!is_matches_between(m)) {
        return
    }

    let facts_relation: Relation = { rows: [] }

    let [name, rest] = path_split(m.path_a)
    let [name2, rest2] = path_split(m.path_b)
    let [name3, rest3] = path_split(m.path_c)


    if (w[name] === undefined || w[name2] === undefined) {
        throw `Bad join: [${name}]x[${name2}] ${Object.keys(w)}`
    }

    let w_name = select(w[name], _ => world_id === _.get('wid')!)
    let w_name2 = select(w[name2], _ => world_id === _.get('wid')!)

    if (w_name.rows.length + w_name2.rows.length > 100000) {
        throw `Join too big: [${name}]x[${name2}] ${Object.keys(w)}`
    }

    facts_relation = join(w_name, w_name2, (a, b) => {

        let ab_bindings = { [name]: a, [name2]: b }

        let cond = true

        for (let m of fact.matches) {

            if (!is_matches_between(m)) {
                continue
            }

            let [name, rest] = path_split(m.path_a)
            let [name2, rest2] = path_split(m.path_b)
            let [name3, rest3] = path_split(m.path_c)

            let x = ab_bindings[name].get(rest)!
            let y = ab_bindings[name2].get(rest2)!
            let z = ab_bindings[name3].get(rest3)!

            cond &&= between(y, z).has(x)
        }

        return cond
            ? (() => {
                const r = new Map()
                r.set('wid', world_id)
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

    world[fact.name] = mergeColumns(w[fact.name] ?? { rows: [] }, facts_relation)
}

type Path = string
function path_split(path: Path) {
    let [name, ...rest] = path.split('.')
    return [name, rest.join('.')]
}

function join_position(world_id: WorldId, m: PositionManager, pos: PositionC): World {
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

        if (piece) {
            let aa = m.attacks(piece, on, m.pos_occupied(pos))

            for (let a of aa) {
                let attack = new Map()
                attack.set('wid', world_id)
                attack.set('from', on)
                attack.set('piece', piece)
                attack.set('color', turn)
                attack.set('to', a)
                attacks.rows.push(attack)


                let aa2 = m.attacks(piece, a, m.pos_occupied(pos).without(on))

                for (let a2 of aa2) {
                    let attack2 = new Map()
                    attack2.set('wid', world_id)
                    attack2.set('from', on)
                    attack2.set('piece', piece)
                    attack2.set('color', turn)
                    attack2.set('to', a)
                    attack2.set('to2', a2)
                    attacks2.rows.push(attack2)
                }

            }
        }

    }

    for (let move of m.get_legal_moves(pos)) {
        let { from, to } = move_c_to_Move(move)
        let row = new Map()
        row.set('wid', world_id)
        row.set('from', from)
        row.set('to', to)
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

export function merge_worlds(a: World, b: World) {
    let res: World = {}
    for (let key of Object.keys(b)) {
        if (a[key] === undefined) {
            res[key] = b[key]
        } else {
            res[key] = mergeColumns(a[key], b[key])
        }
    }
    return res
}

export function mergeColumns(a: Relation, b: Relation) {

    return { rows: [ ...a.rows, ...b.rows ] }
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
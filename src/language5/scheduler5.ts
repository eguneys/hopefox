import { between } from "../distill/attacks"
import { ColorC, make_move_from_to, move_c_to_Move, MoveC, piece_c_color_of, piece_c_type_of, PieceTypeC, PositionC, PositionManager } from "../distill/hopefox_c"
import { SquareSet } from "../distill/squareSet"
import { Square } from "../distill/types"
import { NodeId, NodeManager } from "../language1/node_manager"
import { san_moves_c } from "../language2/san_moves_helper"
import { parse_defs6 } from "./parser5"
import { concat, join, mergeRows, Relation, RelationManager, select, semiJoin } from "./relation_manager"

enum MaterializeState {
    Materializing,
    Complete
}

type Column = string

export class Rs {

    nodes: NodeManager
    m: PositionManager
    pos: PositionC

    relations: Map<Column, StatefulRelationManager>

    constructor(m: PositionManager, pos: PositionC) {
        this.m = m
        this.pos = pos
        this.nodes = new NodeManager()

        this.set_relation('legals', materialize_legals)
        this.set_relation('attacks', materialize_legals)
        this.set_relation('occupies', materialize_legals)
    }

    set_relation(column: Column, fn: MaterializeFn) {
        this.relations.set(column, new StatefulRelationManager(this, fn))
    }

    relation(column: Column) {
        return this.relations.get(column)!
    }

    run() {
        let there_is_more
        do  {
            for (let R of this.relations) {
                there_is_more = R[1].step() || there_is_more
            }
        } while (there_is_more)
    }

    make_moves_to_world(world_id: WorldId) {
        let history = this.nodes.history_moves(world_id)
        for (let move of history) {
            this.m.make_move(this.pos, move)
        }
    }

    unmake_moves_to_base(world_id: WorldId) {
        let history = this.nodes.history_moves(world_id)
        for (let i = history.length - 1; i >= 0; i--) {
            let move = history[i]
            this.m.unmake_move(this.pos, move)
        }
    }
}

type MaterializeFn = (world_id: WorldId, r: Rs) => boolean
export type WorldId = NodeId

export class StatefulRelationManager {
    public states: Map<WorldId, MaterializeState>
    public relation: RelationManager

    private fn: MaterializeFn
    private Rs: Rs

    private nb_used: number

    constructor(Rs: Rs, fn: MaterializeFn) {
        this.relation = new RelationManager()
        this.states = new Map()
        this.fn = fn
        this.Rs = Rs

        this.nb_used = 0
    }

    get(world_id: WorldId) {
        let state = this.states.get(world_id)
        if (state === MaterializeState.Complete) {
            this.nb_used++
            return this.relation.get_relation_starting_at_world_id(world_id)
        }
        if (state === undefined) {
            this.states.set(world_id, MaterializeState.Materializing)
        }
    }

    step() {
        let there_is_more = false

        for (let [world_id, state] of this.states) {
            if (state === MaterializeState.Materializing) {
                let complete = this.fn(world_id, this.Rs)
                if (complete) {
                    this.states.set(world_id, MaterializeState.Complete)
                } else {
                    there_is_more = true
                }
            }
        }
        return there_is_more
    }
}

function materialize_legals(world_id: WorldId, Rs: Rs): boolean {
    Rs.make_moves_to_world(world_id)

    for (let move of Rs.m.get_legal_moves(Rs.pos)) {
        let { from, to } = move_c_to_Move(move)
        let end_world_id = Rs.nodes.add_move(world_id, move)
        Rs.relation('legals').relation.add_row(new Map([
            ['start_world_id', world_id],
            ['end_world_id', end_world_id],
            ['from', from],
            ['to', to]
        ]))
    }

    Rs.unmake_moves_to_base(world_id)
    return true
}

const FullSquares = SquareSet.full()
function materialize_attacks(world_id: WorldId, Rs: Rs): boolean {
    Rs.make_moves_to_world(world_id)

    let end_world_id = world_id
    for (let on of FullSquares) {
        let piece = Rs.m.get_at(Rs.pos, on)
        if (piece) {
            let aa = Rs.m.pos_attacks(Rs.pos, on)
            for (let a of aa) {
                Rs.relation('attacks').relation.add_row(new Map([
                    ['start_world_id', world_id],
                    ['end_world_id', end_world_id],
                    ['from', on],
                    ['to', a]
                ]))
            }
        }
    }

    Rs.unmake_moves_to_base(world_id)
    return true
}

function materialize_occupies(world_id: WorldId, Rs: Rs): boolean {
    Rs.make_moves_to_world(world_id)

    let end_world_id = world_id
    for (let on of FullSquares) {
        let piece = Rs.m.get_at(Rs.pos, on)
        if (piece) {
            Rs.relation('occupies').relation.add_row(new Map([
                ['start_world_id', world_id],
                ['end_world_id', end_world_id],
                ['on', on],
                ['piece', piece_c_type_of(piece)],
                ['color', piece_c_color_of(piece)]
            ]))
        }
    }

    Rs.unmake_moves_to_base(world_id)
    return true
}



export function extract_moves(relation: Relation) {
    return relation.rows.map(_ => make_move_from_to(_.get('from')!, _.get('to')!))
}

export function extract_sans(m: PositionManager, pos: PositionC, relation: Relation) {
    return extract_moves(relation).map(_ => san_moves_c(m, pos, [_]))
}


export function Search(m: PositionManager, pos: PositionC, rules: string) {
    let p = parse_defs6(rules)
    return p
}
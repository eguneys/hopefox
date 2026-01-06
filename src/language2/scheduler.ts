import { move_c_to_Move, piece_c_color_of, piece_c_to_piece, piece_c_type_of, PositionC, PositionManager } from "../hopefox_c"
import { NodeId, NodeManager } from "../language1/node_manager"
import { Alias, Idea } from "../language1/parser2"
import { Relation, Row } from "../language1/relational"
import { SquareSet } from "../squareSet"


enum FactLifecycleState {
    UNREQUESTED,
    REQUESTED,
    MATERIALIZING,
    COMPLETE
}

type WorldId = NodeId

type Column = string

type Fact = {
    key: FactKey
    column: Column
    world_id: WorldId
    state: FactLifecycleState
}

type FactKey = number

function hash_fact_key(column: Column, world_id: WorldId) {
    return 0
}

function make_fact_with_key(column: Column, world_id: WorldId) {
    let key = hash_fact_key(column, world_id)

    return {
        key,
        column,
        world_id,
        state: FactLifecycleState.UNREQUESTED
    }
}

class Scheduler {

    active_ideas: Set<IdeaJoin>
    pending_prefixes: Map<FactKey, Set<Prefix>>

    facts: Map<FactKey, Fact>
    fact_queue: Fact[]

    materializer: Materialize_Manager

    constructor(m: PositionManager, pos: PositionC) {
        this.active_ideas = new Set()
        this.pending_prefixes = new Map()
        this.facts = new Map()
        this.fact_queue = []
        this.materializer = new Materialize_Manager(m, pos)
    }


    suspend_prefix_to_request_facts(prefix: Prefix, fact_key: FactKey) {
        let list = this.pending_prefixes.get(fact_key)
        if (!list) {
            this.pending_prefixes.set(fact_key, new Set([prefix]))
        } else {
            list.add(prefix)
        }
    }

    resume_waiting_prefixes(fact: Fact) {
        const waiting = this.pending_prefixes.get(fact.key)
        if (!waiting) {
            return
        }

        for (const prefix of waiting) {
            prefix.owner.worklist.push(prefix)
        }

        this.pending_prefixes.delete(fact.key)
    }

    is_facts_joined(key: FactKey) {
        const fact = this.facts.get(key)
        return fact?.state === FactLifecycleState.COMPLETE
    }

    request_idea(idea_spec: Idea, world_id: WorldId) {

        const idea = new IdeaJoin(
            idea_spec,
            world_id,
            this
        )
    }

    request_fact(column: Column, world_id: WorldId) {
        let key = hash_fact_key(column, world_id)
        let fact = this.facts.get(key)
        if (!fact) {
            fact = make_fact_with_key(column, world_id)
            this.facts.set(key, fact)
            this.fact_queue.push(fact)
        }
    }

    run() {
        while (this.fact_queue.length > 0 || this.active_ideas.size > 0) {

            if (this.fact_queue.length > 0) {
                let fact = this.fact_queue.shift()!
                if (fact.state === FactLifecycleState.UNREQUESTED) {
                    fact.state = FactLifecycleState.MATERIALIZING

                    this.materializer.materialize_fact(fact)
                    fact.state = FactLifecycleState.COMPLETE
                    this.resume_waiting_prefixes(fact)
                }
            }


            for (const idea of this.active_ideas) {
                idea.step()
            }
        }
    }

}

type RowId = number

class RelationManager {
    base: Relation
    name: string
    index_start_world: Map<WorldId, RowId[]> = new Map()

    add_rows(world_id: WorldId, rows: Row[]) {
        for (const row of rows) {
            const row_id = this.add_rows.length
            this.base.rows.push(row)

            if (!this.index_start_world.has(world_id)) {
                this.index_start_world.set(world_id, [])
            }
            this.index_start_world.get(world_id)!.push(row_id)
        }
    }

    add_row(row: Row) {
        let row_id = this.base.rows.length
        this.base.rows.push(row)

        const w = row.get('start_world_id')!
        if (w !== undefined) {
            let list = this.index_start_world.get(w)
            if (!list) {
                this.index_start_world.set(w, [row_id])
            } else {
                list.push(row_id)
            }
        }
    }

    get_row_ids_starting_at_world_id(world_id: WorldId): RowId[] {
        return this.index_start_world.get(world_id) ?? []
    }
    get_row(row_id: RowId) {
        return this.base.rows[row_id]
    }
}

// M is a move-fact relation
// line M c1 c2 c3
// A prefix is a partially matched line.
type Prefix = {
    owner: IdeaJoin
    length: number
    bindings: RowId[]
}


function prefix_required_last_world_id(M: RelationManager, prefix: Prefix, initial_world: WorldId): WorldId {
    if (prefix.length === 0) {
        return initial_world
    }
    const last_row = M.get_row(prefix.bindings[prefix.length - 1])
    return last_row.get('end_world_id')!
}

function extend_prefix(prefix: Prefix, row_id: RowId, owner: IdeaJoin): Prefix {
    return {
        owner,
        length: prefix.length + 1,
        bindings: [...prefix.bindings, row_id]
    }
}


class IdeaJoin {

    scheduler: Scheduler
    worklist: Prefix[]
    initial_world_id: WorldId

    line: string[]

    Ms: RelationManager[]

    constructor(spec: Idea, world_id: WorldId, scheduler: Scheduler) {

        this.line = spec.line
        this.scheduler = scheduler
        this.initial_world_id = world_id

        this.worklist = [{ owner: this, length: 0, bindings: [] }]
    }


    get_row(step_index: number, row_id: RowId) {
        return this.Ms[step_index].get_row(row_id)
    }

    insert_line_into_relation(prefix: Prefix) {

        const row = new Map()

        const first = this.get_row(0, prefix.bindings[0])
        const last = this.get_row(prefix.length - 1, prefix.bindings[prefix.length - 1])

        row.set('start_world_id', first.get('start_world_id'))
        row.set('end_world_id', last.get('end_world_id'))


        for (let i = 0; i < prefix.bindings.length; i++) {
            const r = this.get_row(i, prefix.bindings[i])
            row.set(`from${i+1}`, r.get('from'))
            row.set(`to${i+1}`, r.get('to'))
        }

        // output.emit(row)
    }

    step() {

        if (this.worklist.length === 0) {
            this.scheduler.active_ideas.delete(this)
            return
        }

        let prefix = this.worklist.pop()!

        if (prefix.length === this.line.length) {
            this.insert_line_into_relation(prefix)
            return
        }

        const stepIndex = prefix.length
        let M = this.Ms[stepIndex]

        let next_world_id = prefix_required_last_world_id(M, prefix, this.initial_world_id)

        let needs_fact_key = hash_fact_key(M.name, next_world_id)

        if (!this.scheduler.is_facts_joined(needs_fact_key)) {
            this.scheduler.suspend_prefix_to_request_facts(prefix, needs_fact_key)
            this.scheduler.request_fact(M.name, next_world_id)
            return
        }

        
        for (let row_id of M.get_row_ids_starting_at_world_id(next_world_id)) {
            let new_prefix = extend_prefix(prefix, row_id, this)

            if (this.constraints_hold(new_prefix)) {
                this.worklist.push(new_prefix)
            }
        }
    }


    constraints_hold(prefix: Prefix) {
        return false
    }
}

class Materialize_Manager {

    nodes: NodeManager
    m: PositionManager
    pos: PositionC

    Rms: Map<string, RelationManager>

    constructor(m: PositionManager, pos: PositionC) {

        this.m = m
        this.pos = pos

        this.nodes = new NodeManager()
        this.Rms = new Map()
    }

    add_row(column: Column, row: Row) {
        let rm = this.Rms.get(column)
        if (!rm) {
            rm = new RelationManager()
            this.Rms.set(column, rm)
        }
        rm.add_row(row)
    }

    materialize_fact(fact: Fact) {
        this.make_moves_to_world(fact.world_id)

        switch (fact.column) {
            case 'occupies':
                this.materialize_occupies(fact.world_id)
                break
            case 'moves':
                this.materialize_moves(fact.world_id)
                break
            case 'attacks':
                this.materialize_attacks(fact.world_id)
                break
            case 'attacks2':
                this.materialize_attacks2(fact.world_id)
                break
        }

        this.unmake_moves_to_base(fact.world_id)
    }


    materialize_attacks2(world_id: WorldId) {

        for (let on of SquareSet.full()) {
            let piece = this.m.get_at(this.pos, on)

            if (piece) {

                let aa = this.m.attacks(piece, on, this.m.pos_occupied(this.pos))

                for (let a of aa) {

                    let aa2 = this.m.attacks(piece, a, this.m.pos_occupied(this.pos).without(on))

                    for (let a2 of aa2) {
                        this.add_row('attacks2', new Map([
                            ['start_world_id', world_id],
                            ['from', on],
                            ['to', a],
                            ['to2', a2],
                            ['piece', piece_c_type_of(piece)],
                            ['color', piece_c_color_of(piece)]
                        ]))
                    }
                }
            }
        }
    }

    materialize_attacks(world_id: WorldId) {

        for (let on of SquareSet.full()) {
            let piece = this.m.get_at(this.pos, on)

            if (piece) {

                let aa = this.m.attacks(piece, on, this.m.pos_occupied(this.pos))

                for (let a of aa) {
                    this.add_row('attacks', new Map([
                        ['start_world_id', world_id],
                        ['from', on],
                        ['to', a],
                        ['piece', piece_c_type_of(piece)],
                        ['color', piece_c_color_of(piece)]
                    ]))
                }



            }
        }
    }

    materialize_vacants(world_id: WorldId) {
        for (let on of SquareSet.full()) {
            let piece = this.m.get_at(this.pos, on)

            if (!piece) {
                this.add_row('vacants', new Map([
                    ['start_world_id', world_id],
                    ['square', on]

                ]))
            }
        }
    }

    materialize_occupies(world_id: WorldId) {

        for (let on of SquareSet.full()) {
            let piece = this.m.get_at(this.pos, on)

            if (piece) {
                this.add_row('occupies', new Map([
                    ['start_world_id', world_id],
                    ['square', on],
                    ['piece', piece_c_type_of(piece)],
                    ['color', piece_c_color_of(piece)]
                ]))
            }
        }
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
            this.m.make_move(this.pos, move)
        }
    }

    materialize_moves(world_id: WorldId) {
        let legal_moves = this.m.get_legal_moves(this.pos)

        for (const move of legal_moves) {
            const next_world_id = this.nodes.add_move(world_id, move)

            let { from, to } = move_c_to_Move(move)

            this.add_row('moves', new Map([
                ['from', from],
                ['to', to],
                ['start_world_id', world_id],
                ['end_world_id', next_world_id],
            ]))

        }
    }
}

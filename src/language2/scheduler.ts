import { NodeId } from "../language1/node_manager"
import { Alias, Idea } from "../language1/parser2"
import { Relation, Row } from "../language1/relational"


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

    pending_fact_join_requests: Fact[] = []
    pending_idea_join_requests: IdeaJoin[] = []
    pending_prefixes: Map<FactKey, Set<Prefix>> = new Map()

    constructor() {

    }


    suspend_prefix_to_request_facts(prefix: Prefix, fact_key: FactKey) {
        let list = this.pending_prefixes.get(fact_key)
        if (!list) {
            this.pending_prefixes.set(fact_key, new Set([prefix]))
        } else {
            list.add(prefix)
        }
    }

    resume_waiting_prefixes(idea: IdeaJoin) {
        for (let prefix of this.pending_prefixes.get(idea.fact.key) ?? []) {
            idea.worklist.push(prefix)
        }
        this.pending_prefixes.delete(idea.fact.key)
        idea.run()
    }

    // TODO requesting the same key twice is safe
    request_fact(column: Column, world_id: WorldId) {
        this.pending_fact_join_requests.push(make_fact_with_key(column, world_id))
    }

    is_facts_joined(key: FactKey) {
        return false
    }

    run() {
        let any_queue_non_empty = true
        while (any_queue_non_empty) {

            if (this.pending_fact_join_requests.length > 0) {
                let key = this.pending_fact_join_requests.shift()!
                if (key.state === FactLifecycleState.UNREQUESTED) {
                    key.state = FactLifecycleState.REQUESTED
                }
            }

            let requested = this.pending_fact_join_requests.find(_ => _.state === FactLifecycleState.REQUESTED)
            if (requested) {
                requested.state = FactLifecycleState.MATERIALIZING
                let job = new IdeaJoin(requested)
                this.pending_idea_join_requests.push(job)
            }

            let finished = this.pending_idea_join_requests.find(_ => _.fact.state === FactLifecycleState.COMPLETE)
            if (finished) {
                this.resume_waiting_prefixes(finished)
            }

            any_queue_non_empty = 
                this.pending_fact_join_requests.length > 0 ||
                this.pending_idea_join_requests.length > 0
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

function extend_prefix(prefix: Prefix, row_id: RowId): Prefix {
    return {
        length: prefix.length + 1,
        bindings: [...prefix.bindings, row_id]
    }
}


class IdeaJoin {

    scheduler: Scheduler
    worklist: Prefix[] = [{ length: 0, bindings: [] }]
    line: string[]

    fact: Fact

    M: RelationManager

    initial_world_id: WorldId

    constructor(fact: Fact) {
        this.fact = fact
    }

    get_row(row_id: RowId) {
        return this.M.get_row(row_id)
    }

    insert_line_into_relation(prefix: Prefix) {

        const row = new Map()

        const first = this.get_row(prefix.bindings[0])
        const last = this.get_row(prefix.bindings[prefix.length - 1])

        row.set('start_world_id', first.get('start_world_id'))
        row.set('end_world_id', last.get('end_world_id'))


        for (let i = 0; i < prefix.bindings.length; i++) {
            const r = this.get_row(prefix.bindings[i])
            row.set(`from${i+1}`, r.get('from'))
            row.set(`to${i+1}`, r.get('to'))
        }

        // output.emit(row)
    }

    run() {

        while (this.worklist.length > 0) {
            let prefix = this.worklist.pop()!

            if (prefix.length === this.line.length) {
                this.insert_line_into_relation(prefix)
                continue
            }

            let next_world_id = prefix_required_last_world_id(this.M, prefix, this.initial_world_id)

            let needs_fact_key = hash_fact_key(this.M.name, next_world_id)
            if (!this.scheduler.is_facts_joined(needs_fact_key)) {
                this.scheduler.suspend_prefix_to_request_facts(prefix, needs_fact_key)
                continue
            }

            let [start_row_id, end_row_id] = this.M.get_row_ids_starting_at_world_id(next_world_id)
            for (let row_id = start_row_id; row_id < end_row_id; row_id++) {
                let new_prefix = extend_prefix(prefix, row_id)

                if (this.constraints_hold(new_prefix)) {
                    this.worklist.push(new_prefix)
                }
            }
        }
    }


    constraints_hold(prefix: Prefix) {
        return false
    }
}
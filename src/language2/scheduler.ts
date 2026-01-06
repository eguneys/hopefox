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
        // how do we get fact key from a prefix ??
        let list = this.pending_prefixes.get(fact_key)
        if (!list) {
            this.pending_prefixes.set(fact_key, new Set(prefix))
        } else {
            list.add(prefix)
        }
    }

    resume_waiting_prefixes(idea: IdeaJoin) {
        for (let prefix of this.pending_prefixes.get(idea.fact.key) ?? []) {
            idea.worklist.push(prefix)
        }
        this.pending_prefixes.delete(idea.fact.key)
        idea.active_evaluation_loop()
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

                // run materialization(key) ?? 
                let job = new IdeaJoin(requested)
                this.pending_idea_join_requests.push(job)
            }

            // materialization finished ?? 
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

// M is a move-fact relation
// line M c1 c2 c3
// A prefix is a partially matched line.
type Prefix = {
    length: number
    waiting_on: Fact
    bindings: Map<string, Row>
}

class IdeaJoin {

    scheduler: Scheduler
    worklist: Prefix[]
    line: string[]

    fact: Fact

    M: Column

    constructor(fact: Fact) {
        this.fact = fact
    }

    active_evaluation_loop() {

        while (this.worklist.length > 0) {
            let prefix = this.worklist.pop()!

            if (prefix.length === this.line.length) {
                // emit result row ??
                let row = prefix.idea_result_row // ?? 
                this.scheduler.insert_into_relation(this.M, row) // ??
                continue
            }

            // ??
            let prefix_last_world_id = prefix.last.end_world_id

            let needs_fact_key = hash_fact_key(this.M, prefix_last_world_id)
            if (!this.scheduler.is_facts_joined(needs_fact_key)) {
                this.scheduler.suspend_prefix_to_request_facts(prefix, needs_fact_key)
                continue
            }


            for (let row of this.M.rows) {
                if (row.get('start_world_id') !== prefix_last_world_id) {
                    continue
                }

                let new_prefix = extend_prefix(prefix, row)

                if (this.constraints_hold(new_prefix)) {
                    this.worklist.push(new_prefix)
                }
            }
        }
    }
}
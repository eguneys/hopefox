import { between } from "../distill/attacks"
import { squareSet } from "../distill/debug"
import { BISHOP, KING, KNIGHT, move_c_to_Move, PAWN, piece_c_color_of, piece_c_to_piece, piece_c_type_of, PositionC, PositionManager, QUEEN, ROOK } from "../distill/hopefox_c"
import { NodeId, NodeManager } from "../language1/node_manager"
import { Alias, Fact as FactAlias, Idea, is_constant, is_matches_between, parse_program, Program } from "../language1/parser2"
import { join, Relation, Row, select } from "./relational"
import { extract_lines } from "./extract"
import { SquareSet } from "../distill/squareSet"

class NoSuchColumn extends Error {
    constructor(name: Column) {
        super(`No such column ${name}.`)
    }
}

class NoEndWorldIdError extends Error {
    constructor(name: Column) {
        super(`No end world id ${name}.`)
    }
}

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


const generateHash = (s: string) => {
  let hash = 0;
  for (const char of s) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0; // Constrain to 32bit integer
  }
  return hash;
};

function hash_fact_key(column: Column, world_id: WorldId) {
    let res = generateHash(column) + world_id
    return generateHash(column) + world_id
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
    private pending_prefixes: Map<FactKey, Set<Prefix>>

    private facts: Map<FactKey, Fact>
    private fact_queue: Fact[]

    active_fact_joins: Set<FactJoin>
    private pending_fact_joins: Map<FactKey, Set<FactJoin>>

    private program: Program

    private m: PositionManager
    private pos: PositionC

    nodes: NodeManager

    constructor(m: PositionManager, pos: PositionC, rules: string) {

        this.nodes = new NodeManager()

        this.m = m
        this.pos = pos

        this.active_ideas = new Set()
        this.pending_prefixes = new Map()
        this.facts = new Map()
        this.fact_queue = []

        this.active_fact_joins = new Set()
        this.pending_fact_joins = new Map()

        this.program = parse_program(rules)

        this.RMs = new Map()
    }

    RMs: Map<Column, RelationManager>

    get_continuations(column: Column) {
        let rs = this.RMs.get(column)
        if (!rs) {
            throw new NoSuchColumn(column)
        }
        return extract_lines(rs.get_relation_starting_at_world_id(0))
    }

    get_or_create_M(column: Column) {
        if (!this.RMs.has(column)) {
            this.RMs.set(column, new RelationManager(column))
        }
        return this.RMs.get(column)!
    }

    suspend_prefix_to_request_facts(prefix: Prefix, fact_key: FactKey) {
        let list = this.pending_prefixes.get(fact_key)
        if (!list) {
            this.pending_prefixes.set(fact_key, new Set([prefix]))
        } else {
            list.add(prefix)
        }
    }

    resume_waiting_prefixes(fact_key: FactKey) {
        const waiting = this.pending_prefixes.get(fact_key)
        if (!waiting) {
            return
        }

        for (const prefix of waiting) {
            prefix.owner.worklist.push(prefix)
            this.active_ideas.add(prefix.owner)
            prefix.owner.notify_resume_idea()
        }

        this.pending_prefixes.delete(fact_key)
    }

    resume_waiting_facts(fact: Fact) {

        let waiting = this.pending_fact_joins.get(fact.key)
        if (!waiting) {
            return
        }
        for (const fact_join of waiting) {
            fact_join.dependencies.set(fact.key, fact_join)
        }
        this.pending_fact_joins.delete(fact.key)
    }

    complete_fact(fact: Fact) {
        fact.state = FactLifecycleState.COMPLETE
        this.resume_waiting_facts(fact)
        this.resume_waiting_prefixes(fact.key)
    }

    complete_idea(idea: IdeaJoin) {
        this.active_ideas.delete(idea)
        this.complete_fact(idea.fact)
    }

    is_facts_joined(key: FactKey) {
        const fact = this.facts.get(key)
        return fact?.state === FactLifecycleState.COMPLETE
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

    request_fact_join(fact: Fact) {
        let existing = this.facts.get(fact.key)
        if (existing && existing.state === FactLifecycleState.MATERIALIZING) {
            return
        }
        fact.state = FactLifecycleState.MATERIALIZING
        let fact_join = new FactJoin(fact, this.m, this.pos, this.program, this)

        this.facts.set(fact.key, fact)
        this.active_fact_joins.add(fact_join)
    }

    request_idea_join(fact: Fact) {
        let idea_spec = this.program.ideas.get(fact.column)

        if (!idea_spec) {
            this.request_fact_join(fact)
            return
        }

        let existing = this.facts.get(fact.key)
        if (existing && existing.state === FactLifecycleState.MATERIALIZING) {
            return
        }

        fact.state = FactLifecycleState.MATERIALIZING

        const idea = new IdeaJoin(
            fact,
            idea_spec,
            this
        )

        this.facts.set(fact.key, fact)
        this.active_ideas.add(idea)
    }



    suspend_fact_join_to_request_facts(fact_join: FactJoin, fact_key: FactKey) {
        let set = this.pending_fact_joins.get(fact_key)
        if (!set) {
            this.pending_fact_joins.set(fact_key, new Set([fact_join]))
        } else {
            set.add(fact_join)
        }
    }

    run() {
        while (
            this.fact_queue.length > 0 
            || this.active_ideas.size > 0 
            || this.active_fact_joins.size > 0
        ) {

            if (this.fact_queue.length > 0) {
                let fact = this.fact_queue.shift()!
                if (fact.state === FactLifecycleState.UNREQUESTED) {
                    this.request_idea_join(fact)
                }
            }

            for (const fact_join of this.active_fact_joins) {
                fact_join.step()
            }

            for (const idea of this.active_ideas) {
                idea.step()
            }
        }
    }

}

export type RowKey = number
export type RowId = number

export class RelationManager {
    base: Relation
    name: string
    private index_start_world: Map<WorldId, RowId[]>

    private key_index: Map<RowKey, RowId>

    constructor(name: string) {
        this.base = { rows: [] }
        this.name = name
        this.index_start_world = new Map()
        this.key_index = new Map()
    }

    compute_key(row: Row) {
        let res = 1

        for (let [key, value] of row) {
            res += (value + 1)
            res *= (value + 1)
            res += (Math.sin(value) + 1 + Math.sin(value + 1))
        }
        res = Math.floor(res)
        return res
    }

    add_rows(world_id: WorldId, rows: Row[]) {
        for (const row of rows) {
            const key = this.compute_key(row)

            if (this.key_index.has(key)) {
                continue
            }

            const row_id = this.base.rows.length
            this.base.rows.push(row)

            this.key_index.set(key, row_id)

            if (!this.index_start_world.has(world_id)) {
                this.index_start_world.set(world_id, [])
            }
            this.index_start_world.get(world_id)!.push(row_id)
        }
    }

    add_row(row: Row) {

        const key = this.compute_key(row)

        if (this.key_index.has(key)) {
            return
        }


        let row_id = this.base.rows.length
        this.base.rows.push(row)

        this.key_index.set(key, row_id)

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

    get_relation_starting_at_world_id(world_id: WorldId): Relation {
        return { rows: this.get_row_ids_starting_at_world_id(world_id).map(row_id => this.base.rows[row_id]) }
    }

    get_row_ids_starting_at_world_id(world_id: WorldId): RowId[] {
        return this.index_start_world.get(world_id) ?? []
    }
    get_row(row_id: RowId) {
        return this.base.rows[row_id]
    }

    lookupRows(
        world_id: WorldId,
        constraints: { column: string; value: number, is_different?: boolean }[]
    ): RowId[] {
        let candidates = this.get_row_ids_starting_at_world_id(world_id)

        for (const { column, value, is_different } of constraints) {
            candidates = candidates.filter(row_id => {
                if (is_different) {
                    return this.base.rows[row_id].get(column) !== value
                }
                return this.base.rows[row_id].get(column) === value
            })
        }

        return candidates
    }

}

type ConstraintVar = string
type Value = number
// M is a move-fact relation
// line M c1 c2 c3
// A prefix is a partially matched line.
type Prefix = {
    owner: IdeaJoin
    length: number
    bindings: RowId[]
    env: Map<ConstraintVar, Value>
}


function prefix_required_last_world_id(M: RelationManager, prefix: Prefix, initial_world: WorldId): WorldId {
    if (prefix.length === 0) {
        return initial_world
    }
    const last_row = M.get_row(prefix.bindings[prefix.length - 1])
    let end_world_id = last_row.get('end_world_id')
    if (!end_world_id) {
        throw new NoEndWorldIdError(M.name)
    }
    return end_world_id
}

function extend_prefix(prefix: Prefix, row_id: RowId, owner: IdeaJoin): Prefix {
    return {
        owner,
        length: prefix.length + 1,
        bindings: [...prefix.bindings, row_id],
        env: prefix.env
    }
}


class IdeaJoin {

    private scheduler: Scheduler
    worklist: Prefix[]

    spec: Idea

    private waiting_on_facts: number


    private get line() {
        return this.spec.line
    }

    private Ms: RelationManager[]

    fact: Fact

    constructor(fact: Fact, spec: Idea, scheduler: Scheduler) {

        this.fact = fact
        this.waiting_on_facts = 0

        this.spec = spec
        this.scheduler = scheduler

        this.worklist = [{ owner: this, length: 0, bindings: [], env: new Map() }]

        this.Ms = this.line.map(_ => this.scheduler.get_or_create_M(fix_alias(_, this.spec.aliases)))

        this.scheduler.get_or_create_M(this.spec.name)
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


        let i_move = 0
        for (let i = 0; i < prefix.bindings.length; i++) {
            const r = this.get_row(i, prefix.bindings[i])

            for (let j = 0; j < 8; j++) {
                let key = j === 0 ? '' : j + 1
                let key2 = i_move === 0 ? '' : i_move + 1
                if (!r.has(`from${key}`)) {
                    break
                }
                i_move++
                row.set(`from${key2}`, r.get(`from${key}`))
                row.set(`to${key2}`, r.get(`to${key}`))
            }
        }

        for (let ass of this.spec.assigns) {
            let [key] = Object.keys(ass)
            let [r_rel, r_path] = path_split(ass[key])

            let step_index = this.spec.line.findIndex(_ => _ === r_rel)
            const r = this.get_row(step_index, prefix.bindings[step_index])
            row.set(`${key}`, r.get(`${r_path}`))
        }

        this.scheduler.get_or_create_M(this.spec.name)?.add_row(row)
    }

    notify_resume_idea() {
        this.waiting_on_facts--
    }

    step() {
        if (this.worklist.length === 0) {
            if (this.waiting_on_facts === 0) {
                this.scheduler.complete_idea(this)
            } else {
                this.scheduler.active_ideas.delete(this)
            }
            return
        }

        let prefix = this.worklist.pop()!

        if (prefix.length === this.line.length) {
            this.insert_line_into_relation(prefix)
            return
        }

        const stepIndex = prefix.length
        let M0 = this.Ms[stepIndex - 1]
        let M = this.Ms[stepIndex]

        let next_world_id = prefix_required_last_world_id(M0, prefix, this.fact.world_id)

        let needs_fact_key = hash_fact_key(M.name, next_world_id)

        if (!this.scheduler.is_facts_joined(needs_fact_key)) {
            this.waiting_on_facts++
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

        let cond = true

        let local_env = new Map()
        for (let m of this.spec.matches) {

            if (!cond) {
                return false
            }

            if (is_matches_between(m)) {

                let [name, rest] = m.path_a
                let [name2, rest2] = m.path_b
                let [name3, rest3] = m.path_c


                let a_step_index = this.spec.line.findIndex(_ => _ === name)
                let b_step_index = this.spec.line.findIndex(_ => _ === name2)
                let c_step_index = this.spec.line.findIndex(_ => _ === name3)



                let x_row = this.get_row(a_step_index, prefix.bindings[a_step_index]);
                if (x_row === undefined) {
                    return true
                }


                let y_row = this.get_row(b_step_index, prefix.bindings[b_step_index]);

                if (y_row === undefined) {
                    return true
                }


                let z_row = this.get_row(c_step_index, prefix.bindings[c_step_index]);

                if (z_row === undefined) {
                    return true
                }

                let x = x_row.get(rest)!
                let y = y_row.get(rest2)!
                let z = z_row.get(rest3)!

                let yz = between(y, z)

                cond &&= m.is_different ? !yz.has(x) : yz.has(x)
                continue
            }

            let [name, rest] = path_split(m.path_a)
            let [name2, rest2] = path_split(m.path_b)

            let a_step_index = this.spec.line.findIndex(_ => _ === name)
            let b_step_index = this.spec.line.findIndex(_ => _ === name2)


            let b_const
            if (is_constant(name2)) {
                b_const = Constants_by_name[name2]
            }


            if (!rest) {

                if (b_const !== undefined) {
                    let a_var = local_env.get(name)
                    if (a_var === undefined) {
                        a_var.set(name, b_const)
                    } else {
                        cond &&= a_var === b_const
                    }
                } else {
                    let b = this.get_row(b_step_index, prefix.bindings[b_step_index]);

                    if (b === undefined) {
                        return true
                    }

                    let a_var = local_env.get(name)

                    if (a_var === undefined) {
                        local_env.set(name, b.get(rest2)!)
                    } else {
                        cond &&= a_var === b.get(rest2)
                    }
                }
                continue
            }

            let a = this.get_row(a_step_index, prefix.bindings[a_step_index]);
            if (a === undefined) {
                return true
            }


            if (b_const !== undefined) {

                let x = a.get(rest)
                let y = b_const

                cond &&= m.is_different ? x !== y : x === y
            } else {

                let b = this.get_row(b_step_index, prefix.bindings[b_step_index]);

                if (b === undefined) {
                    return true
                }

                let ab_bindings_a = a
                let ab_bindings_b = b

                let x = ab_bindings_a.get(rest)
                let y

                if (!rest2) {
                    let turn = 0
                    y = turn
                } else {
                    y = ab_bindings_b.get(rest2)
                }

                cond &&= m.is_different ? x !== y : x === y
            }

            if (!cond) {
                return false
            }
        }

        return cond
    }
}


class MaterializeError extends Error {
    constructor(column: Column, id: WorldId) {
        super(`Materialize failed for ${column}:${id}`)
    }
}

type AliasColumn = { alias: Column, relation: Column }

type OutputExpr = { column: Column, expr: AliasColumn}

type FactPlan = {
    name: Column
    sources: AliasColumn[]
    joins: { left: AliasColumn, right: AliasColumn, is_different: boolean }[]

    output: OutputExpr[]
}

function convert_to_plan(fact: FactAlias) {

    let sources = []
    let joins = []
    let output: OutputExpr[] = []

    for (let alias of fact.aliases) {
        sources.push({ alias: alias.alias[0], relation: alias.column[0] })
    }

    for (let m of fact.matches) {
        let left_alias = m.path_a[0]
        let left_column = m.path_a[1]

        if (left_column !== '' && !sources.find(_ => _.alias === left_alias)) {
            sources.push({ alias: left_alias, relation: left_alias })
        }

        let right_alias = m.path_b[0]
        let right_column = m.path_b[1]

        if (right_column !== '' && !sources.find(_ => _.alias === right_alias)) {
            sources.push({ alias: right_alias, relation: right_alias })
        }

        let is_different = is_matches_between(m) ? false : m.is_different === true
        joins.push({
            left: { alias: left_alias, relation: left_column },
            right: { alias: right_alias, relation: right_column },
            is_different
        })
    }

    for (let assign of fact.assigns) {
        for (let [alias, column] of Object.entries(assign)) {
            output.push({ column: alias, expr: { alias: column[0], relation: column[1] } })
        }
    }

    let plan: FactPlan = {
        name: fact.name,
        sources,
        joins,
        output
    }

    return plan
}

type Binding = Map<string, Row>

function joinsSatisfiedSoFar(binding: Binding, joins: { is_different: boolean, left: AliasColumn, right: AliasColumn }[]) {
    for (const join of joins) {
        const l = binding.get(join.left.alias)
        const r = binding.get(join.right.alias)
        if (l === undefined || r === undefined) {
            continue
        }
        if (join.is_different) {
            if (l.get(join.left.relation) === r.get(join.right.relation)) {
                return false

            }
        } else {
            if (l.get(join.left.relation) !== r.get(join.right.relation)) {
                return false
            }
        }
    }
    return true
}



class FactJoin {

    m: PositionManager
    pos: PositionC

    program: Program

    get Rs() {
        return this.scheduler.RMs
    }

    get nodes() {
        return this.scheduler.nodes
    }

    dependencies: Map<FactKey, FactJoin>

    scheduler: Scheduler

    fact: Fact

    constructor(fact: Fact, m: PositionManager, pos: PositionC, program: Program, scheduler: Scheduler) {

        this.fact = fact
        this.scheduler = scheduler

        this.m = m
        this.pos = pos
        this.program = program

        this.dependencies = new Map()

        if (this.Rs.get(fact.column) === undefined) {
            this.Rs.set(fact.column, new RelationManager(fact.column))
        }
    }

    add_row(column: Column, row: Row) {
        let rm = this.Rs.get(column)
        if (!rm) {
            rm = new RelationManager(column)
            this.Rs.set(column, rm)
        }
        rm.add_row(row)
    }

    add_rows(column: Column, world_id: WorldId, rows: Row[]) {
        let rm = this.Rs.get(column)
        if (!rm) {
            rm = new RelationManager(column)
            this.Rs.set(column, rm)
        }
        rm.add_rows(world_id, rows)
    }

    worklist_check_fact(fact: Fact) {

        let fact_join = this.dependencies.get(fact.key)

        if (!fact_join) {
            this.scheduler.suspend_fact_join_to_request_facts(this, fact.key)
            this.scheduler.request_idea_join(fact)
            return undefined
        }
        return fact_join.Rs.get(fact.column)?.get_relation_starting_at_world_id(fact.world_id)
    }

    step() {

        let ok = true
        let fact = this.fact
        switch (fact.column) {
            case 'occupies':
                this.make_moves_to_world(fact.world_id)
                ok = this.materialize_occupies(fact.world_id)
                this.unmake_moves_to_base(fact.world_id)
                break
            case 'push':
                this.make_moves_to_world(fact.world_id)
                ok = this.materialize_pushes(fact.world_id)
                this.unmake_moves_to_base(fact.world_id)
                break
            case 'moves':
                this.make_moves_to_world(fact.world_id)
                ok = this.materialize_moves(fact.world_id)
                this.unmake_moves_to_base(fact.world_id)
                break
            case 'attacks':
                this.make_moves_to_world(fact.world_id)
                ok = this.materialize_attacks(fact.world_id)
                this.unmake_moves_to_base(fact.world_id)
                break
            case 'attacks2':
                this.make_moves_to_world(fact.world_id)
                ok = this.materialize_attacks2(fact.world_id)
                this.unmake_moves_to_base(fact.world_id)
                break
            case 'attacks_through':
                this.make_moves_to_world(fact.world_id)
                ok = this.materialize_attack_throughs(fact.world_id)
                this.unmake_moves_to_base(fact.world_id)
                break
            case 'attacks2_through':
                this.make_moves_to_world(fact.world_id)
                ok = this.materialize_attack2_throughs(fact.world_id)
                this.unmake_moves_to_base(fact.world_id)
                break
            default: {
                ok = this.join_with_program(fact)
                //ok = this.join_with_execute_fact(fact)
            }
        }

        if (!ok) {
            return false
        }

        this.scheduler.active_fact_joins.delete(this)
        this.scheduler.complete_fact(this.fact)
    }

    emitRow(fact: Fact, binding: Binding, output: OutputExpr[]) {
        let row = new Map()
        for (let {column, expr} of output) {
            row.set(column, binding.get(expr.alias)?.get(expr.relation))
        }
        row.set('start_world_id', this.fact.world_id)
        this.scheduler.get_or_create_M(fact.column).add_row(row)
    }

    join_with_execute_fact(fact: Fact) {
        let plan = this.program.facts.get(fact.column)!

        return this.executeFact(fact, convert_to_plan(plan), fact.world_id)
    }

    executeFact(fact: Fact, plan: FactPlan, world_id: WorldId) {
        const sources = plan.sources
        const joins = plan.joins

        let self = this
        function getRows(source: AliasColumn, world_id: WorldId, binding: Binding) {
            const filters = []

            for (const j of joins) {
                if (j.left.alias === source.alias && is_constant(j.right.alias)) {
                    filters.push({
                        column: j.left.relation,
                        value: Constants_by_name[j.right.alias]!
                    })
                } else if (j.left.alias === source.alias && binding.has(j.right.alias)) {
                    filters.push({
                        column: j.left.relation,
                        value: binding.get(j.right.alias)!.get(j.right.relation)!
                    })
                }
                if (j.right.alias === source.alias && binding.has(j.left.alias)) {
                    filters.push({
                        column: j.right.relation,
                        value: binding.get(j.left.alias)!.get(j.left.relation)!,
                        is_different: j.is_different
                    })
                }
            }

            return self.Rs.get(source.relation)!.lookupRows(world_id, filters)
        }




        function extend(binding: Binding, sourceIndex: number) {
            if (sourceIndex === sources.length) {
                self.emitRow(fact, binding, plan.output)
                return
            }

            const source = sources[sourceIndex]
            const rows = getRows(source, world_id, binding)
            for (const row_id of rows) {
                let row = self.Rs.get(source.relation)!.get_row(row_id)
                binding.set(source.alias, row)


                if (joinsSatisfiedSoFar(binding, joins)) {
                    extend(binding, sourceIndex + 1)
                }

                binding.delete(source.alias)
            }
        }

        for (let source of sources) {
            if (this.worklist_check_fact(make_fact_with_key(source.relation, world_id)) === undefined) {
                return false
            }
        }

        extend(new Map(), 0)
        return true
    }


    join_with_program(fact: Fact) {
        let p = this.program.facts.get(fact.column)

        let ok = true

        if (p) {
            ok = this.join_with_execute_fact(fact)
        }
        if (!ok) {
            return false
        }

        let l = this.program.legals.find(_ => _ === fact.column)

        if (l) {
            ok = this.join_legal_with_p(fact, l)
        }
        if (!ok) {
            return false
        }

        return true
    }

    join_legal_with_p(fact: Fact, l: Column) {

        let name = l.replace('_moves', '')
        let name2 = 'moves'

        let w_name = this.worklist_check_fact(make_fact_with_key(name, fact.world_id))
        if (w_name === undefined) {
            return false
        }
        let w_name2 = this.worklist_check_fact(make_fact_with_key(name2, fact.world_id))
        if (w_name2 === undefined) {
            return false
        }

        let relation = join(w_name, w_name2, (a, b) => {

            //let ab_bindings = { [name]: a, [name2]: b }
            let ab_bindings_a = a
            let ab_bindings_b = b

            /*
            let cond = ab_bindings[name].get('from') === ab_bindings[name2].get('from')
                && ab_bindings[name].get('to') === ab_bindings[name2].get('to')
                */

            let cond = ab_bindings_a.get('from') === ab_bindings_b.get('from')
                && ab_bindings_a.get('to') === ab_bindings_b.get('to')

            return cond
                ? (() => {

                    const r = new Map()
                    r.set('start_world_id', fact.world_id)
                    r.set('end_world_id', b.get('end_world_id'))
                    for (let [key, value] of ab_bindings_a) {
                        r.set(key, value)
                    }
                    return r
                })() : null
        })

        this.add_rows(fact.column, fact.world_id, relation.rows)
        return true
    }


    materialize_attack2_throughs(world_id: WorldId) {


        for (let on of SquareSet.full()) {
            let piece = this.m.get_at(this.pos, on)

            if (piece) {

                let aa = this.m.attacks(piece, on, this.m.pos_occupied(this.pos))

                for (let a of aa) {

                    let aa2 = this.m.attacks(piece, a, this.m.pos_occupied(this.pos).without(on))

                    for (let a2 of aa2) {

                        let piece2 = this.m.get_at(this.pos, a2)

                        if (piece2) {

                            let aa3 = this.m.attacks(piece, a, this.m.pos_occupied(this.pos).without(on).without(a2))
                            aa3 = aa3.diff(aa2)

                            for (let a3 of aa3) {

                                this.add_row('attacks2_through', new Map([
                                    ['start_world_id', world_id],
                                    ['from', on],
                                    ['to', a],
                                    ['block', a2],
                                    ['to2', a3],
                                    ['piece', piece_c_type_of(piece)],
                                    ['color', piece_c_color_of(piece)]
                                ]))
                            }
                        }
                    }
                }
            }
        }



        return true
    }



    materialize_attack_throughs(world_id: WorldId) {

        for (let on of SquareSet.full()) {
            let piece = this.m.get_at(this.pos, on)

            if (piece) {

                let aa = this.m.attacks(piece, on, this.m.pos_occupied(this.pos))

                for (let a of aa) {
                    let piece2 = this.m.get_at(this.pos, a)

                    if (piece2) {

                        let aa2 = this.m.attacks(piece, on, this.m.pos_occupied(this.pos).without(a))
                        aa2 = aa2.diff(aa)


                        for (let a2 of aa2) {
                            this.add_row('attacks_through', new Map([
                                ['start_world_id', world_id],
                                ['from', on],
                                ['to', a2],
                                ['block', a],
                                ['piece', piece_c_type_of(piece)],
                                ['color', piece_c_color_of(piece)]
                            ]))
                        }
                    }
                }
            }
        }

        return true
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

        return true
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

        return true
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

        return true
    }


    materialize_pushes(world_id: WorldId) {

        for (let on of SquareSet.full()) {
            let piece = this.m.get_at(this.pos, on)

            if (piece && piece_c_type_of(piece) === PAWN) {
                let pp = this.m.pawn_pushes(this.pos, on)
                for (let p of pp) {
                    let aa = this.m.attacks(piece, p, this.m.pos_occupied(this.pos).without(on).with(p))

                    for (let a of aa) {
                        this.add_row('push', new Map([
                            ['start_world_id', world_id],
                            ['from', on],
                            ['to', p],
                            ['to2', a]
                        ]))
                    }
                }
            }
        }

        return true
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

        return true
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
        return true
    }
}


export function relations(m: PositionManager, pos: PositionC, rules: string) {
    let scheduler = new Scheduler(m, pos, rules)

    let program = parse_program(rules)
    let pull_columns = [...program.facts.keys(), ...program.ideas.keys(), ...program.legals]
    pull_columns.forEach(_ => scheduler.request_fact(_, 0))
    scheduler.run()
    return scheduler.RMs
}

export function search3(m: PositionManager, pos: PositionC, rules: string, pull_columns: string[] = []) {
    let scheduler = new Scheduler(m, pos, rules)

    pull_columns.forEach(_ => scheduler.request_fact(_, 0))
    scheduler.run()
    return new Map(pull_columns.map(_ => [_, scheduler.get_continuations(_)]))
}

function fix_alias(line: string, aliases: Alias[]) {
    return aliases.find(_ => _.alias[0] === line)?.column[0] ?? line
}

type Path = [string, string]
function path_split(p: Path) {
    return p
}


const Constants_by_name = {
    King: KING,
    Queen: QUEEN,
    Rook: ROOK,
    Bishop: BISHOP,
    Knight: KNIGHT,
    Pawn: PAWN,
}
import { NodeId } from "../language1/node_manager"

type InvariantId = string
type RelationId = string
type ResolverId = string

type WorldId = NodeId

export type Row = {
    [key: string]: number
}

export type InvariantResult = {
    holds: boolean
    witnesses?: WorldId[]
}

export interface ReadContext {
    get(relation: RelationId): Row[]
}

type Value = number
type RowId = number

type RowIndex = number
type RowKey = number

interface Relation {
    id: RelationId
    rows: Row[]
    compute_row_key: (row: Row) => RowKey
    key_index: Map<RowKey, RowIndex>
}

export interface InputSlice<T extends Row> {
    relation: RelationId
    rows: T[]
}

export type ResolverOutput = {
    [relation: RelationId]: Row[]
}

export interface Resolver {
    id: ResolverId

    inputRelations: RelationId[]

    resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null
}




export interface Invariant {
    id: InvariantId
    evaluate(ctx: ReadContext): InvariantResult
}

interface Task {
    resolver: Resolver
    input: InputSlice<Row>
}


export interface Transaction {
    source: ResolverId

    reads: {
        relation: RelationId
        rowIds: RowId[]
    }[]

    writes: {
        relation: RelationId
        rows: Row[]
    }[]
}

interface CommitResult {
    [relation: RelationId]: Row[]
}


class EngineReadContext implements ReadContext {
    constructor(private relations: Map<RelationId, Relation>) {}


    get(relationName: RelationId): Row[] {
        const relation = this.relations.get(relationName)
        if (!relation) return []

        return relation.rows
    }
}


export class Engine7 {

    invariants: Map<InvariantId, Invariant> = new Map()
    relations: Map<RelationId, Relation> = new Map()
    resolvers: Map<ResolverId, Resolver> = new Map()
    subscriptions: Map<RelationId, ResolverId[]> = new Map()
    workQueue: Task[] = []

    readContext: ReadContext = new EngineReadContext(this.relations)

    buildTransaction(task: Task, output: ResolverOutput): Transaction {

        const writes: Transaction['writes'] = []
        const reads: Transaction['reads'] = []

        for (const [relation, rows] of Object.entries(output)) {
            if (rows.length === 0) continue

            writes.push({
                relation,
                rows
            })
        }

        return {
            source: task.resolver.id,
            reads: [],
            writes
        }
    }

    validate(tx: Transaction): boolean {

        for (const w of tx.writes) {
            if (!this.relations.has(w.relation)) {
                throw new Error(`Unknown relation: ${w.relation}`)
            }
        }
        return true
    }

    commit(tx: Transaction): CommitResult {
        const result: CommitResult = {}

        for (const write of tx.writes) {
            const relation = this.relations.get(write.relation)!
            const committedRows: Row[] = []

            for (const row of write.rows) {
                const committed = {
                    ...row,
                }

                const key = relation.compute_row_key(committed)

                if (relation.key_index.has(key)) {
                    continue
                }

                const row_id = relation.rows.length
                relation.rows.push(committed)

                relation.key_index.set(key, row_id)

                committedRows.push(committed)
            }

            result[write.relation] = committedRows
        }
        return result
    }

    scheduleDownstream(result: CommitResult): void {
        for (const relationName in result) {
            const resolvers = this.subscriptions.get(relationName)

            if (!resolvers) continue

            const rows = result[relationName]

            for (const resolver of resolvers) {
                this.workQueue.unshift({
                    resolver: this.resolvers.get(resolver)!,
                    input: {
                        relation: relationName,
                        rows
                    }
                })
            }
        }
    }

    registerInvariant(invariant: Invariant) {
        this.invariants.set(invariant.id, invariant)
    }

    registerResolver(resolver: Resolver) {
        for (const rel of resolver.inputRelations) {
            let subs = this.subscriptions.get(rel)
            if (!subs) {
                subs = []
                this.subscriptions.set(rel, subs)
            }
            subs.push(resolver.id)
        }
        this.resolvers.set(resolver.id, resolver)
    }

    registerRelation(relation_id: RelationId) {
        this.relations.set(relation_id, makeRelation(relation_id))
    }

    run() {
        while (this.workQueue.length > 0) {
            const task = this.workQueue.pop()!

            const output = task.resolver.resolve(task.input, this.readContext)

            if (!output) continue


            const tx = this.buildTransaction(task, output)

            if (!this.validate(tx)) continue

            const result = this.commit(tx)

            this.scheduleDownstream(result)
        }
    }

    query_invariant(id: InvariantId) {
        return this.invariants.get(id)?.evaluate(this.readContext)
    }

    query_invariants() {

        let res2: Map<InvariantId, WorldId[]> = new Map()
        for (let [key, invariant] of this.invariants.entries()) {

            let res = invariant.evaluate(this.readContext)

            if (res.holds) {
                res2.set(key, res.witnesses!)
            }
        }
        return res2
    }

}



export function makeRelation(id: RelationId, compute_row_key: (t: Row) => RowKey = generic_compute_row_key): Relation {
    return {
        id,
        rows: [],
        compute_row_key,
        key_index: new Map()
    }
}


const generic_compute_row_key = <T extends Row>(row: T): RowKey => {
    let res = 1

    for (let [key, value] of Object.entries(row)) {
        if (key === 'id') {
            continue
        }

        if (typeof value !== 'number') {
            throw `BadValueError for key ${key}: ${value}`
        }

        res += (value + 1)
        res *= (value + 1)
        res += (Math.sin(value) + 1 + Math.sin(value + 1))
    }
    res = Math.floor(res)
    return res
}


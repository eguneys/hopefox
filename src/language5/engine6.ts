import { ColorC, KING, move_c_to_Move, MoveC, piece_c_color_of, piece_c_type_of, PieceC, PieceTypeC, PositionC, PositionManager } from "../distill/hopefox_c";
import { Square } from "../distill/types";
import { NodeId, NodeManager } from "../language1/node_manager";

interface Row {
    id?: RowId
    world_id: WorldId
}

interface ChecksRow extends Row {
    from: Square
    to: Square
}

interface CaptureRow extends Row {
    from: Square
    to: Square
}

interface AttacksRow extends Row {
    world_id: WorldId
    from: Square
    to: Square
}



interface OccupiesRow extends Row {
    world_id: WorldId
    on: Square
    piece: PieceC
    role: PieceTypeC
    color: ColorC
}

interface WorldRow extends Row {
    world_id: WorldId
    depth: number
}

interface MoveRow extends Row {
    world_id: WorldId
    depth: number
    move: MoveC
}


interface AfterMoveRow extends Row {
    world_id: WorldId
    move: MoveC
    after_world_id: WorldId
    depth: number
    from: Square
    to: Square
}



type RowKey = number



const gen_row_id = (() => {
    let id = 0
    return () => id++
})()

type WorldId = NodeId
type Value = number
type RowId = number

type RowIdPairKey = `${RowId}:${RowId}`


type RelationName = string
type ResolverName = string


interface Relation<T extends Row> {
    name: RelationName
    rows: T[]
    indexByWorld: Map<WorldId, T[]>
}

interface InputSlice<T extends Row> {
    relation: RelationName
    rows: T[]
}

type ResolverOutput = {
    [relation: RelationName]: Row[]
}

interface Resolver {
    name: ResolverName

    inputRelations: RelationName[]

    resolve(input: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null
}

interface ReadContext {
    get<T extends Row>(relation: RelationName, world: WorldId): T[]
}


interface Task {
    resolver: Resolver
    input: InputSlice<Row>
}


interface Transaction {
    world_id: WorldId
    source: ResolverName

    reads: {
        relation: RelationName
        rowIds: RowId[]
    }[]

    writes: {
        relation: RelationName
        rows: Row[]
    }[]
}

interface CommitResult {
    [relation: RelationName]: Row[]
}

interface EngineState {
    relations: Map<RelationName, Relation<Row>>
    resolvers: Resolver[]
    subscriptions: Map<RelationName, Resolver[]>
    workQueue: Task[]
    nextRowId: RowId
}


interface Engine {
    run(): void

    buildTransaction(task: Task, output: ResolverOutput): Transaction

    validate(tx: Transaction): boolean

    commit(tx: Transaction): CommitResult

    scheduleDownstream(result: CommitResult): void
}

class EngineReadContext implements ReadContext {
    constructor(private relations: Map<RelationName, Relation<Row>>) {}


    get<T extends Row>(relationName: RelationName, world_id: WorldId): T[] {
        const relation = this.relations.get(relationName)
        if (!relation) return []

        const rows = relation.indexByWorld.get(world_id)
        if (!rows) return []

        return rows as T[]
    }
}

class MyEngine implements Engine, EngineState {

    relations: Map<RelationName, Relation<Row>> = new Map()
    resolvers: Resolver[] = []
    subscriptions: Map<RelationName, Resolver[]> = new Map()
    workQueue: Task[] = []
    nextRowId: RowId = 1

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
            world_id: task.input.rows[0]?.world_id ?? -1,
            source: task.resolver.name,
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
                    id: this.nextRowId++
                }

                relation.rows.push(committed)

                let bucket = relation.indexByWorld.get(committed.world_id)
                if (!bucket) {
                    bucket = []
                    relation.indexByWorld.set(committed.world_id, bucket)
                }
                bucket.push(committed)

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
                this.workQueue.push({
                    resolver,
                    input: {
                        relation: relationName,
                        rows
                    }
                })
            }
        }
    }


    registerResolver(resolver: Resolver) {
        for (const rel of resolver.inputRelations) {
            let subs = this.subscriptions.get(rel)
            if (!subs) {
                subs = []
                this.subscriptions.set(rel, subs)
            }
            subs.push(resolver)
        }
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

}

export class PositionMaterializer {
    nodes: NodeManager

    m: PositionManager
    pos: PositionC

    constructor(m: PositionManager, pos: PositionC) {
        this.m = m
        this.pos = pos

        this.nodes = new NodeManager()
    }

    exists(world_id: WorldId) {
        if (world_id === 0) {
            return true
        }
        return this.nodes.cache.get_node(world_id) !== undefined
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

}

export function Search6(m: PositionManager, pos: PositionC, rules: string) {

    let mz = new PositionMaterializer(m, pos)


    const worlds = makeRelation<WorldRow>('worlds')
    const moves = makeRelation<MoveRow>('moves')
    const attacks = makeRelation<AttacksRow>('attacks')
    const occupies = makeRelation<OccupiesRow>('occupies')
    const checks = makeRelation<ChecksRow>('checks')
    const checksSafe = makeRelation<ChecksRow>('checks_uncapturable')
    const afterMoves = makeRelation<AfterMoveRow>('afterMoves')

    let engine = new MyEngine()

    engine.relations.set('worlds', worlds)
    engine.relations.set('moves', moves)
    engine.relations.set('attacks', attacks)
    engine.relations.set('occupies', occupies)
    engine.relations.set('checks', checks)
    engine.relations.set('checks_uncapturable', checksSafe)
    engine.relations.set('afterMoves', afterMoves)


    engine.registerResolver(new OccupiesResolver(mz))
    engine.registerResolver(new AttacksResolver(mz))
    engine.registerResolver(new LegalMoveResolver(mz))
    engine.registerResolver(new AfterMoveResolver(mz))
    engine.registerResolver(new NegJoinResolver())
    engine.registerResolver(new CheckAttackJoinResolver())


    const bootstrapTx: Transaction = {
        world_id: 0,
        source: 'bootstrap',
        reads: [],
        writes: [{
                relation: 'worlds',
                rows: [
                    {
                        world_id: 0,
                        depth: 0
                    } as Row
                ]
            }
        ]
    }

    const committed = engine.commit(bootstrapTx)
    engine.scheduleDownstream(committed)

    engine.run()

    return afterMoves.rows
}


class NegJoinResolver implements Resolver {
    name: 'neg_join_checks_uncapturable'

    inputRelations = ['checks']

    resolve(
        input: InputSlice<ChecksRow>,
        ctx: ReadContext
    ): ResolverOutput | null {
        const output: ChecksRow[] = []

        for (const check of input.rows) {
            const captures = ctx.get<CaptureRow>('captures', check.world_id)


            let blocked = false

            for (const cap of captures) {
                if (cap.from === check.from && cap.to === check.to) {
                    blocked = true
                    break
                }
            }
            if (!blocked) {
                output.push(check)
            }
        }

        if (output.length === 0) return null


        return {
            'checks_uncapturable': output
        }
    }
}


class CheckAttackJoinResolver implements Resolver {
    name = 'join_checks_attacks'

    inputRelations = ['checks']

    resolve(
        input: InputSlice<ChecksRow>,
        ctx: ReadContext
    ): ResolverOutput | null {
        const output: Row[] = []

        for (const check of input.rows) {

            const attacks = ctx.get<AttacksRow>('attacks', check.world_id)


            for (const atk of attacks) {
                if (atk.from === check.from && atk.to === check.to) {
                    output.push({
                        world_id: check.world_id,
                        from: check.from,
                        to: check.to
                    } as Row)
                }
            }
        }

        if (output.length === 0) return null

        return {
            'checks_attacks': output
        }
    }
}

class OccupiesResolver implements Resolver {
    name = 'occupies'

    inputRelations = ['worlds']

    constructor(private mz: PositionMaterializer) {}

    resolve(
        input: InputSlice<WorldRow>,
        ctx: ReadContext
    ): ResolverOutput | null {
        const output: OccupiesRow[] = []

        for (const { world_id } of input.rows) {


            this.mz.make_to_world(world_id)

            let occ = this.mz.m.pos_occupied(this.mz.pos)

            for (let on of occ) {
                let piece = this.mz.m.get_at(this.mz.pos, on)!
                let role = piece_c_type_of(piece)
                let color = piece_c_color_of(piece)

                output.push({
                    world_id,
                    on,
                    piece,
                    role,
                    color
                })
            }

            this.mz.unmake_world(world_id)
        }

        if (output.length === 0) return null

        return {
            'occupies': output
        }
    }
}



class AttacksResolver implements Resolver {
    name = 'attacks'

    inputRelations = ['worlds']

    constructor(private mz: PositionMaterializer) {}

    resolve(
        input: InputSlice<WorldRow>,
        ctx: ReadContext
    ): ResolverOutput | null {
        const output: AttacksRow[] = []

        for (const { world_id } of input.rows) {


            this.mz.make_to_world(world_id)

            let occ = this.mz.m.pos_occupied(this.mz.pos)

            for (let on of occ) {

                let aa = this.mz.m.pos_attacks(this.mz.pos, on)

                for (let a of aa) {

                    output.push({
                        world_id,
                        from: on,
                        to: a
                    })
                }
            }

            this.mz.unmake_world(world_id)
        }

        if (output.length === 0) return null

        return {
            'attacks': output
        }
    }
}


class LegalMoveResolver implements Resolver {
    name = 'moves'

    inputRelations = ['worlds']

    constructor(private mz: PositionMaterializer) { }

    resolve(
        input: InputSlice<WorldRow>,
        ctx: ReadContext
    ): ResolverOutput | null {
        const output: MoveRow[] = []

        for (const { world_id, depth } of input.rows) {


            this.mz.make_to_world(world_id)

            for (let move of this.mz.m.get_legal_moves(this.mz.pos)) {
                output.push({
                    world_id,
                    move,
                    depth
                })
            }

            this.mz.unmake_world(world_id)
        }

        if (output.length === 0) return null

        return {
            'moves': output
        }
    }
}

function makeRelation<T extends Row>(name: string): Relation<T> {
    return {
        name,
        rows: [],
        indexByWorld: new Map()
    }
}


class AfterMoveResolver implements Resolver {

    static MAX_DEPTH = 2

    name = 'afterMoves'

    inputRelations = ['moves']

    constructor(private mz: PositionMaterializer) { }

    resolve(input: InputSlice<MoveRow>, ctx: ReadContext): ResolverOutput | null {

        const output: AfterMoveRow[] = []
        const worlds: WorldRow[] = []

        for (const { world_id, depth, move } of input.rows) {

            if (depth > AfterMoveResolver.MAX_DEPTH) {
                continue
            }

            let after_world_id = this.mz.add_move(world_id, move)

            let { from, to } = move_c_to_Move(move)

            output.push({
                world_id,
                move,
                from,
                to,
                after_world_id,
                depth: depth + 1
            })

            worlds.push({ world_id: after_world_id, depth: depth + 1 })

        }

        if (output.length === 0) return null


        return {
            worlds,
            'afterMoves': output
        }
    }
    
}
import { between } from "../distill/attacks";
import { ColorC, KING, make_move_from_to, move_c_to_Move, MoveC, piece_c_color_of, piece_c_type_of, PieceC, PieceTypeC, PositionC, PositionManager, static_piece_value } from "../distill/hopefox_c";
import { Square } from "../distill/types";
import { NodeId, NodeManager } from "../language1/node_manager";
import { san_moves_c } from "../language2/san_moves_helper";
import { CoreProgram, EngineGraph, lowerCoreToEngine, RelationId, SCHEMAS } from "./core";
import { analyseProgram } from "./diagnostics";

interface PreservedBaselineRow extends Row {

}

interface TurnRow extends Row {
    turn: ColorC
}

interface BaselineDeltaRow extends Row {
    gain_piece: PieceTypeC,
    gain_value: number,
    loss_piece: PieceTypeC,
    loss_value: number
}

export interface Row {
    world_id: WorldId
    [key: string]: number
}

interface FromToRow extends Row {
    from: Square
    to: Square
}



interface ChecksRow extends Row {
    attacker: Square
    king: Square
}

interface CaptureRow extends Row {
    from: Square
    to: Square
}


interface AttacksThroughRow extends Row {
    world_id: WorldId
    from: Square
    to2: Square
    through: Square
}



interface AttacksRow extends Row {
    world_id: WorldId
    from: Square
    to: Square
}


interface Attacks2Row extends Row {
    world_id: WorldId
    from: Square
    to: Square
    to2: Square
}




interface OccupiesRow extends Row {
    world_id: WorldId
    on: Square
    piece: PieceC
    role: PieceTypeC
    color: ColorC
    value: number
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






const gen_row_id = (() => {
    let id = 0
    return () => id++
})()

type ResolverId = string

export type WorldId = NodeId
type Value = number
type RowId = number

type RowIndex = number
type RowKey = number

interface Relation<T extends Row> {
    id: RelationId
    schema: string[]
    rows: T[]
    indexByWorld: Map<WorldId, T[]>
    compute_row_key: (row: T) => RowKey
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

export interface ReadContext {
    get<T extends Row>(relation: RelationId, world?: WorldId): T[]
}

export type InvariantId = string

export type InvariantResult = {
    holds: boolean
    witnesses?: WorldId[]
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
    world_id: WorldId
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

interface EngineState {
    invariants: Map<InvariantId, Invariant>
    relations: Map<RelationId, Relation<any>>
    resolvers: Map<ResolverId, Resolver>
    subscriptions: Map<RelationId, ResolverId[]>
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
    constructor(private relations: Map<RelationId, Relation<Row>>) {}


    get<T extends Row>(relationName: RelationId, world_id?: WorldId): T[] {
        const relation = this.relations.get(relationName)
        if (!relation) return []

        if (world_id === undefined) {
            return relation.rows as T[]
        }

        const rows = relation.indexByWorld.get(world_id)
        if (!rows) return []

        return rows as T[]
    }
}

type ResolverFunc = (input: InputSlice<Row>, ctx: ReadContext) => ResolverOutput | null

class ResolverNodeRuntime implements Resolver {
    id: ResolverId
    inputRelations: string[];
    resolve: ResolverFunc

    constructor(
        id: ResolverId, 
        inputRelations: RelationId[],
        resolve: ResolverFunc) {
            this.id = id
            this.inputRelations = inputRelations
            this.resolve = resolve
        }
}

type JoinPredicate = (binding: Map<string, Row>, ctx: ReadContext) => boolean

class JoinNodeRuntime implements Resolver {
    id: string;
    inputRelations: RelationId[];
    joinFn: JoinPredicate

    private rowsByRelation = new Map<string, Row[]>()

    constructor(
        id: ResolverId,
        inputs: RelationId[],
        joinFn: JoinPredicate) {
            this.id = id
            this.inputRelations = inputs

            this.joinFn = joinFn

            for (const rel of inputs) {
                this.rowsByRelation.set(rel, [])
            }
        }

        private extend(binding: Map<RelationId, Row>, emit: ResolverOutput) {
            if (binding.size === this.inputRelations.length) {
                if (this.joinFn(binding, {} as ReadContext)) {
                    const row: Row = { world_id: -1 }
                    for (const [relId, r] of binding) {
                        for (const key in r) {
                            row[`${relId}.${key}`] = r[key]
                        }
                    }
                    emit['TODO'].push(row)
                }
                return
            }


            for (const rel_id of this.inputRelations) {
                if (binding.has(rel_id)) continue
                const rows = this.rowsByRelation.get(rel_id)!
                for (const r of rows) {
                    binding.set(rel_id, r)
                    this.extend(binding, emit)
                    binding.delete(rel_id)
                }
                return
            }
        }

    resolve(slice: InputSlice<Row>, ctx: ReadContext): ResolverOutput | null {
        const result: ResolverOutput = {}

        for (const row of slice.rows) {
            //const binding = ctx.rowToBinding(row)
            //this.extend(binding, result)
        }

        return result
    }

}

export class MyEngine implements Engine, EngineState {

    invariants: Map<InvariantId, Invariant> = new Map()
    relations: Map<RelationId, Relation<any>> = new Map()
    resolvers: Map<ResolverId, Resolver> = new Map()
    subscriptions: Map<RelationId, ResolverId[]> = new Map()
    workQueue: Task[] = []
    nextRowId: RowId = 1

    readContext: ReadContext = new EngineReadContext(this.relations)

    constructor(graph?: EngineGraph) {
        if (!graph) {
            return
        }
        for (const [relId, metaRel] of graph.relations) {
            this.relations.set(relId, makeRelation(relId, metaRel.schema))
        }


        for (const node of graph.nodes.values()) {
            if (node.kind === 'resolver') {
                let resolverFunc = () => ({})
                const resolver = new ResolverNodeRuntime(node.id, node.inputs, resolverFunc)
                this.registerResolver(resolver)
            } else if (node.kind === 'join') {
                let joinFn = () => false
                const join = new JoinNodeRuntime(node.id, node.inputs, joinFn)
                this.registerResolver(join)
            }
        }
    }

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
                    id: this.nextRowId++
                }

                const key = relation.compute_row_key(committed)

                if (relation.key_index.has(key)) {
                    continue
                }

                const row_id = relation.rows.length
                relation.rows.push(committed)

                relation.key_index.set(key, row_id)

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
        this.relations.set(relation_id, makeRelation(relation_id, []))
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

export class PositionMaterializer {
    nodes: NodeManager

    m: PositionManager
    pos: PositionC

    get attacker_turn() {
        return this.m.pos_turn(this.pos)
    }

    constructor(m: PositionManager, pos: PositionC) {
        this.m = m
        this.pos = pos

        this.nodes = new NodeManager()
    }


    children_ids(world_id: WorldId) {
        return this.nodes.children_ids(world_id)
    }

    parent_world_id(world_id: WorldId) {
        return this.nodes.parent_world_id(world_id)
    }

    is_a_successor_of_b(a: WorldId, b: WorldId) {
        return this.nodes.is_a_successor_of_b(a, b)
    }

    is_attacker(world_id: WorldId) {
        return this.nodes.history_moves(world_id).length % 2 === 0
    }
    is_defender(world_id: WorldId) {
        return !this.is_attacker(world_id)
    }

    is_check(world_id: WorldId) {
        this.make_to_world(world_id)
        let res = this.m.pos_in_check(this.pos)
        this.unmake_world(world_id)
        return res
    }

    is_checkmate(world_id: WorldId) {
        this.make_to_world(world_id)
        let res = this.m.is_checkmate(this.pos)
        this.unmake_world(world_id)
        return res
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

    generate_legal_worlds(world_id: WorldId) {
        return this.generate_legal_moves(world_id).map(_ => this.add_move(world_id, _))
    }

    generate_legal_moves(world_id: WorldId) {
        this.make_to_world(world_id)
        let res = this.m.get_legal_moves(this.pos)
        this.unmake_world(world_id)
        return res
    }

    sans(world_id: WorldId) {

        let res = this.nodes.history_moves(world_id)
        let res2 = san_moves_c(this.m, this.pos, res)
        return res2
    }
}

class AttackersDefendersResolver implements Resolver {
    id = 'attackers-defenders'

    inputRelations = ['attacks']

    resolve(
        input: InputSlice<AttacksRow>,
        ctx: ReadContext
    ): ResolverOutput | null {

        const attackers: AttacksRow[] = []
        const defenders: AttacksRow[] = []


        for (const attack of input.rows) {
            let occupies = ctx.get<OccupiesRow>('occupies', attack.world_id)

            const fromOcc = occupies.find(occ => occ.on === attack.from)
            const toOcc = occupies.find(occ => occ.on === attack.to)


            if (!fromOcc || !toOcc) {
                continue
            }

            if (fromOcc.color === toOcc.color) {
                defenders.push(attack)
            } else {
                attackers.push(attack)
            }

        }

        return {
            attackers,
            defenders
        }
    }
}




class CheckmatesResolver implements Resolver {
    id = 'checkmates'

    inputRelations = ['unblockable_checks']

    resolve(
        input: InputSlice<ChecksRow>,
        ctx: ReadContext
    ): ResolverOutput | null {
        const output: ChecksRow[] = []

        for (const check of input.rows) {
            const checks2 = ctx.get<CaptureRow>('uncapturable_checks', check.world_id)

            for (const c2 of checks2) {
                if (c2.from === check.from && c2.to === check.to) {
                    output.push(check)
                }
            }
        }

        if (output.length === 0) return null


        return {
            'checkmates': output
        }
    }
}



class UnblockableChecksResolver implements Resolver {
    id = 'unblockable_checks'

    inputRelations = ['checks']

    resolve(
        input: InputSlice<ChecksRow>,
        ctx: ReadContext
    ): ResolverOutput | null {
        const output: ChecksRow[] = []

        for (const check of input.rows) {
            const blocks = ctx.get<CaptureRow>('attacks', check.world_id)


            let aa = between(check.attacker, check.king)
            let blocked = false

            for (const block of blocks) {
                if (block.from === check.attacker || block.from === check.king) {
                    continue
                }

                if (aa.has(block.to)) {
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
            'unblockable_checks': output
        }
    }
}

class UncapturableChecksResolver implements Resolver {
    id = 'uncapturable_checks'

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
                if (cap.to === check.attacker) {
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
            'uncapturable_checks': output
        }
    }
}


class ExpandCapturesResolver implements Resolver {
    id = 'expand-captures'

    inputRelations = ['captures']


    resolve(
        input: InputSlice<CaptureRow>,
        ctx: ReadContext
    ): ResolverOutput | null {
        const output: Row[] = []

        for (const capture of input.rows) {
            output.push(capture)
        }

        if (output.length === 0) {
            return null
        }

        return { 'allow_expand_moves': output }
    }

 
}


class ExpandBlockChecksResolver implements Resolver {
    id = 'blocks-checks'

    inputRelations = ['checks']

    resolve(
        input: InputSlice<ChecksRow>,
        ctx: ReadContext
    ): ResolverOutput | null {
        const output: Row[] = []


        for (const check of input.rows) {

            let attacks = ctx.get<AttacksRow>('attacks', check.world_id)

            let r = between(check.attacker, check.king)

            for (let block of attacks) {
                if (block.from === check.attacker ||block .from === check.king) {
                    continue
                }

                if (!r.has(block.to)) {
                    continue
                }

                output.push({
                    world_id: check.world_id,
                    from: block.from,
                    to: block.to
                })
            }
        }

        if (output.length === 0) {
            return null
        }

        return { 
            'blocks-checks': output,
            'allow_expand_moves': output 
        }
    }

 
}



class ExpandChecksResolver implements Resolver {
    id = 'expand-checks'

    inputRelations = ['attacks2']


    resolve(
        input: InputSlice<Attacks2Row>,
        ctx: ReadContext
    ): ResolverOutput | null {
        const output: Row[] = []

        for (const attacks2 of input.rows) {

            const occupies = ctx.get<OccupiesRow>('occupies', attacks2.world_id)

            for (let occ2 of occupies) {

                if (occ2.on !== attacks2.from) {
                    continue
                }

                for (let occ of occupies) {

                    if (occ.on !== attacks2.to2) {
                        continue
                    }

                    if (occ.role !== KING) {
                        continue
                    }

                    if (occ.color === occ2.color) {
                        continue
                    }

                    output.push({
                        world_id: attacks2.world_id,
                        from: attacks2.from,
                        to: attacks2.to
                    })
                }
            }
        }

        if (output.length === 0) {
            return null
        }

        return { 'allow_expand_moves': output }
    }

 
}

class RecapturesResolver implements Resolver {
    id = 'recaptures'

    inputRelations = ['captures']

    mz: PositionMaterializer

    constructor(mz: PositionMaterializer) {
        this.mz = mz
    }


    resolve(
        input: InputSlice<CaptureRow>,
        ctx: ReadContext
    ): ResolverOutput | null {
        const output: Row[] = []

        for (const recapture of input.rows) {
            let parent_id = this.mz.parent_world_id(recapture.world_id)

            if (parent_id === undefined) {
                continue
            }

            let captures = ctx.get<CaptureRow>('captures', parent_id)

            for (let capture of captures) {
                if (capture.to !== recapture.to) {
                    continue
                }
                output.push({
                    world_id: recapture.world_id,
                    from: recapture.from,
                    to: recapture.to
                })
            }
        }

        if (output.length === 0) {
            return null
        }

        return { recaptures: output }
    }
}



class CapturesResolver implements Resolver {
    id = 'captures'

    inputRelations = ['attacks']


    resolve(
        input: InputSlice<AttacksRow>,
        ctx: ReadContext
    ): ResolverOutput | null {
        const output: Row[] = []

        for (const attack of input.rows) {

            const occupies = ctx.get<OccupiesRow>('occupies', attack.world_id)

            for (let occ2 of occupies) {

                if (occ2.on !== attack.from) {
                    continue
                }

                for (let occ of occupies) {

                    if (occ.on !== attack.to) {
                        continue
                    }

                    if (occ.color === occ2.color) {
                        continue
                    }

                    output.push({
                        world_id: attack.world_id,
                        from: attack.from,
                        to: attack.to
                    })
                }
            }
        }

        if (output.length === 0) {
            return null
        }

        return { captures: output }
    }
}



class ChecksResolver implements Resolver {
    id = 'checks'

    inputRelations = ['attacks']


    resolve(
        input: InputSlice<AttacksRow>,
        ctx: ReadContext
    ): ResolverOutput | null {
        const checks: Row[] = []

        for (const attack of input.rows) {

            const occupies = ctx.get<OccupiesRow>('occupies', attack.world_id)

            for (let occ2 of occupies) {

                if (occ2.on !== attack.from) {
                    continue
                }

                for (let occ of occupies) {

                    if (occ.on !== attack.to) {
                        continue
                    }

                    if (occ.role !== KING) {
                        continue
                    }

                    if (occ.color === occ2.color) {
                        continue
                    }

                    checks.push({
                        world_id: attack.world_id,
                        attacker: attack.from,
                        king: occ.on
                    })
                }
            }
        }


        return { checks }
    }

 
}

class CheckAttackJoinResolver implements Resolver {
    id = 'join_checks_attacks'

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


class TurnResolver implements Resolver {
    id = 'turn'

    inputRelations = ['worlds']

    constructor(private mz: PositionMaterializer) {}

    resolve(
        input: InputSlice<WorldRow>,
        ctx: ReadContext
    ): ResolverOutput | null {
        const output: TurnRow[] = []

        for (const { world_id } of input.rows) {


            this.mz.make_to_world(world_id)

            let color = this.mz.m.pos_turn(this.mz.pos)

                output.push({
                    world_id,
                    turn: color
                })
            this.mz.unmake_world(world_id)
        }

        if (output.length === 0) return null

        return {
            'turn': output
        }
    }
}




class OccupiesResolver implements Resolver {
    id = 'occupies'

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

                let value = static_piece_value(role)

                output.push({
                    world_id,
                    on,
                    piece,
                    role,
                    color,
                    value
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


class AttacksThroughResolver implements Resolver {
    id = 'attacks_through'

    inputRelations = ['worlds']

    constructor(private mz: PositionMaterializer) {}

    resolve(
        input: InputSlice<WorldRow>,
        ctx: ReadContext
    ): ResolverOutput | null {
        const output: AttacksThroughRow[] = []

        for (const { world_id } of input.rows) {

            this.mz.make_to_world(world_id)

            let occ = this.mz.m.pos_occupied(this.mz.pos)

            for (let on of occ) {

                let piece = this.mz.m.get_at(this.mz.pos, on)!
                let aa = this.mz.m.pos_attacks(this.mz.pos, on)

                for (let a of aa) {

                    if (!occ.has(a)) {
                        continue
                    }

                    let aa2 = this.mz.m.attacks(piece, on, occ.without(a))
                    .diff(aa)
                    for (let a2 of aa2) {
                        output.push({
                            world_id,
                            from: on,
                            to2: a2,
                            through:  a
                        })
                    }
                }
            }

            this.mz.unmake_world(world_id)
        }

        if (output.length === 0) return null

        return {
            'attacks_through': output
        }
    }
}



class Attacks2Resolver implements Resolver {
    id = 'attacks2'

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

                let piece = this.mz.m.get_at(this.mz.pos, on)!

                let aa = this.mz.m.pos_attacks(this.mz.pos, on)

                for (let a of aa) {

                    let aa2 = this.mz.m.attacks(piece, a, occ.without(on))

                    for (let a2 of aa2) {
                        output.push({
                            world_id,
                            from: on,
                            to: a,
                            to2: a2
                        })
                    }
                }
            }

            this.mz.unmake_world(world_id)
        }

        if (output.length === 0) return null

        return {
            'attacks2': output
        }
    }
}



class AttacksResolver implements Resolver {
    id = 'attacks'

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
    id = 'moves'

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

export function makeRelation<T extends Row>(id: RelationId, schema: string[], compute_row_key: (t: T) => RowKey = generic_compute_row_key): Relation<T> {
    return {
        id,
        schema,
        rows: [],
        indexByWorld: new Map(),
        compute_row_key,
        key_index: new Map()
    }
}


class AfterMoveResolver implements Resolver {

    static MAX_DEPTH = 2

    id = 'afterMoves'

    inputRelations = ['allow_expand_moves']

    constructor(private mz: PositionMaterializer) { }

    resolve(input: InputSlice<FromToRow>, ctx: ReadContext): ResolverOutput | null {

        const output: AfterMoveRow[] = []
        const worlds: WorldRow[] = []

        for (const { world_id, from, to } of input.rows) {

            let move = make_move_from_to(from, to)

            let is_legal = ctx.get('moves', world_id).some(_ => (_ as MoveRow).move === move)

            let depth = (ctx.get('worlds', world_id)[0] as WorldRow).depth

            if (!is_legal) {
                continue
            }

            let after_world_id = this.mz.add_move(world_id, move)

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

class ForcedBlockResolver implements Resolver {
  id = 'forced_blocks'

  inputRelations = [
    'attacks_through',
  ]

  resolve(
    input: InputSlice<any>,
    ctx: ReadContext
  ): ResolverOutput | null {

    const output: Row[] = []

    const forcedBlocks = input.rows

    for (const forced of forcedBlocks) {
        output.push({
            world_id: forced.world_id,
            target: forced.through,
        })
    }

    if (output.length === 0) return null

    return {'forced_blocks': output }
  }
}


class ForcedCaptureTargetResolver implements Resolver {
  id = 'forced_capture_target'

  inputRelations = [
    'forced_blocks',
  ]

  resolve(
    input: InputSlice<any>,
    ctx: ReadContext
  ): ResolverOutput | null {

    const output: Row[] = []

    const forcedTargets = input.rows

    for (const forced of forcedTargets) {
        output.push(forced)
    }

    if (output.length === 0) return null

    return { forced_capture_target: output }
  }
}


class RealizableDeltaResolver implements Resolver {
  id = 'realizable_delta'

  inputRelations = [
    'forced_capture_target',
  ]

  resolve(
    input: InputSlice<any>,
    ctx: ReadContext
  ): ResolverOutput | null {

    const output: BaselineDeltaRow[] = []

    // We iterate per world implicitly via relations
    const forcedTargets = input.rows

    for (const forced of forcedTargets) {
      const world = forced.world_id

const turn = ctx.get<TurnRow>('turn', world)[0].turn
      // Occupant that is guaranteed to be captured
      const occs = ctx.get<OccupiesRow>('occupies', world)
      const targetOcc = occs.find(o => o.on === forced.target)

      if (!targetOcc) continue

      // All captures that hit this forced target
      const captures = ctx
        .get<CaptureRow>('captures', world)
        .filter(c => c.to === forced.target)

      for (const cap of captures) {
        const attackerOcc = occs
        .filter(o => o.color === turn)
        .find(o => o.on === cap.from)
        if (!attackerOcc) continue

        output.push({
          world_id: world,

          gain_piece: targetOcc.piece,
          gain_value: targetOcc.value,

          loss_piece: attackerOcc.piece,
          loss_value: attackerOcc.value
        })
      }
    }

    if (output.length === 0) return null

    return { realizable_delta: output }
  }
}



class BaselineDeltaResolver implements Resolver {
  id = 'baseline_delta'

  inputRelations = [
    'forced_capture_target',
    //'captures',
    //'occupies'
  ]

  resolve(
    input: InputSlice<any>,
    ctx: ReadContext
  ): ResolverOutput | null {

    const output: BaselineDeltaRow[] = []

    // We iterate per world implicitly via relations
    const forcedTargets = input.rows

    for (const forced of forcedTargets) {
      const world = forced.world_id

      const turn = ctx.get<TurnRow>('turn', world)[0].turn
      // Occupant that is guaranteed to be captured
      const occs = ctx.get<OccupiesRow>('occupies', world)
      const targetOcc = occs.find(o => o.on === forced.target)

      if (!targetOcc) continue

      // All captures that hit this forced target
      const captures = ctx
        .get<CaptureRow>('captures', world)
        .filter(c => c.to === forced.target)

      for (const cap of captures) {
        const attackerOcc = occs
        .filter(o => o.color === turn)
        .find(o => o.on === cap.from)
        if (!attackerOcc) continue

        output.push({
          world_id: world,

          gain_piece: targetOcc.piece,
          gain_value: targetOcc.value,

          loss_piece: attackerOcc.piece,
          loss_value: attackerOcc.value
        })
      }
    }

    if (output.length === 0) return null

    return { baseline_delta: output }
  }
}

class BaselineDeltaPreservedResolver implements Resolver {
  id = 'baseline_delta_preserved'

  inputRelations = [
    'baseline_delta',
    //'reply_worlds',
    //'realizable_delta'
  ]

  constructor(private mz: PositionMaterializer) {}

  resolve(
    input: InputSlice<any>,
    ctx: ReadContext
  ): ResolverOutput | null {


    const preserved: PreservedBaselineRow[] = []

    let baseline_delta = input

    for (const bd of baseline_delta.rows) {

        //let replies = ctx.get('capture_reply_worlds', bd.world_id)

        let moves = this.mz.children_ids(bd.world_id)
      let ok = true

      out: for (const next_world_id of moves) {
        //const rds = ctx.get<BaselineDeltaRow>('realizable_delta', reply.world_id)
        const rds = ctx.get<BaselineDeltaRow>('realizable_delta', next_world_id)

          for (let rd of rds) {
              if (!rd || (rd.gain - rd.loss) < (bd.gain - bd.loss)) {
                  ok = false
                  break out
              }
          }
      }

      if (ok) {
        preserved.push({
          world_id: bd.world_id,
          //move_id: bd.move_id
        })
      }
    }

    return { baseline_delta_preserved: preserved }
  }
}



export function Search6(m: PositionManager, pos: PositionC, node: CoreProgram) {

    let mz = new PositionMaterializer(m, pos)


    const worlds = makeRelation<WorldRow>('worlds', SCHEMAS.world)
    const moves = makeRelation<MoveRow>('moves', SCHEMAS.move)
    const attacks = makeRelation<AttacksRow>('attacks', SCHEMAS.attacks)
    const attacks2 = makeRelation<Attacks2Row>('attacks2', SCHEMAS.attacks2)
    const occupies = makeRelation<OccupiesRow>('occupies', SCHEMAS.occupies)
    const checks = makeRelation<ChecksRow>('checks', SCHEMAS.checks)
    const afterMoves = makeRelation<AfterMoveRow>('afterMoves', [])
    const allow_expand_moves = makeRelation<FromToRow>('allow_expand_moves', [])

    let graph = lowerCoreToEngine(node)
    let engine = new MyEngine(graph)

    engine.relations.set('worlds', worlds)
    engine.relations.set('moves', moves)
    engine.relations.set('attacks', attacks)
    engine.relations.set('attacks2', attacks2)
    engine.relations.set('occupies', occupies)
    engine.relations.set('checks', checks)
    engine.relations.set('afterMoves', afterMoves)
    engine.relations.set('allow_expand_moves', allow_expand_moves)
    
    engine.relations.set('captures', makeRelation('captures', []))
    engine.relations.set('recaptures', makeRelation('recaptures', []))

    engine.relations.set('uncapturable_checks', makeRelation('uncapturable_checks', []))
    engine.relations.set('unblockable_checks', makeRelation('unblockable_checks', []))

    engine.relations.set('checkmates', makeRelation('checkmates', []))

    engine.relations.set('blocks-checks', makeRelation('blocks-checks', []))


    engine.relations.set('attacks_through', makeRelation('attacks_through', []))

    engine.relations.set('turn', makeRelation('turn', []))

    engine.registerResolver(new TurnResolver(mz))
    engine.registerResolver(new OccupiesResolver(mz))
    engine.registerResolver(new AttacksResolver(mz))
    engine.registerResolver(new AttacksResolver(mz))
    engine.registerResolver(new AttacksThroughResolver(mz))
    engine.registerResolver(new Attacks2Resolver(mz))
    engine.registerResolver(new LegalMoveResolver(mz))
    engine.registerResolver(new AfterMoveResolver(mz))

    engine.registerResolver(new RecapturesResolver(mz))
    engine.registerResolver(new CapturesResolver())
    engine.registerResolver(new ChecksResolver())
    engine.registerResolver(new UncapturableChecksResolver())
    engine.registerResolver(new UnblockableChecksResolver())

    engine.registerResolver(new CheckAttackJoinResolver())
    engine.registerResolver(new CheckmatesResolver())

    engine.registerResolver(new ExpandCapturesResolver())
    engine.registerResolver(new ExpandChecksResolver())
    engine.registerResolver(new ExpandBlockChecksResolver())


    engine.relations.set('attackers', makeRelation('attackers', []))
    engine.relations.set('defenders', makeRelation('defenders', []))

    engine.registerResolver(new AttackersDefendersResolver())


    engine.relations.set('forced_capture_target', makeRelation('forced_capture_target', []))
    engine.relations.set('forced_blocks', makeRelation('forced_blocks', []))

    engine.relations.set('baseline_delta', makeRelation('baseline_delta', []))
    engine.relations.set('realizable_delta', makeRelation('realizable_delta', []))

    engine.registerResolver(new ForcedBlockResolver())
    engine.registerResolver(new ForcedCaptureTargetResolver())
    engine.registerResolver(new BaselineDeltaResolver())
    engine.registerResolver(new RealizableDeltaResolver())

    engine.relations.set('baseline_delta_preserved', makeRelation('baseline_delta_preserved', []))

    engine.registerResolver(new BaselineDeltaPreservedResolver(mz))

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

    let rows = engine.relations.get('worlds')!.rows
    rows = engine.relations.get('baseline_delta_preserved')!.rows

    return rows.map(_ => mz.nodes.history_moves(_.world_id))
}
import { PositionC, PositionManager } from "../distill/hopefox_c";
import { NodeId } from "../language1/node_manager";
import { Relation, Row as RelRow } from "./relation_manager";

const gen_row_id = (() => {
    let id = 0
    return () => id++
})()

type Row = {
    id: RowId
    world_id: WorldId
    base: RelRow
}

type Edge = {
    from: NodeId
    to: NodeId
    queue: Row[]
}

interface Node {
    inputs: Edge[]
    outputs: Edge[]
    process(row: Row, input: Edge): void
}

abstract class BaseNode implements Node {
    inputs: Edge[] = []
    outputs: Edge[] = []

    constructor(protected engine: Engine) {}

    protected emit(row: Row) {
        for (const out of this.outputs) {
            this.engine.enqueue(this, out, row)
        }
    }

    abstract process(row: Row, input: Edge): void
}

class ResolveNode extends BaseNode {

    seen: Set<RowId>

    relation: Relation
    world_id_source: WorldId

    process(row: Row, input: Edge) {
        // resolve nodes are usually sources, so this may be empty
    }

    onManagerRow(row: Row) {
        /*
        if (this.seen.has(row.id)) return
        this.seen.add(row.id)
        this.emit(row)
        */
    }
}

class ExpandNode extends BaseNode {
    leftByWorld: Map<WorldId, Row[]> = new Map()
    rightByWorld: Map<WorldId, Row[]> = new Map()
    emitted: Set<RowIdPairKey> = new Set()


    process(row: Row, input: Edge) {
        const is_left = input === this.inputs[0]
        const own = is_left ? this.leftByWorld : this.rightByWorld
        const other = is_left ? this.rightByWorld : this.leftByWorld


        const arr = own.get(row.world_id) ?? []
        arr.push(row)
        own.set(row.world_id, arr)


        const matches = other.get(row.world_id)
        if (!matches) return

        for (const r of matches) {
            const a = is_left ? row: r
            const b = is_left ? r : row
            const key: RowIdPairKey = `${a.id}:${b.id}`

            if (this.emitted.has(key)) {
                continue
            }

            this.emitted.add(key)

            this.emit({
                id: gen_row_id(),
                world_id: b.world_id,
                base: new Map([...a.base, ...b.base])
            })
        }
    }
}

type WorldId = NodeId
type Value = number
type RowId = number

type RowIdPairKey = `${RowId}:${RowId}`

class JoinNode extends BaseNode {
    leftIndex: Map<Value, Row[]> = new Map()
    rightIndex: Map<Value, Row[]> = new Map()
    emitted: Set<RowIdPairKey> = new Set()

    constructor(
        engine: Engine,
        private left_key: string,
        private right_key: string) {
            super(engine)
        }


        process(row: Row, input: Edge) {
            const is_left = input === this.inputs[0]
            const key = row.base.get(is_left ? this.left_key : this.right_key)!

            const own = is_left ? this.leftIndex : this.rightIndex
            const other = is_left ? this.rightIndex : this.leftIndex


            const arr = own.get(key) ?? []
            arr.push(row)
            own.set(key, arr)

            const matches = other.get(key)
            if (!matches) {
                return
            }

            for (const r of matches) {
                const a = is_left ? row : r
                const b = is_left ? r : row
                const key: RowIdPairKey = `${a.id}:${b.id}`

                if (this.emitted.has(key)) {
                    continue
                }

                this.emitted.add(key)

                this.emit({
                    id: gen_row_id(),
                    world_id: a.world_id,
                    base: new Map([...a.base, ...b.base])
                })
            }
        }
}

class FilterNode extends BaseNode {
    constructor(engine: Engine, private on: (row: Row) => boolean) {
        super(engine)
    }

    process(row: Row) {
        if (this.on(row)) {
            this.emit(row)
        }
    }
}

class Move extends BaseNode {
    process(row: Row) {

    }
}

class EmitNode extends BaseNode {
    results: Row[] = []

    process(row: Row) {
        this.results.push(row)
    }
}


type T = {
    node: Node
    row: Row
    edge: Edge
}

class Engine {

    queue: T[]

    enqueue(node: Node, edge: Edge, row: Row) {
        this.queue.push({ node, edge, row })
    }

    run() {
        while (this.queue.length > 0) {
            let event = this.queue.pop()!
            event.node.process(event.row, event.edge)
        }
    }
}

export function Search6(m: PositionManager, pos: PositionC, rules: string) {

    let engine = new Engine()

    let emit = build_graph_by_rules(engine, rules, m, pos)

    engine.run()

    return emit.results
}

function build_graph_by_rules(engine: Engine, rules: string, m: PositionManager, pos: PositionC): EmitNode {





}
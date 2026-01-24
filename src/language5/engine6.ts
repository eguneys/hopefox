import { ColorC, KING, move_c_to_Move, MoveC, piece_c_color_of, piece_c_type_of, PieceC, PieceTypeC, PositionC, PositionManager } from "../distill/hopefox_c";
import { Square } from "../distill/types";
import { NodeId, NodeManager } from "../language1/node_manager";

type ChecksRow = {

}

type AttacksRow = {
    world_id: WorldId
    from: Square
    to: Square
}



type OccupiesRow = {
    world_id: WorldId
    on: Square
    piece: PieceC
    role: PieceTypeC
    color: ColorC
}

type WorldRow = {
    world_id: WorldId
    depth: number
}

type MoveRow = {
    world_id: WorldId
    move: MoveC
}

type Row = WorldRow | MoveRow | OccupiesRow | AttacksRow | ChecksRow

const gen_row_id = (() => {
    let id = 0
    return () => id++
})()

type WorldId = NodeId
type Value = number
type RowId = number

type RowIdPairKey = `${RowId}:${RowId}`



class RelationNode<T extends Row> {

    rows: T[] = []

    add(row: T) {
        this.rows.push(row)
    }
}


abstract class ResolverNode<A extends Row, B extends Row> {
    input: RelationNode<A>
    output: RelationNode<B>

    cursor = 0

    step(): boolean {
        if (this.cursor >= this.input.rows.length) return false


        const row = this.input.rows[this.cursor++]
        const produced = this.resolve(row)

        for (const r of produced) {
            this.output.add(r)
        }

        return produced.length > 0
    }

    abstract resolve(row: A): B[]
}

class MoveCandidatesRelation extends RelationNode<MoveRow> {

}

class WorldRelation extends RelationNode<WorldRow> {

}

let worldRelation = new RelationNode<WorldRow>()

const moveCandidates = new RelationNode<MoveRow>()

const attacksRelation = new RelationNode<AttacksRow>()

const occupiesRelation = new RelationNode<OccupiesRow>()

const checksRelation = new RelationNode<ChecksRow>()

class WorldCommitResolver extends ResolverNode<MoveRow, WorldRow> {

    input = moveCandidates
    output = worldRelation

    constructor(private mz: PositionMaterializer) {
        super()
    }

    resolve(row: MoveRow): WorldRow[] {

        return []
    }

}

class MoveResolver extends ResolverNode<WorldRow, MoveRow> {

    input = worldRelation
    output = moveCandidates

    m: PositionMaterializer

    constructor(m: PositionMaterializer) {
        super()
        this.m = m
    }

    resolve(row: WorldRow): MoveRow[] {
        
        let res = []

        let depth = row.depth
        let world_id = row.world_id
        this.m.make_to_world(world_id)

        for (let move of this.m.m.get_legal_moves(this.m.pos)) {
            res.push({
                world_id,
                depth,
                move
            })
        }

        this.m.unmake_world(world_id)
        return res
    }

}

class OccupiesResolver extends ResolverNode<WorldRow, OccupiesRow> {

    input = worldRelation
    output = occupiesRelation

    m: PositionMaterializer

    constructor(m: PositionMaterializer) {
        super()
        this.m = m
    }

    resolve(row: WorldRow): OccupiesRow[] {
        
        let res = []

        let world_id = row.world_id
        this.m.make_to_world(world_id)

        let occ = this.m.m.pos_occupied(this.m.pos)

        for (let on of occ) {
            let piece = this.m.m.get_at(this.m.pos, on)!
            let role = piece_c_type_of(piece)
            let color = piece_c_color_of(piece)

            res.push({
                world_id,
                on,
                piece,
                role,
                color
            })
        }

        this.m.unmake_world(world_id)
        return res
    }

}



class AttackResolver extends ResolverNode<WorldRow, AttacksRow> {

    input = worldRelation
    output = attacksRelation

    m: PositionMaterializer

    constructor(m: PositionMaterializer) {
        super()
        this.m = m
    }

    resolve(row: WorldRow): AttacksRow[] {
        
        let res = []

        let world_id = row.world_id
        this.m.make_to_world(world_id)

        let occ = this.m.m.pos_occupied(this.m.pos)

        for (let on of occ) {
            let aa = this.m.m.pos_attacks(this.m.pos, on)
            for (let a of aa) {
                res.push({
                    world_id,
                    from: on,
                    to: a
                })
            }
        }

        this.m.unmake_world(world_id)
        return res
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
        for (let i = moves.length - 1; i > 0; i--) {
            this.m.unmake_move(this.pos, moves[i])
        }
    }

}

class JoinNode<A extends Row, B extends Row, C extends Row> {
    left: RelationNode<A>
    right: RelationNode<B>
    output: RelationNode<C>
    predicate: (a: A, b: B) => C | undefined

    constructor(left: RelationNode<A>, right: RelationNode<B>, output: RelationNode<C>, predicate: (a: A, b: B) => C | undefined) {

        this.left = left
        this.right = right
        this.output = output
        this.predicate = predicate
    }

    leftSeen = 0
    rightSeen = 0

    step(): boolean {
        let progressed = false

        while (this.leftSeen < this.left.rows.length) {
            const a = this.left.rows[this.leftSeen++]
            for (const b of this.right.rows) {
                let c = this.predicate(a, b)
                if (c !== undefined) {
                    this.output.add(c)
                    progressed = true
                }
            }
        }

        while (this.rightSeen < this.right.rows.length) {
            const a = this.right.rows[this.rightSeen++]
            for (const b of this.left.rows) {
                let c = this.predicate(b, a)
                if (c !== undefined) {
                    this.output.add(c)
                    progressed = true
                }
            }
        }

        return progressed
    }
}



const checkJoin = new JoinNode(
    attacksRelation,
    occupiesRelation,
    checksRelation,
    (attack, occ) =>
        attack.world_id === occ.world_id &&
            attack.to === occ.on &&
            occ.role === KING ? (() => ({

            }))() : undefined)



class Engine {

    nodes: { step(): boolean }[] = []


    add(node: { step(): boolean }) {
        this.nodes.push(node)
    }

    run() {
        let progressed
        do {
            progressed = false
            for (const n of this.nodes) {
                if (n.step()) progressed = true
            }
        } while (progressed)
    }
}

export function Search6(m: PositionManager, pos: PositionC, rules: string) {

    let engine = new Engine()
    let mz = new PositionMaterializer(m, pos)

    engine.add(new MoveResolver(mz))
    engine.add(new WorldCommitResolver(mz))
    engine.add(new AttackResolver(mz))
    engine.add(new OccupiesResolver(mz))
    engine.add(checkJoin)

    worldRelation.add({
        world_id: 0,
        depth: 0
    })

    engine.run()


    return worldRelation.rows
}
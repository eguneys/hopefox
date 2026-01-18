import { ColorC, PieceTypeC, PositionC, PositionManager } from "../distill/hopefox_c"
import { Square } from "../distill/types"
import { NodeId, NodeManager } from "../language1/node_manager"
import { BaseRow, RelationManager } from "./relation_manager"


export type Legals = BaseRow & {
    from: Square
    to: Square
}
export type Attacks = BaseRow & {
    from: Square
    to: Square
}
export type Attacks2 = BaseRow & {
    from: Square
    to: Square
    to2: Square
}
export type Occupies = BaseRow & {
    on: Square
    piece: PieceTypeC
    color: ColorC
}

export type Captures = BaseRow & {
    from: Square
    to: Square
}
export type Checks = BaseRow & {
    from: Square
    to: Square
    to2: Square
}

export type Forks = BaseRow & {
    from: Square
    to: Square
    a: Square
    b: Square
}

export type Evades = BaseRow & {
    from: Square
    to: Square
}

type Row =
    | Legals
    | Attacks
    | Attacks2
    | Occupies
    | Captures
    | Checks
    | Forks
    | Evades



enum MaterializeState {
    Materializing,
    Complete
}

export class Rs {

    nodes: NodeManager
    m: PositionManager
    pos: PositionC

    legals: StatefulRelationManager<Legals>
    attacks: StatefulRelationManager<Attacks>
    attacks2: StatefulRelationManager<Attacks2>
    occupies: StatefulRelationManager<Occupies>
    captures: StatefulRelationManager<Captures>
    checks: StatefulRelationManager<Checks>
    forks: StatefulRelationManager<Forks>
    evades: StatefulRelationManager<Evades>

    constructor() {
        this.legals = new StatefulRelationManager(this, materialize_legals)
        this.attacks = new StatefulRelationManager(this, materialize_attacks)
        this.attacks2 = new StatefulRelationManager(this, materialize_attacks2)
        this.occupies = new StatefulRelationManager(this, materialize_occupies)
        this.captures = new StatefulRelationManager(this, materialize_captures)
        this.checks = new StatefulRelationManager(this, materialize_checks)
        this.forks = new StatefulRelationManager(this, materialize_forks)
        this.evades = new StatefulRelationManager(this, materialize_evades)
    }

    step() {
        this.legals.step()
        this.attacks.step()
        this.attacks2.step()
        this.occupies.step()
        this.captures.step()
        this.checks.step()
        this.forks.step()
        this.evades.step()
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
type WorldId = NodeId

export class StatefulRelationManager<T extends Row> {
    public states: Map<WorldId, MaterializeState>
    public relation: RelationManager<T>

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

        for (let [world_id, state] of this.states) {
            if (state === MaterializeState.Materializing) {
                let complete = this.fn(world_id, this.Rs)
                if (complete) {
                    this.states.set(world_id, MaterializeState.Complete)
                }

            }
        }
    }
}

function materialize_legals(world_id: WorldId, Rs: Rs): boolean {
    return true
}

function materialize_attacks(world_id: WorldId, Rs: Rs): boolean {
    throw new Error("Function not implemented.")
}

function materialize_attacks2(world_id: WorldId, Rs: Rs): boolean {
    throw new Error("Function not implemented.")
}



function materialize_occupies(world_id: WorldId, Rs: Rs): boolean {
    throw new Error("Function not implemented.")
}
function materialize_checks(world_id: WorldId, Rs: Rs): boolean {
    throw new Error("Function not implemented.")
}
function materialize_captures(world_id: WorldId, Rs: Rs): boolean {
    throw new Error("Function not implemented.")
}
function materialize_evades(world_id: WorldId, Rs: Rs): boolean {
    throw new Error("Function not implemented.")
}




function materialize_forks(world_id: WorldId, Rs: Rs): boolean {
    throw new Error("Function not implemented.")
}
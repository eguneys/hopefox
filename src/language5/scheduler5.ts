import { ColorC, PieceTypeC } from "../distill/hopefox_c"
import { Square } from "../distill/types"
import { NodeId } from "../language1/node_manager"
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
    None,
    Materializing,
    Complete
}

export class Rs {

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
}

type MaterializeFn = <T extends Row>(r: StatefulRelationManager<T>) => boolean
type WorldId = NodeId

export class StatefulRelationManager<T extends Row> {
    public state: MaterializeState
    public relation: RelationManager<T>

    private fn: MaterializeFn
    private Rs: Rs

    private nb_used: number

    constructor(Rs: Rs, fn: MaterializeFn) {
        this.relation = new RelationManager()
        this.state = MaterializeState.None
        this.fn = fn
        this.Rs = Rs

        this.nb_used = 0
    }

    get(world_id: WorldId) {
        if (this.state === MaterializeState.Complete) {
            this.nb_used++
            return this.relation.get_relation_starting_at_world_id(world_id)
        }
        if (this.state === MaterializeState.None) {
            this.state = MaterializeState.Materializing
        }
    }

    step() {

        if (this.state === MaterializeState.Materializing) {
            let complete = this.fn(this)
            if (complete) {
                this.state = MaterializeState.Complete
            }
        }
    }
}

function materialize_legals<T extends Row>(r: StatefulRelationManager<T>): boolean {
    throw new Error("Function not implemented.")
}

function materialize_attacks<T extends Row>(r: StatefulRelationManager<T>): boolean {
    throw new Error("Function not implemented.")
}

function materialize_attacks2<T extends Row>(r: StatefulRelationManager<T>): boolean {
    throw new Error("Function not implemented.")
}



function materialize_occupies<T extends Row>(r: StatefulRelationManager<T>): boolean {
    throw new Error("Function not implemented.")
}
function materialize_checks<T extends Row>(r: StatefulRelationManager<T>): boolean {
    throw new Error("Function not implemented.")
}
function materialize_captures<T extends Row>(r: StatefulRelationManager<T>): boolean {
    throw new Error("Function not implemented.")
}
function materialize_evades<T extends Row>(r: StatefulRelationManager<T>): boolean {
    throw new Error("Function not implemented.")
}




function materialize_forks<T extends Row>(r: StatefulRelationManager<T>): boolean {
    throw new Error("Function not implemented.")
}
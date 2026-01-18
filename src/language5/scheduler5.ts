import { ColorC, PieceTypeC } from "../distill/hopefox_c"
import { Square } from "../distill/types"
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
        this.legals = new StatefulRelationManager()
        this.attacks = new StatefulRelationManager()
        this.attacks2 = new StatefulRelationManager()
        this.occupies = new StatefulRelationManager()
        this.captures = new StatefulRelationManager()
        this.checks = new StatefulRelationManager()
        this.forks = new StatefulRelationManager()
        this.evades = new StatefulRelationManager()
    }
}

export class StatefulRelationManager<T extends Row> {
    public state: MaterializeState
    public relation: RelationManager<T>

    constructor() {
        this.relation = new RelationManager()
        this.state = MaterializeState.None
    }
}


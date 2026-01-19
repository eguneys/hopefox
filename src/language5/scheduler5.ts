import { between } from "../distill/attacks"
import { ColorC, make_move_from_to, move_c_to_Move, MoveC, piece_c_color_of, piece_c_type_of, PieceTypeC, PositionC, PositionManager } from "../distill/hopefox_c"
import { SquareSet } from "../distill/squareSet"
import { Square } from "../distill/types"
import { NodeId, NodeManager } from "../language1/node_manager"
import { BaseRow, join, Relation, RelationManager, select, semiJoin } from "./relation_manager"

export type AttackThroughs2 = BaseRow & {
    from: Square
    to: Square
    to2: Square
    to3: Square
}
export type Unevadable = BaseRow & {
    from: Square
    to: Square
    to2: Square
    to3: Square
}
export type Uncapturable = BaseRow & {
    from: Square
    to: Square
}
export type Unblockable = BaseRow & {
    from: Square
    to: Square
    to2: Square
}

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
    piece: PieceTypeC
    color: ColorC
    to_piece: PieceTypeC
    to_color: ColorC
}
export type Checks = BaseRow & {
    from: Square
    to: Square
    to2: Square
    piece: PieceTypeC
    color: ColorC
    to_piece: PieceTypeC
    to_color: ColorC
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

export type Row =
    | Legals
    | Attacks
    | Attacks2
    | Occupies
    | Captures
    | Checks
    | Forks
    | Evades
    | Unevadable
    | Uncapturable
    | Unblockable
    | AttackThroughs2


export type FromTo = { from: Square, to: Square } & BaseRow

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
    unblockables: StatefulRelationManager<Unblockable>
    uncapturables: StatefulRelationManager<Uncapturable>
    unevadables: StatefulRelationManager<Unevadable>
    attack_throughs2: StatefulRelationManager<AttackThroughs2>

    constructor(m: PositionManager, pos: PositionC) {
        this.m = m
        this.pos = pos
        this.nodes = new NodeManager()

        this.legals = new StatefulRelationManager(this, materialize_legals)
        this.attacks = new StatefulRelationManager(this, materialize_attacks)
        this.attacks2 = new StatefulRelationManager(this, materialize_attacks2)
        this.occupies = new StatefulRelationManager(this, materialize_occupies)
        this.captures = new StatefulRelationManager(this, materialize_captures)
        this.checks = new StatefulRelationManager(this, materialize_checks)
        this.forks = new StatefulRelationManager(this, materialize_forks)
        this.evades = new StatefulRelationManager(this, materialize_evades)
        this.attack_throughs2 = new StatefulRelationManager(this, materialize_attack_throughs2)

        this.unblockables = new StatefulRelationManager(this, materialize_unblockables)
        this.uncapturables = new StatefulRelationManager(this, materialize_uncapturables)
        this.unevadables = new StatefulRelationManager(this, materialize_unevadables)
    }

    run() {
        let there_is_more
        do  {
            there_is_more = false
            there_is_more ||= this.legals.step()
            there_is_more ||= this.attacks.step()
            there_is_more ||= this.attacks2.step()
            there_is_more ||= this.occupies.step()
            there_is_more ||= this.captures.step()
            there_is_more ||= this.checks.step()
            there_is_more ||= this.forks.step()
            there_is_more ||= this.evades.step()
            there_is_more ||= this.unblockables.step()
            there_is_more ||= this.unevadables.step()
            there_is_more ||= this.uncapturables.step()
            there_is_more ||= this.attack_throughs2.step()
        } while (there_is_more)
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
export type WorldId = NodeId

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
        let there_is_more = false

        for (let [world_id, state] of this.states) {
            if (state === MaterializeState.Materializing) {
                let complete = this.fn(world_id, this.Rs)
                if (complete) {
                    this.states.set(world_id, MaterializeState.Complete)
                } else {
                    there_is_more = true
                }
            }
        }
        return there_is_more
    }
}

function materialize_legals(world_id: WorldId, Rs: Rs): boolean {
    Rs.make_moves_to_world(world_id)

    for (let move of Rs.m.get_legal_moves(Rs.pos)) {
        let { from, to } = move_c_to_Move(move)
        let end_world_id = Rs.nodes.add_move(world_id, move)
        Rs.legals.relation.add_row({
            start_world_id: world_id,
            end_world_id: end_world_id,
            from,
            to
        })
    }

    Rs.unmake_moves_to_base(world_id)
    return true
}

const FullSquares = SquareSet.full()
function materialize_attacks(world_id: WorldId, Rs: Rs): boolean {
    Rs.make_moves_to_world(world_id)

    let end_world_id = world_id
    for (let on of FullSquares) {
        let piece = Rs.m.get_at(Rs.pos, on)
        if (piece) {
            let aa = Rs.m.pos_attacks(Rs.pos, on)
            for (let a of aa) {
                Rs.attacks.relation.add_row({
                    start_world_id: world_id,
                    end_world_id: end_world_id,
                    from: on,
                    to: a
                })
            }
        }
    }

    Rs.unmake_moves_to_base(world_id)
    return true
}

function materialize_attacks2(world_id: WorldId, Rs: Rs): boolean {
    Rs.make_moves_to_world(world_id)
    let end_world_id = world_id
    let occupied = Rs.m.pos_occupied(Rs.pos)
    for (let on of FullSquares) {
        let piece = Rs.m.get_at(Rs.pos, on)
        if (piece) {
            let aa = Rs.m.pos_attacks(Rs.pos, on)
            for (let a of aa) {
                let aa2 = Rs.m.attacks(piece, a, occupied.without(on))
                for (let a2 of aa2) {
                    Rs.attacks2.relation.add_row({
                        start_world_id: world_id,
                        end_world_id: end_world_id,
                        from: on,
                        to: a,
                        to2: a2
                    })
                }
            }
        }
    }

    Rs.unmake_moves_to_base(world_id)
    return true
}


function materialize_attack_throughs2(world_id: WorldId, Rs: Rs): boolean {
    Rs.make_moves_to_world(world_id)
    let end_world_id = world_id
    let occupied = Rs.m.pos_occupied(Rs.pos)
    for (let on of FullSquares) {
        let piece = Rs.m.get_at(Rs.pos, on)
        if (piece) {
            let aa = Rs.m.pos_attacks(Rs.pos, on)
            for (let a of aa) {
                let aa2 = Rs.m.attacks(piece, a, occupied.without(on))
                for (let a2 of aa2) {

                    let piece2 = Rs.m.get_at(Rs.pos, a2)

                    if (piece2) {
                        let aa3 = Rs.m.attacks(piece, a, occupied.without(on).without(a2))
                        aa3 = aa3.diff(aa2)

                        for (let a3 of aa3) {
                            Rs.attack_throughs2.relation.add_row({
                                start_world_id: world_id,
                                end_world_id: end_world_id,
                                from: on,
                                to: a,
                                to2: a2,
                                to3: a3
                            })
                        }
                    }
                }
            }
        }
    }

    Rs.unmake_moves_to_base(world_id)
    return true
}


function materialize_occupies(world_id: WorldId, Rs: Rs): boolean {
    Rs.make_moves_to_world(world_id)

    let end_world_id = world_id
    for (let on of FullSquares) {
        let piece = Rs.m.get_at(Rs.pos, on)
        if (piece) {
            Rs.occupies.relation.add_row({
                start_world_id: world_id,
                end_world_id: end_world_id,
                on,
                piece: piece_c_type_of(piece),
                color: piece_c_color_of(piece)
            })
        }
    }

    Rs.unmake_moves_to_base(world_id)
    return true
}


function materialize_checks(world_id: WorldId, Rs: Rs): boolean {
    let occupies = Rs.occupies.get(world_id)
    if (!occupies) {
        return false
    }
    let attacks2 = Rs.attacks2.get(world_id)
    if (!attacks2) {
        return false
    }
    let _ = join(attacks2, occupies, (a2, occ) =>
        a2.from === occ.on ? {
            start_world_id: a2.start_world_id,
            end_world_id: a2.end_world_id,
            from: a2.from,
            to: a2.to,
            to2: a2.to2,
            piece: occ.piece,
            color: occ.color
        } : null
    )

    let res: Relation<Checks> = join(_, occupies, (a2, occ) =>
        a2.to2 === occ.on ? {
            start_world_id: a2.start_world_id,
            end_world_id: a2.end_world_id,
            from: a2.from,
            to: a2.to,
            to2: a2.to2,
            piece: a2.piece,
            color: a2.color,
            to_piece: occ.piece,
            to_color: occ.color

        } : null
    )

    Rs.checks.relation.add_rows(world_id, res.rows)
    return true
}

function materialize_captures(world_id: WorldId, Rs: Rs): boolean {
    let occupies = Rs.occupies.get(world_id)
    if (!occupies) {
        return false
    }
    let attacks = Rs.attacks.get(world_id)
    if (!attacks) {
        return false
    }

    let _ = join(attacks, occupies, (a, occ) =>
        a.from === occ.on ? {
            start_world_id: a.start_world_id,
            end_world_id: a.end_world_id,
            from: a.from,
            to: a.to,
            piece: occ.piece,
            color: occ.color
        } : null
    )

    let res = join(_, occupies, (_, occ) =>
        _.to === occ.on ? {
            start_world_id: _.start_world_id,
            end_world_id: _.end_world_id,
            from: _.from,
            to: _.to,
            piece: _.piece,
            color: _.color,
            to_piece: occ.piece,
            to_color: occ.color
        } : null
    )

    Rs.captures.relation.add_rows(world_id, res.rows)
    return true
}
function materialize_evades(world_id: WorldId, Rs: Rs): boolean {
    throw new Error("Function not implemented.")
}
function materialize_forks(world_id: WorldId, Rs: Rs): boolean {
    throw new Error("Function not implemented.")
}
function materialize_unblockables(world_id: WorldId, Rs: Rs): boolean {
    let attacks = Rs.attacks.get(world_id)
    if (!attacks) {
        return false
    }

    let attacks2 = Rs.attacks2.get(world_id)
    if (!attacks2) {
        return false
    }

    let res = anti_join(attacks2, attacks, (a2, a) =>
        between(a2.to, a2.to2).has(a.to)
    )

    Rs.unblockables.relation.add_rows(world_id, res.rows)
    return true
}
function materialize_uncapturables(world_id: WorldId, Rs: Rs): boolean {
    let attacks = Rs.attacks.get(world_id)
    if (!attacks) {
        return false
    }

    let res = anti_join(attacks, attacks, (a, c) =>
        a.to === c.to
    )

    Rs.uncapturables.relation.add_rows(world_id, res.rows)
    return true
}

function materialize_unevadables(world_id: WorldId, Rs: Rs): boolean {
    let attacks = Rs.attacks.get(world_id)
    if (!attacks) {
        return false
    }

    let athru2 = Rs.attack_throughs2.get(world_id)
    if (!athru2) {
        return false
    }

    let _ = semiJoin(attacks, athru2, (a, a2) => a.from === a2.to2)

    let res = anti_join(athru2, _, (a2, a) =>
        between(a2.to, a2.to3).has(a.to)
    )

    Rs.unevadables.relation.add_rows(world_id, res.rows)
    return true
}

function anti_join<Row extends BaseRow, RowB extends BaseRow>(a: Relation<Row>, b: Relation<RowB>, predicate: (a: Row, b: RowB) => boolean): Relation<Row> {
    return {
        rows: a.rows.filter(ra =>
            b.rows.every(rb => !predicate(ra, rb))
        )
    }
}
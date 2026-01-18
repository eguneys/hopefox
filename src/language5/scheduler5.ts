import { ColorC, make_move_from_to, move_c_to_Move, MoveC, piece_c_color_of, piece_c_type_of, PieceTypeC, PositionC, PositionManager } from "../distill/hopefox_c"
import { SquareSet } from "../distill/squareSet"
import { Square } from "../distill/types"
import { NodeId, NodeManager } from "../language1/node_manager"
import { BaseRow, join, Relation, RelationManager, select } from "./relation_manager"

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

type Row =
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


type FromTo = { from: Square, to: Square } & BaseRow

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
        this.unblockables = new StatefulRelationManager(this, materialize_unblockables)
        this.uncapturables = new StatefulRelationManager(this, materialize_uncapturables)
        this.unevadables = new StatefulRelationManager(this, materialize_unevadables)
        this.attack_throughs2 = new StatefulRelationManager(this, materialize_attack_throughs2)
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
    throw new Error("Function not implemented.")
}
function materialize_uncapturables(world_id: WorldId, Rs: Rs): boolean {
    throw new Error("Function not implemented.")
}
function materialize_unevadables(world_id: WorldId, Rs: Rs): boolean {
    throw new Error("Function not implemented.")
}
function materialize_attack_throughs2(world_id: WorldId, Rs: Rs): boolean {
    throw new Error("Function not implemented.")
}




interface Constraint {
    requires(Rs: Rs, world_id: WorldId): boolean
    applies_to(Rs: Rs, move: FromTo, world_id: WorldId): boolean
    subsumes(b: Constraint): boolean
}

type Query = {
    world_id: WorldId
    constraints: Constraint[]
}

function baseQuery(world: WorldId): Query {
    return {
        world_id: world,
        constraints: [],
    }
}

function refine(q: Query, c: Constraint): Query {
    return {
        world_id: q.world_id,
        constraints: [...q.constraints, c]
    }
}

function evaluate(Rs: Rs, q: Query): Relation<FromTo> | undefined {
    let moves = legalMoves(Rs, q.world_id)
    if (!moves) {
        return undefined
    }

    for (let c of q.constraints) {
        if (c.requires(Rs, q.world_id)) {
            return undefined
        }
        moves = select(moves, m => c.applies_to(Rs, m, q.world_id))
        if (is_empty(moves)) {
            break
        }
    }
    return moves
}

function is_empty(R: Relation<Row>) {
    return R.rows.length === 0
}
function legalMoves(Rs: Rs, world_id: WorldId) {
    return Rs.legals.get(world_id)
}

type Candidate = {
    move: FromTo
    forcing: number
    replyConstraints: Constraint[]
}


function liftReplyConstraints(Rs: Rs, move: Row): Constraint[] {
    let cs: Constraint[] = []


    return cs
}

function analyzeMove(Rs: Rs, world_id: WorldId, move: FromTo): Candidate {

    let replyConstraints = liftReplyConstraints(Rs, move)

    let nextWorldId = move.end_world_id
    let nextQuery = baseQuery(nextWorldId)

    for (let c of replyConstraints) {
        nextQuery = refine(nextQuery, c)
    }

    let replies = evaluate(Rs, nextQuery)
    while (replies === undefined) {
        Rs.run()
        replies = evaluate(Rs, nextQuery)
    }
    let forcing = replies.rows.length === 0 ? Infinity : 1 / replies.rows.length

    return {
        move,
        forcing,
        replyConstraints
    }
}

const MAX_DEPTH = 3
export function search5(m: PositionManager, pos: PositionC) {
    let rs = new Rs(m, pos)
    return search(rs, 0, baseQuery(0), 1)
}

export function searchWithPv(Rs: Rs, world_id: WorldId, depth = 0) {
    let rootQuery = baseQuery(world_id)


    let moves = evaluate(Rs, rootQuery)

    if (depth > 1 && rootQuery.constraints.length === 0) {
        //return { score: 0, pv: [] }
    }

    while (moves === undefined) {
        Rs.run()
        moves = evaluate(Rs, rootQuery)
    }

    let candidates = moves.rows.map(m => analyzeMove(Rs, world_id, m))
    candidates.sort((a, b) => b.forcing - a.forcing)

    let bestScore = -Infinity
    let bestMove = null

    for (let c of candidates) {
        let nextWorldId = c.move.end_world_id

        let nextQuery = baseQuery(nextWorldId)

        for (let rc of c.replyConstraints) {
            nextQuery = refine(nextQuery, rc)
        }


        let score = -search(Rs, nextWorldId, nextQuery, depth + 1)

        if (score > bestScore) {
            bestScore = score
            bestMove = c.move
        }
    }

    let pv: MoveC[] = []
    if (bestMove) {
        pv.push(make_move_from_to(bestMove.from, bestMove.to))
        pv.push(...reconstructPV(Rs, world_id, make_move_from_to(bestMove.from, bestMove.to), depth + 1))
    }

    return { score: bestScore, pv }
}

function reconstructPV(Rs: Rs, world_id: WorldId, move: MoveC, depth: number): MoveC[] {
    if (depth === MAX_DEPTH) {
        return []
    }


    

    let nextWorldId = Rs.nodes.add_move(world_id, move)
    let query = baseQuery(nextWorldId)

    if (depth > 1 && query.constraints.length === 0) {
        //return []
    }

    let moves = evaluate(Rs, query)
    while (moves === undefined) {
        Rs.run()
        moves = evaluate(Rs, query)
    }

    let candidates = moves.rows.map(m => analyzeMove(Rs, world_id, m))
    candidates.sort((a, b) => b.forcing - a.forcing)

    if (candidates.length === 0) return []

    let best = make_move_from_to(candidates[0].move.from, candidates[0].move.to)

    return [best, ...reconstructPV(Rs, nextWorldId, best, depth + 1)]

}

function search(Rs: Rs, world_id: WorldId, query: Query, depth: number) {

    if (depth === MAX_DEPTH) {
        return 0
    }

    let moves = evaluate(Rs, query)
    while (moves === undefined) {
        Rs.run()
        moves = evaluate(Rs, query)
    }

    if (moves.rows.length === 0) {
        return - Infinity
    }

    let candidates = moves.rows.map(m => analyzeMove(Rs, world_id, m))

    candidates.sort((a, b) => b.forcing - a.forcing)

    let best = -Infinity

    for (let c of candidates) {
        let nextWorldId = c.move.end_world_id

        let nextQuery = baseQuery(nextWorldId)

        for (let rc of c.replyConstraints) {
            nextQuery = refine(nextQuery, rc)
        }


        let score = -search(Rs, nextWorldId, nextQuery, depth + 1)

        best = Math.max(best, score)
    }
    return best
}


function MateQuery(world_id: WorldId): Query {

    return {
        world_id,
        constraints: [
            new ChecksKingConstraint(),
            new UnblockableConstraint(),
            new UncapturableConstraint(),
            new UnevadableConstraint()
        ]
    }
}


class UnevadableConstraint implements Constraint {

    requires(Rs: Rs, world_id: WorldId) {
        return Rs.checks.get(world_id) === undefined
    }

    applies_to(Rs: Rs, move: FromTo, world_id: WorldId) {
        return !is_empty(select(Rs.checks.get(world_id)!, (r) => r.from === move.from && r.to === move.to))
    }

    subsumes(b: Constraint) {
        return b instanceof UnevadableConstraint
    }
}



class UncapturableConstraint implements Constraint {

    requires(Rs: Rs, world_id: WorldId) {
        return false
    }

    applies_to(Rs: Rs, move: FromTo, world_id: WorldId) {
        return !is_empty(select(Rs.checks.get(world_id)!, (r) => r.from === move.from && r.to === move.to))
    }

    subsumes(b: Constraint) {
        return b instanceof UncapturableConstraint
    }
}



class UnblockableConstraint implements Constraint {

    requires(Rs: Rs, world_id: WorldId) {
        return false
    }


    applies_to(Rs: Rs, move: FromTo, world_id: WorldId) {
        return !is_empty(select(Rs.checks.get(world_id)!, (r) => r.from === move.from && r.to === move.to))
    }

    subsumes(b: Constraint) {
        return b instanceof UnblockableConstraint
    }
}



class ChecksKingConstraint implements Constraint {
    requires(Rs: Rs, world_id: WorldId) {
        return false
    }



    applies_to(Rs: Rs, move: FromTo, world_id: WorldId) {
        return !is_empty(select(Rs.checks.get(world_id)!, (r) => r.from === move.from && r.to === move.to))
    }

    subsumes(b: Constraint) {
        return b instanceof ChecksKingConstraint
    }
}

class Conjunction implements Constraint {
    a: Constraint
    b: Constraint

    constructor(a: Constraint, b: Constraint) {
        this.a = a
        this.b = b

    }

    requires(Rs: Rs, world_id: WorldId) {
        return false
    }

    applies_to(Rs: Rs, move: FromTo, world_id: WorldId) {
        return this.a.applies_to(Rs, move, world_id) && this.b.applies_to(Rs, move, world_id)
    }

    subsumes(b: Constraint) {
        return this.a.subsumes(b) && this.b.subsumes(b)
    }
}
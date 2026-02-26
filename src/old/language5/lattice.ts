import { make_move_from_to, MoveC, PositionC, PositionManager } from '../distill/hopefox_c'
import { Relation, select } from './relation_manager'
import { FromTo, Row, Rs, WorldId } from './scheduler5'


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

const MAX_DEPTH = 4
export function search5(m: PositionManager, pos: PositionC) {
    let rs = new Rs(m, pos)
    return search(rs, 0, baseQuery(0), 1)
}

export function searchWithPv(Rs: Rs, world_id: WorldId, depth = 0) {
    let rootQuery = baseQuery(world_id)


    let moves = evaluate(Rs, rootQuery)
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
        return []
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
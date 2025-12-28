'Check a-h Block g Capture a g Recapture x g Recapture y g'

'OpenAttack'; 'OpenKing'

'OpenKing a-h'; 'Check a-h'

'Check a-h'; 'Block g'

'Block a'; 'Capture g a'

'Capture g a'; 'Capture x g'

import { attacks, ray } from "../attacks";
import { Position as CPos } from "../chess";
import { SquareSet } from "../squareSet";
import { Color, Move, Square } from "../types";
import { opposite } from "../util";

export type Position = CPos

export type Ray = SquareSet

export type AttackRays = {
    from: Square
    rays: Ray[]
    all: SquareSet
}

export type HitRay = {
    from: Square
    ray: Ray
}

export type Features = {
    open: Ray[]
    turn_attacks: AttackRays[]
    opposite_attacks: AttackRays[]
    turn_hits: HitRay[]
    opposite_hits: HitRay[]
    turn_defends: HitRay[]
    opposite_defends: HitRay[]
}


export type MoveContext = {
    history: Move[]
    move: Move
}

export type PositionWithFeatures = {
    features: Features
    move_ctx: MoveContext
    after_features: Features
}



function find_features(pos: Position): Features {

    let open = open_rays(pos.board.occupied)
    let turn_attacks = attack_rays(pos, pos.turn)
    let opposite_attacks = attack_rays(pos, opposite(pos.turn))
    let { hits: turn_hits, defends: turn_defends } = hits_and_defends(pos, pos.turn)
    let { hits: opposite_hits, defends: opposite_defends } = hits_and_defends(pos, opposite(pos.turn))

    return {
        open,
        turn_attacks,
        opposite_attacks,
        turn_hits,
        turn_defends,
        opposite_hits,
        opposite_defends
    }
}

function apply_move_context(pos: Position, moves: MoveContext) {

    let p2 = pos.clone()

    moves.history.forEach(_ => p2.play(_))

    p2.play(moves.move)

    return p2
}

function hits_and_defends(pos: Position, color: Color) {
    let hits: HitRay[] = []
    let defends: HitRay[] = []

    for (let from of SquareSet.full()) {
        let piece = pos.board.get(from)
        if (piece && piece.color === color) {
            let aa = attacks(piece, from, pos.board.occupied)

            let x = aa.intersect(pos.board.occupied).singleSquare()

            if (x !== undefined) {
                if (pos.board.get(x)!.color === color) {
                    defends.push({
                        from,
                        ray: aa
                    })
                } else {
                    hits.push({
                        from,
                        ray: aa
                    })
                }
            }
        }
    }
    return { hits, defends }

}

function attack_rays(pos: Position, color: Color) {
    let res: AttackRays[] = []

    for (let from of SquareSet.full()) {
        let piece = pos.board.get(from)
        if (piece && piece.color === color) {

            let rays: Ray[] = []

            let aa = attacks(piece, from, pos.board.occupied)

            for (let a of aa) {
                rays.push(ray(from, a))
            }

            res.push({
                from,
                rays,
                all: aa
            })
        }
    }
    return res
}

function open_rays(occupied: SquareSet) {
    let res: Ray[] = []
    for (let from of SquareSet.full()) {
        for (let to of SquareSet.full()) {
            let a = ray(from, to)
            if (a.isEmpty()) {
                continue
            }

            if (a.intersect(occupied.without(from).without(to)).isEmpty()) {
                res.push(a)
            }
        }
    }
    return res
}
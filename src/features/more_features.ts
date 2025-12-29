import { attacks, ray } from "../attacks";
import { Position as CPos } from "../chess";
import { pos_moves } from "../hopefox";
import { makeSan } from "../san";
import { SquareSet } from "../squareSet";
import { Color, Move, Square } from "../types";
import { opposite } from "../util";

export type Position = CPos

export type Ray = {
    from: Square
    to: Square
    ray: SquareSet
}

export type AttackRays = {
    rays: Ray[]
    all: SquareSet
}

export type PinRay = {
    from: Square
    to: Square
    pinned: Square
    ray: SquareSet
}

export type Features = {
    turn_king: Square
    opposite_king: Square
    turn_pieces: SquareSet
    opposite_pieces: SquareSet
    occupied: SquareSet
    open: Ray[]
    turn_attacks: AttackRays[]
    opposite_attacks: AttackRays[]
    turn_hits: Ray[]
    opposite_hits: Ray[]
    turn_defends: Ray[]
    opposite_defends: Ray[]
    turn_hit_pins: PinRay[]
    opposite_hit_pins: PinRay[]
    turn_defend_pins: PinRay[]
    opposite_defend_pins: PinRay[]
}


export type MoveContext = {
    history: Move[]
    move: Move
}

export type PositionWithFeatures = {
    features: Features
    more_features: MoreFeatures
    move_ctx: MoveContext
    after_features: Features
    after_more_features: MoreFeatures
}

export type MoreFeatures = {
    checks: Check[]
    blocks: Ray[][]
}

export type Check = {
    from: Square
    to: Square
    ray: SquareSet
    to_threaten: Square
}

export function apply_features(pos: Position, pf: PositionWithFeatures): PositionWithFeatures[] {
    let features = pf.after_features
    let more_features = pf.after_more_features
    let history = [...pf.move_ctx.history, pf.move_ctx.move]


    let p2 = apply_moves(pos, history)

    let moves = pos_moves(p2)
    return moves.map(move => {

        let p3 = apply_moves(p2, [move])

        let after_features = find_features(p3)
        let after_more_features = find_more_features(after_features)

        return {
            features,
            more_features,
            move_ctx: { move, history },
            after_features,
            after_more_features
        }
    })
}

export function init_features(pos: Position, move: Move): PositionWithFeatures {

    let move_ctx = {
        move,
        history: []
    }

    let p2 = apply_moves(pos, [])

    let features = find_features(p2)
    let more_features = find_more_features(features)

    let p3 = apply_moves(p2, [move])

    let after_features = find_features(p3)
    let after_more_features = find_more_features(after_features)

    return {
        features,
        more_features,
        move_ctx,
        after_features,
        after_more_features
    }
}

export function apply_moves(pos: Position, history: Move[]) {

    let p2 = pos.clone()

    history.forEach(_ => p2.play(_))

    return p2
}


export function find_more_features(f: Features): MoreFeatures {
    let checks = find_Checks(f)

    return {
        checks,
        blocks: checks.map(_ => find_Blocks(f, _))
    }
}


function find_Blocks(f: Features, check: Check) {
    let blocks: Ray[] = []
    for (let attack of f.turn_attacks) {
        for (let a of attack.rays) {
            if (check.ray.has(a.to)) {
                blocks.push(a)
            }
        }
    }

    return blocks
}

function find_Checks(f: Features) {
    let res: Check[] = []
    let king = f.opposite_king
    for (let open of f.open) {
        if (open.from === king || open.to === king) {
            for (let attack of f.turn_attacks) {
                for (let attack_ray of attack.rays) {
                    if (attack_ray.ray.intersect(open.ray)) {
                        res.push({
                            from: attack_ray.from,
                            to: attack_ray.to,
                            ray: attack_ray.ray,
                            to_threaten: king
                        })

                    }
                }
            }
        }
    }
    return res
}

function find_features(pos: Position): Features {

    let open = open_rays(pos.board.occupied)
    let turn_attacks = attack_rays(pos, pos.turn)
    let opposite_attacks = attack_rays(pos, opposite(pos.turn))
    let { hits: turn_hits, defends: turn_defends } = hits_and_defends(pos, pos.turn)
    let { hits: opposite_hits, defends: opposite_defends } = hits_and_defends(pos, opposite(pos.turn))
    let { hits: turn_hit_pins, defends: turn_defend_pins } = hits_and_defends_with_pins(pos, pos.turn)
    let { hits: opposite_hit_pins, defends: opposite_defend_pins } = hits_and_defends_with_pins(pos, opposite(pos.turn))

    let turn_king = pos.board.kingOf(pos.turn)!
    let opposite_king = pos.board.kingOf(opposite(pos.turn))!

    let turn_pieces = pos.board[pos.turn]
    let opposite_pieces = pos.board[opposite(pos.turn)]
    let occupied = pos.board.occupied

    return {
        turn_king,
        opposite_king,
        turn_pieces,
        opposite_pieces,
        occupied,
        open,
        turn_attacks,
        opposite_attacks,
        turn_hits,
        turn_defends,
        opposite_hits,
        opposite_defends,
        turn_hit_pins,
        turn_defend_pins,
        opposite_hit_pins,
        opposite_defend_pins
    }
}



function hits_and_defends_with_pins(pos: Position, color: Color) {
    let hits: PinRay[] = []
    let defends: PinRay[] = []

    for (let from of SquareSet.full()) {
        let piece = pos.board.get(from)
        if (piece && piece.color === color) {
            let aa = attacks(piece, from, pos.board.occupied)

            let pinned = aa.intersect(pos.board.occupied).singleSquare()

            if (pinned === undefined) {
                continue
            }

            let to = aa.intersect(pos.board.occupied.without(pinned)).singleSquare()

            if (to !== undefined) {
                if (pos.board.get(to)!.color === color) {
                    defends.push({
                        from,
                        to,
                        pinned,
                        ray: ray(from, to)
                    })
                } else {
                    hits.push({
                        from,
                        to,
                        pinned,
                        ray: ray(from, to)
                    })
                }
            }
        }
    }
    return { hits, defends }

}

function hits_and_defends(pos: Position, color: Color) {
    let hits: Ray[] = []
    let defends: Ray[] = []

    for (let from of SquareSet.full()) {
        let piece = pos.board.get(from)
        if (piece && piece.color === color) {
            let aa = attacks(piece, from, pos.board.occupied)

            let to = aa.intersect(pos.board.occupied).singleSquare()

            if (to !== undefined) {
                if (pos.board.get(to)!.color === color) {
                    defends.push({
                        from,
                        to,
                        ray: ray(from, to)
                    })
                } else {
                    hits.push({
                        from,
                        to,
                        ray: ray(from, to)
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

            for (let to of aa) {
                rays.push({ from, to, ray: ray(from, to) })
            }

            res.push({
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
                res.push({ from, to, ray: ray(from, to) })
            }
        }
    }
    return res
}

export function move_san(pos: Position, move_ctx: MoveContext) {
    let p2 = apply_moves(pos, move_ctx.history)

    let res = makeSan(p2, move_ctx.move)

    if (res.includes('-')) {
        console.log(history, move_ctx.move)
    }

    return res
}
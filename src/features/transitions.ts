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
    move_ctx: MoveContext
    after_features: Features
}

export type MoreFeatures = {
    check?: Check
    blocks: Ray[]
}

type Check = {
    from: Square
    to: Square
    ray: SquareSet
    to_threaten: Square
}


function apply_move_context(pos: Position, moves: MoveContext) {

    let p2 = pos.clone()

    moves.history.forEach(_ => p2.play(_))

    p2.play(moves.move)

    return p2
}


function more_features(f: Features): MoreFeatures {
    let checks = find_Checks(f)

    return {
        check: checks[0],
        blocks: find_Blocks(f, checks[0])
    }
}


function find_Blocks(f: Features, check?: Check) {
    if (check === undefined) {
        return []
    }

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

    return {
        turn_king,
        opposite_king,
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
'position tactical_features'
'tactical_features motives'
'motives temporal_motives'
'temporal_motives rank'

import { attacks, between, ray } from "../attacks"
import { Position } from "../chess"
import { pos_moves } from "../hopefox"
import { makeSan } from "../san"
import { SquareSet } from "../squareSet"
import { Color, Move, Role, Square } from "../types"
import { opposite } from "../util"

type SAN = string
type FEN = string

type Occupied = {
    feature: 'Occupied'
    occupied: SquareSet
}

type Occupies = {
    feature: 'Occupies'
    color: Color
    role: Role
    on: Square
}

type AttackType = 'attack' | 'defend' | 'cover'

type Attacks2 = {
    feature: 'Attacks2'
    type: AttackType
    from: Square
    to: Square
    to2: Square
}

type Attacks = {
    feature: 'Attacks'
    type: AttackType
    from: Square
    to: Square
}

type XRayAttacks = {
    feature: 'XRayAttacks'
    type: AttackType
    from: Square
    to: Square
    over: Square
    over_type: AttackType
}

type Blocks = {
    feature: 'Block'
    on: Square
    blocks_from: Square
    blocks_to: Square
}

type Pushes = {
    feature: 'Push'
    from: Square
    to: Square
}

type BlockadesPush = {
    feature: 'BlockadesPush'
    blockade_from: Square
    blockade_to: Square
}

type TacticalFeature = 
    | Occupied
    | Occupies
    | Attacks
    | XRayAttacks
    | Blocks
    | Pushes
    | BlockadesPush
    | Attacks2

type TacticalFeatureSet = TacticalFeature[]

type FeatureTag = TacticalFeature['feature']

function Generate_TacticalFeatures(pos: Position) {
    let res: TacticalFeature[] = []

    res.push({
        feature: 'Occupied',
        occupied: pos.board.occupied
    })

    for (let color of ['white', 'black'] as Color[]) {
        for (let role of ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'] as Role[]) {
            let on = pos.board[color].intersect(pos.board[role]).singleSquare()!
            res.push({
                feature: 'Occupies',
                color,
                role,
                on
            })
        }
    }

    for (let sq of pos.board.occupied) {
        let on = pos.board.get(sq)!
        let aa = attacks(on, sq, pos.board.occupied)
        for (let a of aa) {
            let ap = pos.board.get(a)
            let type: AttackType = ap === undefined ? 'cover' : ap.color === on.color ? 'defend' : 'attack'
            res.push({
                feature: 'Attacks',
                from: sq,
                to: a,
                type
            })

            let aa2 = attacks(on, a, pos.board.occupied.without(sq).with(a))

            for (let a2 of aa2) {
                let ap = pos.board.get(a2)
                let type: AttackType = ap === undefined ? 'cover' : ap.color === on.color ? 'defend' : 'attack'
                res.push({
                    feature: 'Attacks2',
                    from: sq,
                    to: a,
                    to2: a2,
                    type
                })

            }

            if (ap !== undefined) {
                let aa2 = attacks(on, sq, pos.board.occupied.without(a))
                for (let a2 of aa2) {
                    let ap = pos.board.get(a)
                    let type2: AttackType = ap === undefined ? 'cover' : ap.color === on.color ? 'attack' : 'defend'
                    res.push({
                        feature: 'XRayAttacks',
                        from: sq,
                        to: a2,
                        over: a,
                        type: type2,
                        over_type: type
                    })


                    res.push({
                        feature: 'Block',
                        on: a,
                        blocks_from: sq,
                        blocks_to: a2
                    })
                }
            }
        }
    }
    return res
}



type UncoveredSquare = {
    motif: 'UncoveredSquare'
    on: Square
}

type SingleAttackedSquare = {
    motif: 'SingleAttackedSquare'
    aa: Attacks
}

type DoubleAttackedSquare = {
    motif: 'DoubleAttackedSquare'
    aa: Attacks[]
}

type BlockableAttack = {
    motif: 'BlockableAttack',
    aa: Attacks2,
    block: Attacks
}

type UnblockableAttack = {
    motif: 'UnblockableAttack',
    aa: Attacks2
}

type DoubleAttacks = {
    motif: 'DoubleAttacks'
    a1: Attacks
    a2: Attacks
}

type Motif = 
    | UncoveredSquare
    | SingleAttackedSquare
    | DoubleAttackedSquare
    | DoubleAttacks
    | BlockableAttack
    | UnblockableAttack

type MotifTag = Motif['motif']

function Generate_Motives(features: TacticalFeatureSet) {
    let res: Motif[] = []


    let attacks = features.filter(_ => _.feature === 'Attacks')


    let attacks_by_to = group_by(_ => _.to, attacks)

    for (let aa of attacks_by_to.values()) {
        if (aa.length === 1) {
            res.push({
                motif: 'SingleAttackedSquare',
                aa: aa[0]
            })
        }

        if (aa.length > 1) {
            res.push({
                motif: 'DoubleAttackedSquare',
                aa
            })
        }
    }

    for (let sq of SquareSet.full()) {
        if (!attacks_by_to.has(sq)) {
            res.push({
                motif: 'UncoveredSquare',
                on: sq
            })
        }
    }

    let attacks2 = features.filter(_ => _.feature === 'Attacks2')

    for (let a2 of attacks2) {
        let r = between(a2.to, a2.to2)
        let unblockable = true
        for (let block of attacks) {
            
            if (block.from === a2.from) {
                continue
            }
            if (!r.has(block.to)) {
                continue
            }
            unblockable = false
            res.push({
                motif: 'BlockableAttack',
                aa: a2,
                block
            })
        }
        if (unblockable) {
            res.push({
                motif: 'UnblockableAttack',
                aa: a2
            })
        }
    }

    let attacks_by_from = group_by(_ => _.from, attacks)

    for (let aa of attacks_by_from.values()) {
        let double_attacks = aa.filter(_ => _.type === 'attack')
        if (double_attacks.length === 2) {

            res.push({
                motif: 'DoubleAttacks',
                a1: double_attacks[0],
                a2: double_attacks[1]
            })
        }
    }

    return res
}

function group_by<A, T>(fn: (a: A) => T, arr: A[]): Map<T, A[]> {
    let res = new Map<T, A[]>()
    for (let a of arr) {
        let key = fn(a)
        if (!res.has(key)) {
            res.set(key, [])
        }
        res.get(key)!.push(a)
    }
    return res
}

type OccasionalCapture = {
    temporal: 'OccasionalCapture'
    capture: Attacks
}

type CheckToLureIntoAFork = {
    temporal: 'CheckToLureIntoAFork'
    blockedAttack: BlockableAttack
    capture: Attacks
    fork: DoubleAttacks
}

type Checkmate = {
    temporal: 'Checkmate'
    attack: Attacks2
}

type TemporalMotive = 
    | CheckToLureIntoAFork
    | Checkmate
    | OccasionalCapture

export function Generate_TemporalMotives(pos: Position) {
    let features = Generate_TacticalFeatures(pos)
    let motives = Generate_Motives(features)

    let res: TemporalMotive[] = []

    let blockable_attacks = motives
        .filter(_ => _.motif === 'BlockableAttack')
        .filter(_ => pos.board[pos.turn].has(_.aa.from))
        .filter(_ => pos.board[opposite(pos.turn)].has(_.block.from))
        .filter(_ => _.aa.type === 'attack')

    for (let aa of blockable_attacks) {
        let p2 = play_moves(pos, [aa.aa, aa.block])

        let features2 = Generate_TacticalFeatures(p2)
        let motives2 = Generate_Motives(features2)

        let captures = features2
            .filter<Attacks>(_ => _.feature === 'Attacks')
            .filter(_ => _.type === 'attack' && _.to === aa.block.to)

        for (let cc of captures) {

            let p3 = play_moves(p2, [cc])
            let features3 = Generate_TacticalFeatures(p3)
            let motives3 = Generate_Motives(features3)

            let double_attacks = motives3
            .filter<DoubleAttacks>(_ => _.motif === 'DoubleAttacks')
            .filter(_ => _.a1.from === cc.to)

            for (let da of double_attacks) {
                res.push({
                    temporal: 'CheckToLureIntoAFork',
                    blockedAttack: aa,
                    capture: cc,
                    fork: da
                })
            }
        }
    }


    let king = features
        .filter(_ => _.feature === 'Occupies')
        .find(_ => _.color === opposite(pos.turn) && _.role === 'king')

    let unblockable_attacks = motives
        .filter(_ => _.motif === 'UnblockableAttack')
        .filter(_ => pos.board[pos.turn].has(_.aa.from))
        .filter(_ => _.aa.type === 'attack')

    for (let aa of unblockable_attacks) {
        if (aa.aa.to2 === king!.on) {
            res.push({
                temporal: 'Checkmate',
                attack: aa.aa
            })
        }
    }


    let captures = features.filter(_ => _.feature === 'Attacks')
        .filter(_ => _.type === 'attack')
        .filter(_ => pos.board[pos.turn].has(_.from))

    for (let cc of captures) {
        res.push({
            temporal: 'OccasionalCapture',
            capture: cc
        })
    }


    return res
}

export function TemporalMoves(pos: Position, temporal_motive: TemporalMotive) {
    let moves: Move[] = []
    if (temporal_motive.temporal === 'CheckToLureIntoAFork') {
        moves = [temporal_motive.blockedAttack.aa, temporal_motive.blockedAttack.block, temporal_motive.capture]

    } else if (temporal_motive.temporal === 'Checkmate') {
        moves = [temporal_motive.attack]
    } else if (temporal_motive.temporal === 'OccasionalCapture') {
        moves = [temporal_motive.capture]
    }

    return moves
}

export function san_moves(pos: Position, moves: Move[]) {
    let res: SAN[] = []
    let p2 = pos.clone()
    for (let move of moves) {
        res.push(makeSan(p2, move))
        p2.play(move)
    }
    return res
}

export function play_moves(pos: Position, moves: Move[]) {
    let p2 = pos.clone()
    moves.forEach(m => p2.play(m))
    return p2
}
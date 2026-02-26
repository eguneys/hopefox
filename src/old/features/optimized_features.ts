import { between } from "../attacks"
import { BLACK, ColorC, KING, make_move_from_to, move_c_to_Move, MoveC, piece_c_color_of, piece_c_type_of, PieceC, PositionC, PositionManager, WHITE } from "../hopefox_c"
import { SquareSet } from "../squareSet"


/****  Search */

function play_moves(pos: PositionC, moves: MoveC[]) {
    moves.forEach(_ => m.make_move(pos, _))
}

function unplay_moves(pos: PositionC, moves: MoveC[]) {
    for (let i = moves.length - 1; i >= 0; i--) {
        m.unmake_move(pos, moves[i])
    }
}

function Legal_moves_filter(pos: PositionC, mm: MoveC[], l: MoveC[] = m.get_legal_moves(pos)) {

    let aaa = l.map(move_c_to_Move)
    let a = 0
    let b = 0
    for (let x of mm) {
        if (!l.includes(x)) {
            return false
        }
    }
    return true
}


export function Generate_TemporalTransitions_Optimized(fen: FEN) {


    let pos = m.create_position(fen)

    let res: MoveC[][] = []

    let queue: MoveC[][] = [[]]

    while (queue.length > 0) {
        let new_queue: MoveC[][] = []
        for (let h1 of queue) {
            play_moves(pos, h1)

            let l = m.get_legal_moves(pos)



            Reset()
            let temporal_motives = Generate_TemporalMotives(pos)


            let m_moves = []
            for (let i = temporal_motives.CheckToLureIntoAFork_Feature_Start;
                i < temporal_motives.CheckToLureIntoAFork_Feature_End; i+=5) {
                    m_moves.push(CheckToLureIntoAForkMoves(i))
            }
            for (let i = temporal_motives.Checkmate_Start;
                i < temporal_motives.Checkmate_End; i+=5) {
                    m_moves.push(CheckmateMoves(i))
            }

            for (let i = temporal_motives.OccasionalCapture_Start;
                i < temporal_motives.OccasionalCapture_End; i+=5) {
                    m_moves.push(OccasionalCaptureMoves(i))
            }




            m_moves = m_moves
                .filter(_ => _.length > 0)
                .filter(_ => Legal_moves_filter(pos, _, l))

            unplay_moves(pos, h1)


            if (m_moves.length === 0) {
                res.push(h1)
            }

            for (let moves of m_moves) {
                res.push([...h1, ...moves])
                if (h1.length + moves.length >= 5) {
                    continue
                }
                new_queue.unshift([...h1, ...moves])
            }
        }
        queue = new_queue
    }

    m.delete_position(pos)
    return res
}




/**** Temporal Features */


type FEN = string

let m = await PositionManager.make()

enum FeatureType {
    Attacks
}

enum AttackType {
    Cover,
    Attack,
    Defend
}

const attackType = (color: ColorC, ap?: PieceC) => {
    return ap === undefined ? AttackType.Cover
        : piece_c_color_of(ap) === color ? AttackType.Defend
            : AttackType.Attack
}

type TacticalFeatures = {
    Attacks_Feature_Start: number
    Attacks_Feature_End: number
    Attacks2_Feature_Start: number
    Attacks2_Feature_End: number
    XRay_Attacks_Feature_Start: number
    XRay_Attacks_Feature_End: number
    Blocks_Feature_Start: number
    Blocks_Feature_End: number
}

function NewTacticalFeatures(pos: PositionC): TacticalFeatures {
    let occupied = m.pos_occupied(pos)

    let Stride = 10000
    let Attacks_Feature_Start = cursor
    let Attacks_Feature_End = Attacks_Feature_Start

    let Attacks2_Feature_Start = cursor + Stride
    let Attacks2_Feature_End = Attacks2_Feature_Start

    let XRay_Attacks_Feature_Start = cursor + Stride * 2
    let XRay_Attacks_Feature_End = XRay_Attacks_Feature_Start

    let Blocks_Feature_Start = cursor + Stride * 3
    let Blocks_Feature_End = Blocks_Feature_Start



    for (let sq of m.pos_occupied(pos)) {

        let on = m.get_at(pos, sq)!

        let color = piece_c_color_of(on)

        let aa = m.attacks(on, sq, occupied)

        for (let a of aa) {
            let ap = m.get_at(pos, a)
            let type = attackType(color, ap)
            // Attacks: A from B a C type
            cursor = Attacks_Feature_End
            NewFeature(sq, a, type)
            Add_Attacks_feature_grouped_by_from(sq, cursor)
            Attacks_Feature_End += 5



            let aa2 = m.attacks(on, a, occupied.without(sq))

            for (let a2 of aa2) {
                let ap = m.get_at(pos, a2)
                let type = attackType(color, ap)
                cursor = Attacks2_Feature_End
                // Attacks2 A from B a C a2 D type
                NewFeature(sq, a, a2, type)
                Attacks2_Feature_End += 5
            }


            if (ap !== undefined) {
                let aa2 = m.attacks(on, sq, occupied.without(a))

                for (let a2 of aa2) {
                    let ap = m.get_at(pos, a2)
                    let type2 = attackType(color, ap)
                    cursor = XRay_Attacks_Feature_End
                    // XRay_Attacks A from B a2 C a D type2 E type
                    NewFeature(sq, a2, a, type2, type)
                    XRay_Attacks_Feature_End += 5
                }

                for (let a2 of aa2) {
                    let ap = m.get_at(pos, a2)
                    cursor = Blocks_Feature_End
                    // Blocks A from B to C a2
                    NewFeature(a, sq, a2)
                    Blocks_Feature_End += 5
                }

            }
        }
    }

    cursor = Blocks_Feature_Start + Stride


    return {
        Attacks_Feature_Start, Attacks_Feature_End,
        Attacks2_Feature_Start, Attacks2_Feature_End,
        XRay_Attacks_Feature_Start, XRay_Attacks_Feature_End,
        Blocks_Feature_Start, Blocks_Feature_End,
    }
}


function NewMotives(features: TacticalFeatures) {

    let Stride = 10000

    let BlockableAttack_Start = cursor
    let BlockableAttack_End = BlockableAttack_Start

    let UnblockableAttack_Start = cursor + Stride
    let UnblockableAttack_End = UnblockableAttack_Start


    for (let a2 = features.Attacks2_Feature_Start; a2 < features.Attacks2_Feature_End; a2+=5) {

        // Attack2
        let a2_from = GetA(a2)
        let a2_to = GetB(a2)
        let a2_to2 = GetC(a2)
        let a2_type = GetD(a2)

        if (a2_to === undefined || a2_to2 === undefined || a2_to > 63 || a2_to2 > 63) {
            debugger
        }
        let r = between(a2_to, a2_to2)
        let unblockable = true
        for (let block = features.Attacks_Feature_Start; block < features.Attacks_Feature_End; block+=5) {

            // Attacks
            let block_from = GetA(block)
            let block_to = GetB(block)

            if (block_from === a2_from) {
                continue
            }
            if (a2_to2 === block_from) {
                continue
            }

            if (!r.has(block_to)) {
                continue
            }

            unblockable = false

            cursor = BlockableAttack_End
            // BlockableAttack A a2 B block
            NewFeature(a2, block)
            BlockableAttack_End += 5
        }

        if (unblockable) {
            cursor = UnblockableAttack_End
            // UnblockableAttack A a2
            NewFeature(a2)
            UnblockableAttack_End += 5
        }
    }

    let DoubleAttacks_Feature_Start = cursor,
        DoubleAttacks_Feature_End = DoubleAttacks_Feature_Start

    for (let from of Squares) {

        let [base, count] = Get_Attacks_feature_grouped_by_from_iterator(from)

        let a1, a2, a3
        for (let i = 0; i < count; i++) {

            let a = Get_Attacks_feature(base, i)
            // Attacks
            let type = GetC(a)

            if (type === AttackType.Attack) {
                if (a1 === undefined) {
                    a1 = a
                } else if (a2 === undefined) {
                    a2 = a
                } else if (a3 === undefined) {
                    a3 = a
                    break
                }
            }
        }

        if (a3 === undefined && a2 !== undefined) {
            cursor = DoubleAttacks_Feature_End
            // DoubleAttack A a1 B a2
            NewFeature(a1!, a2)
            DoubleAttacks_Feature_End += 5
        }
    }


    cursor = DoubleAttacks_Feature_Start + Stride


    return {
        BlockableAttack_Start,
        BlockableAttack_End,
        UnblockableAttack_Start,
        UnblockableAttack_End,
        DoubleAttacks_Feature_Start,
        DoubleAttacks_Feature_End
    }
}




export function Generate_TemporalMotives(pos: PositionC) {

    let features = NewTacticalFeatures(pos)
    let motives = NewMotives(features)

    let CheckToLureIntoAFork_Feature_Start = cursor,
    CheckToLureIntoAFork_Feature_End = CheckToLureIntoAFork_Feature_Start

    let turn = m.pos_turn(pos)
    let opposite_turn = turn === WHITE ? BLACK : WHITE
    let turn_bb = m.get_pieces_color_bb(pos, turn)
    let opposite_bb = m.get_pieces_color_bb(pos, opposite_turn)
    for (let aa = motives.BlockableAttack_Start; aa < motives.BlockableAttack_End; aa+=5) {
        // aa BlockableAttack
        let aa_aa = GetA(aa)
        let aa_block = GetB(aa)

        // aa_aa Attacks2
        let aa_aa_from = GetA(aa_aa)
        let aa_aa_to = GetB(aa_aa)
        let aa_aa_type = GetD(aa_aa)

        // aa_block Attacks
        let aa_block_from = GetA(aa_block)
        let aa_block_to = GetB(aa_block)

        if (aa_aa_type !== AttackType.Attack) {
            continue
        }
        if (!turn_bb.has(aa_aa_from)) {
            continue
        }

        if (!opposite_bb.has(aa_block_from)) {
            continue
        }


        let from = aa_aa_from
        let to = aa_aa_to
        let move1 = make_move_from_to(from, to)
        from = aa_block_from
        to = aa_block_to
        let move2 = make_move_from_to(from, to)

        if (!Legal_moves_filter(pos, [move1])) {
            continue
        }

        m.make_move(pos, move1)

        if (!Legal_moves_filter(pos, [move2])) {
            m.unmake_move(pos, move1)
            continue
        }



        m.make_move(pos, move2)

        Attacks_feature_Increase_Depth()
        
        let features2 = NewTacticalFeatures(pos)
        let motives2 = NewMotives(features2)

        for (let a = features2.Attacks_Feature_Start;
            a < features2.Attacks_Feature_End; a+=5) {

            // a Attacks
            let a_to = GetB(a)
            let a_type = GetC(a)

            if (a_type !== AttackType.Attack) {
                continue
            }

            if (a_to !== aa_block_to) {
                continue
            }

            // cc Attacks
            let cc = a
            let cc_from = GetA(cc)
            let cc_to = GetB(cc)

            let from = cc_from
            let to = cc_to
            let move3 = make_move_from_to(from, to)

            if (!Legal_moves_filter(pos, [move3])) {
                continue
            }


            m.make_move(pos, move3)

            Attacks_feature_Increase_Depth()

            let features3 = NewTacticalFeatures(pos)
            let motives3 = NewMotives(features3)



            for (let da = motives3.DoubleAttacks_Feature_Start;
                da < motives3.DoubleAttacks_Feature_End; da+=5) {

                    // da DoubleAttacks
                    let da_a1 = GetA(da)

                    // da_a1 Attacks
                    let da_a1_from = GetA(da_a1)

                    if (da_a1_from !== cc_to) {
                        continue
                    }

                    cursor = CheckToLureIntoAFork_Feature_End
                    // CheckToLureIntoAFork A aa B cc C da
                    NewFeature(aa, cc, da)
                    CheckToLureIntoAFork_Feature_End += 5

            }




            Attacks_feature_Decrease_Depth()
            m.unmake_move(pos, move3)

        }

        Attacks_feature_Decrease_Depth()

        m.unmake_move(pos, move2)
        m.unmake_move(pos, move1)


    }

    let Checkmate_Start = cursor,
    Checkmate_End = Checkmate_Start


    let king_on = m.get_pieces_bb(pos, [KING]).intersect(m.get_pieces_color_bb(pos, opposite_turn)).singleSquare()!

    for (let aa = motives.UnblockableAttack_Start;
        aa < motives.UnblockableAttack_End; aa+=5) {

            // aa UnblockableAttack
            let aa_aa = GetA(aa)

            let aa_from = GetA(aa_aa)
            // aa_aa Attacks2
            let aa_to2 = GetC(aa_aa)

            if (aa_to2 !== king_on) {
                continue
            }



            cursor = Checkmate_End
            // Checkmate A aa
            NewFeature(aa_aa)
            Checkmate_End += 5
    }


    let OccasionalCapture_Start = cursor,
    OccasionalCapture_End = OccasionalCapture_Start


    let p_bb = m.get_pieces_color_bb(pos, turn)
    for (let cc = features.Attacks_Feature_Start;
        cc < features.Attacks_Feature_End; cc+=5) {

            // cc Attacks
            let cc_from = GetA(cc)
            let cc_type = GetC(cc)

            if (cc_type !== AttackType.Attack) {
                continue
            }

            if (!p_bb.has(cc_from)) {
                continue
            }

            cursor = OccasionalCapture_End
            // OccasionalCapture A cc
            NewFeature(cc)
            OccasionalCapture_End += 5
        }

    cursor = OccasionalCapture_Start + 10000

    return { 
        CheckToLureIntoAFork_Feature_Start,
        CheckToLureIntoAFork_Feature_End,
        Checkmate_Start,
        Checkmate_End,
        OccasionalCapture_Start,
        OccasionalCapture_End
    }
}

type TemporalMotives = {

    CheckToLureIntoAFork_Feature_Start: number,
    CheckToLureIntoAFork_Feature_End: number,
    Checkmate_Start: number,
    Checkmate_End: number,
    OccasionalCapture_Start: number,
    OccasionalCapture_End: number,
}

export function CheckToLureIntoAForkMoves(o: number) {
    // o CheckToLureIntoAForkMoves
    let ba_blockedAttack = GetA(o)
    let ba_capture = GetB(o)

    // blockedAttack BlockableAttack
    let attack = GetA(ba_blockedAttack)
    let block = GetB(ba_blockedAttack)

    // attack Attack2
    let aa_from = GetA(attack)
    let aa_to = GetB(attack)

    // block Attacks
    let block_from = GetA(block)
    let block_to = GetB(block)

    let capture_from = GetA(ba_capture)
    let capture_to = GetB(ba_capture)

    return [make_move_from_to(aa_from, aa_to), make_move_from_to(block_from, block_to), make_move_from_to(capture_from, capture_to)]
}


export function CheckmateMoves(o: number) {

    let a = GetA(o)

    let a_from = GetA(a)
    let a_to = GetB(a)

    return [make_move_from_to(a_from, a_to)]
}

export function OccasionalCaptureMoves(o: number) {
    let a = GetA(o)

    let a_from = GetA(a)
    let a_to = GetB(a)

    return [make_move_from_to(a_from, a_to)]
}


/** SquareSet Pack */

const Empty = SquareSet.empty()
const Squares = SquareSet.full()

export function NewSquareSet(a: SquareSet, b = Empty) {
    return NewFeature(a.lo, a.hi, b.lo, b.hi)
}

export function GetSquareSet(o: number) {
    let a = GetA(o)
    let b = GetB(o)
    let c = GetC(o)
    let d = GetD(o)

    return [new SquareSet(a, b), new SquareSet(c, d)]
}

/** Feature Pack */
let cursor!: number
const FeaturePack = new Uint32Array(10000000)

export function Reset() {
    cursor = 0
    depth = 0
    bucketOffsets.fill(0)
    bucketCounts.fill(0)
}

export function NewFeature(a: number, b = 0, c = 0, d = 0, e = 0) {
    FeaturePack[cursor++] = a
    FeaturePack[cursor++] = b
    FeaturePack[cursor++] = c
    FeaturePack[cursor++] = d
    FeaturePack[cursor++] = e
}

export function GetA(o: number) { return FeaturePack[o] }
export function GetB(o: number) { return FeaturePack[o + 1] }
export function GetC(o: number) { return FeaturePack[o + 2] }
export function GetD(o: number) { return FeaturePack[o + 3] }
export function GetE(o: number) { return FeaturePack[o + 4] }

function Attacks_feature_Increase_Depth() {
    depth++
}

function Attacks_feature_Decrease_Depth() {
    depth--
}

let depth: number
const bucketOffsets = new Uint32Array(8 * 64 * 128)
const bucketCounts =  new Uint32Array(8 * 64)

function Add_Attacks_feature_grouped_by_from(from: number, featureOffset: number) {
    let key = depth * 64 + from
    const count = bucketCounts[key]
    bucketOffsets[key * 128 + bucketCounts[key]++] = featureOffset
}

function Get_Attacks_feature_grouped_by_from_iterator(from: number) {
    let key = depth * 64 + from
    const count = bucketCounts[key]
    const base = key * 128
    return [base, count]
}


function Get_Attacks_feature(base: number, offset: number) {
    return bucketOffsets[base + offset]
}



// Attacks: A from B a C type
// Attacks2 A from B a C a2 D type
// XRay_Attacks A from B a2 C a D type2 E type
// Blocks A from B to C a2
// BlockableAttack A a2 B block
// UnblockableAttack A a2
// DoubleAttack A a1 B a2
// CheckToLureIntoAFork A aa B cc C da
//    aa BlockableAttack cc Attacks
// Checkmate A aa
// OccasionalCapture A cc
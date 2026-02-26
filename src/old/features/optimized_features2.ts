import { between } from "../attacks"
import { BLACK, ColorC, KING, make_move_from_to, move_c_to_Move, MoveC, piece_c_color_of, PieceC, PositionC, PositionManager, WHITE } from "../hopefox_c"
import { SquareSet } from "../squareSet"
import PackMem from './pack_mem'


const Empty = SquareSet.empty()
const Squares = SquareSet.full()

function play_moves(pos: PositionC, moves: MoveC[]) {
    moves.forEach(_ => m.make_move(pos, _))
}

function unplay_moves(pos: PositionC, moves: MoveC[]) {
    for (let i = moves.length - 1; i >= 0; i--) {
        m.unmake_move(pos, moves[i])
    }
}

function Legal_moves_filter(pos: PositionC, mm: MoveC[]) {

    let l = m.get_legal_moves(pos)

    let aaa = l.map(move_c_to_Move)
    let a = 0
    let b = 0

    let i = 0
    let res  = true
    for (i = 0; i < mm.length; i++) {
        if (!l.includes(mm[i])) {
            res = false
            break
        }
        m.make_move(pos, mm[i])
        l = m.get_legal_moves(pos)
    }
    for (let j = i - 1; j >= 0; j--) {
        m.unmake_move(pos, mm[j])
    }
    return res
}


export function Generate_TemporalTransitions_Optimized(fen: FEN) {


    let pos = m.create_position(fen)

    let res: MoveC[][] = []

    let queue: MoveC[][] = [[]]

    while (queue.length > 0) {
        let new_queue: MoveC[][] = []
        for (let h1 of queue) {
            play_moves(pos, h1)

            PackMem.reset()
            
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
                .filter(_ => Legal_moves_filter(pos, _))

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
    let Attacks_Feature_Start = PackMem.cursor
    let Attacks_Feature_End = Attacks_Feature_Start

    let Attacks2_Feature_Start = PackMem.cursor + Stride
    let Attacks2_Feature_End = Attacks2_Feature_Start

    let XRay_Attacks_Feature_Start = PackMem.cursor + Stride * 2
    let XRay_Attacks_Feature_End = XRay_Attacks_Feature_Start

    let Blocks_Feature_Start = PackMem.cursor + Stride * 3
    let Blocks_Feature_End = Blocks_Feature_Start



    for (let sq of m.pos_occupied(pos)) {

        let on = m.get_at(pos, sq)!

        let color = piece_c_color_of(on)

        let aa = m.attacks(on, sq, occupied)

        for (let a of aa) {
            let ap = m.get_at(pos, a)
            let type = attackType(color, ap)
            // Attacks: A from B a C type
            PackMem.cursor = Attacks_Feature_End
            PackMem.new_feature(sq, a, type)
            PackMem.add_feature_grouped_by_from(sq, PackMem.cursor)
            Attacks_Feature_End += 5



            let aa2 = m.attacks(on, a, occupied.without(sq))

            for (let a2 of aa2) {
                let ap = m.get_at(pos, a2)
                let type = attackType(color, ap)
                PackMem.cursor = Attacks2_Feature_End
                // Attacks2 A from B a C a2 D type
                PackMem.new_feature(sq, a, a2, type)
                Attacks2_Feature_End += 5
            }


            if (ap !== undefined) {
                let aa2 = m.attacks(on, sq, occupied.without(a))

                for (let a2 of aa2) {
                    let ap = m.get_at(pos, a2)
                    let type2 = attackType(color, ap)
                    PackMem.cursor = XRay_Attacks_Feature_End
                    // XRay_Attacks A from B a2 C a D type2 E type
                    PackMem.new_feature(sq, a2, a, type2, type)
                    XRay_Attacks_Feature_End += 5
                }

                for (let a2 of aa2) {
                    let ap = m.get_at(pos, a2)
                    PackMem.cursor = Blocks_Feature_End
                    // Blocks A from B to C a2
                    PackMem.new_feature(a, sq, a2)
                    Blocks_Feature_End += 5
                }

            }
        }
    }

    PackMem.cursor = Blocks_Feature_Start + Stride


    return {
        Attacks_Feature_Start, Attacks_Feature_End,
        Attacks2_Feature_Start, Attacks2_Feature_End,
        XRay_Attacks_Feature_Start, XRay_Attacks_Feature_End,
        Blocks_Feature_Start, Blocks_Feature_End,
    }
}


function NewMotives(features: TacticalFeatures) {

    let Stride = 10000

    let BlockableAttack_Start = PackMem.cursor
    let BlockableAttack_End = BlockableAttack_Start

    let UnblockableAttack_Start = PackMem.cursor + Stride
    let UnblockableAttack_End = UnblockableAttack_Start


    for (let a2 = features.Attacks2_Feature_Start; a2 < features.Attacks2_Feature_End; a2+=5) {

        // Attack2
        let a2_from = PackMem.read_a(a2)
        let a2_to = PackMem.read_b(a2)
        let a2_to2 = PackMem.read_c(a2)
        let a2_type = PackMem.read_d(a2)

        if (a2_to === undefined || a2_to2 === undefined || a2_to > 63 || a2_to2 > 63) {
            debugger
        }
        let r = between(a2_to, a2_to2)
        let unblockable = true
        for (let block = features.Attacks_Feature_Start; block < features.Attacks_Feature_End; block+=5) {

            // Attacks
            let block_from = PackMem.read_a(block)
            let block_to = PackMem.read_b(block)

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

            PackMem.cursor = BlockableAttack_End
            // BlockableAttack A a2 B block
            PackMem.new_feature(a2, block)
            BlockableAttack_End += 5
        }

        if (unblockable) {
            PackMem.cursor = UnblockableAttack_End
            // UnblockableAttack A a2
            PackMem.new_feature(a2)
            UnblockableAttack_End += 5
        }
    }

    let DoubleAttacks_Feature_Start = PackMem.cursor,
        DoubleAttacks_Feature_End = DoubleAttacks_Feature_Start

    for (let from of Squares) {

        let [base, count] = PackMem.get_feature_grouped_by_from_iterator(from)

        let a1, a2, a3
        for (let i = 0; i < count; i++) {

            let a = PackMem.get_feature_grouped_by_from(base, i)
            // Attacks
            let type = PackMem.read_c(a)

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
            PackMem.cursor = DoubleAttacks_Feature_End
            // DoubleAttack A a1 B a2
            PackMem.new_feature(a1!, a2)
            DoubleAttacks_Feature_End += 5
        }
    }


    PackMem.cursor = DoubleAttacks_Feature_Start + Stride


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

    let Stride = 10000
    let CheckToLureIntoAFork_Feature_Start = PackMem.cursor,
    CheckToLureIntoAFork_Feature_End = CheckToLureIntoAFork_Feature_Start

    let Checkmate_Start = PackMem.cursor + Stride,
    Checkmate_End = Checkmate_Start

    let OccasionalCapture_Start = PackMem.cursor + Stride * 2,
    OccasionalCapture_End = OccasionalCapture_Start



    let turn = m.pos_turn(pos)
    let opposite_turn = turn === WHITE ? BLACK : WHITE
    let turn_bb = m.get_pieces_color_bb(pos, turn)
    let opposite_bb = m.get_pieces_color_bb(pos, opposite_turn)
    for (let aa = motives.BlockableAttack_Start; aa < motives.BlockableAttack_End; aa+=5) {
        // aa BlockableAttack
        let aa_aa = PackMem.read_a(aa)
        let aa_block = PackMem.read_b(aa)

        // aa_aa Attacks2
        let aa_aa_from = PackMem.read_a(aa_aa)
        let aa_aa_to = PackMem.read_b(aa_aa)
        let aa_aa_type = PackMem.read_d(aa_aa)

        // aa_block Attacks
        let aa_block_from = PackMem.read_a(aa_block)
        let aa_block_to = PackMem.read_b(aa_block)

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


        let LureFrame = PackMem.frame

        m.make_move(pos, move2)

        let cursor2 = PackMem.push_frame()
        PackMem.increase_depth()
        
        let features2 = NewTacticalFeatures(pos)
        let motives2 = NewMotives(features2)




        for (let a = features2.Attacks_Feature_Start;
            a < features2.Attacks_Feature_End; a+=5) {

            // a Attacks
            let a_to = PackMem.read_b(a)
            let a_type = PackMem.read_c(a)

            if (a_type !== AttackType.Attack) {
                continue
            }

            if (a_to !== aa_block_to) {
                continue
            }

            // cc Attacks
            let cc = a
            let cc_from = PackMem.read_a(cc)
            let cc_to = PackMem.read_b(cc)

            let from = cc_from
            let to = cc_to
            let move3 = make_move_from_to(from, to)

            if (!Legal_moves_filter(pos, [move3])) {
                continue
            }


            m.make_move(pos, move3)

            let cursor3 = PackMem.push_frame()
            PackMem.increase_depth()

            let features3 = NewTacticalFeatures(pos)
            let motives3 = NewMotives(features3)



            for (let da = motives3.DoubleAttacks_Feature_Start;
                da < motives3.DoubleAttacks_Feature_End; da+=5) {

                    // da DoubleAttacks
                    let da_a1 = PackMem.read_a(da)

                    // da_a1 Attacks
                    let da_a1_from = PackMem.read_a(da_a1)

                    if (da_a1_from !== cc_to) {
                        continue
                    }

                    let tmp_cursor = PackMem.cursor
                    let tmp_frame = PackMem.frame
                    PackMem.frame = LureFrame
                    PackMem.cursor = CheckToLureIntoAFork_Feature_End
                    // CheckToLureIntoAFork A aa B cc C da
                    PackMem.new_feature(aa, cc, da)
                    CheckToLureIntoAFork_Feature_End += 5

                    PackMem.frame = tmp_frame
                    PackMem.cursor = tmp_cursor
            }




            //PackMem.decrease_depth()
            //PackMem.pop_frame(cursor3)

            m.unmake_move(pos, move3)

        }


        //PackMem.decrease_depth()
        //PackMem.pop_frame(cursor2)

        m.unmake_move(pos, move2)
        m.unmake_move(pos, move1)

    }



    let king_on = m.get_pieces_bb(pos, [KING]).intersect(m.get_pieces_color_bb(pos, opposite_turn)).singleSquare()!

    for (let aa = motives.UnblockableAttack_Start;
        aa < motives.UnblockableAttack_End; aa+=5) {

            // aa UnblockableAttack
            let aa_aa = PackMem.read_a(aa)

            let aa_from = PackMem.read_a(aa_aa)
            // aa_aa Attacks2
            let aa_to2 = PackMem.read_c(aa_aa)

            if (aa_to2 !== king_on) {
                continue
            }



            PackMem.cursor = Checkmate_End
            // Checkmate A aa
            PackMem.new_feature(aa_aa)
            Checkmate_End += 5
    }


    let p_bb = m.get_pieces_color_bb(pos, turn)
    for (let cc = features.Attacks_Feature_Start;
        cc < features.Attacks_Feature_End; cc+=5) {

            // cc Attacks
            let cc_from = PackMem.read_a(cc)
            let cc_type = PackMem.read_c(cc)

            if (cc_type !== AttackType.Attack) {
                continue
            }

            if (!p_bb.has(cc_from)) {
                continue
            }

            PackMem.cursor = OccasionalCapture_End
            // OccasionalCapture A cc
            PackMem.new_feature(cc)
            OccasionalCapture_End += 5
        }

    PackMem.cursor = OccasionalCapture_Start + 10000

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
    let ba_blockedAttack = PackMem.read_a(o)
    let ba_capture = PackMem.read_b(o)

    // blockedAttack BlockableAttack
    let attack = PackMem.read_a(ba_blockedAttack)
    let block = PackMem.read_b(ba_blockedAttack)

    // attack Attack2
    let aa_from = PackMem.read_a(attack)
    let aa_to = PackMem.read_b(attack)

    // block Attacks
    let block_from = PackMem.read_a(block)
    let block_to = PackMem.read_b(block)

    let capture_from = PackMem.read_a(ba_capture)
    let capture_to = PackMem.read_b(ba_capture)

    return [make_move_from_to(aa_from, aa_to), make_move_from_to(block_from, block_to), make_move_from_to(capture_from, capture_to)]
}


export function CheckmateMoves(o: number) {

    let a = PackMem.read_a(o)

    let a_from = PackMem.read_a(a)
    let a_to = PackMem.read_b(a)

    return [make_move_from_to(a_from, a_to)]
}

export function OccasionalCaptureMoves(o: number) {
    let a = PackMem.read_a(o)

    let a_from = PackMem.read_a(a)
    let a_to = PackMem.read_b(a)

    return [make_move_from_to(a_from, a_to)]
}


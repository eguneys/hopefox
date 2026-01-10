import { skip } from "node:test"
import { attacks, between, pawnAttacks } from "./attacks"
import { Chess } from "./chess"
import { EMPTY_FEN, makeFen, parseFen } from "./fen"
import { AlignmentSentence, AreAlignedSentence, AreAttackingSentence, AttacksSentence, BlocksAlignmentSentence, CanAttackSentence, CanEyeSentence, CanForkSentence, CanThreatenMateOnSentence, EyesSentence, IsAroundTheKingSentence, IsBlockadingSentence, IsControllingSentence, IsDefendingSentence, Lexer, Parser } from "./mor1"
import { go_black, go_white, SquareSet } from "./squareSet"
import { Color, Piece, Role, Square } from "./types"
import { parseSquare } from "./util"
import { pbkdf2Sync } from "crypto"

type Pieces = 'king' | 'King' | 'rook' | 'Rook' | 'queen' | 'Queen' | 'knight' | 'Knight' | 'bishop' | 'Bishop' | 'pawn' | 'Pawn'
| 'rook2' | 'bishop2' | 'knight2'
| 'Rook2' | 'Bishop2' | 'Knight2'
| 'app' | 'APP'
| 'queening_square' | 'Queening_Square'

const Pieces: Pieces[] = ['king','King','rook','Rook', 'queen', 'Queen', 'knight', 'Knight', 'bishop', 'Bishop', 'pawn', 'Pawn',
    'rook2', 'bishop2', 'knight2',
    'Rook2', 'Bishop2', 'Knight2',
    'app', 'APP',
    'queening_square', 'Queening_Square'
]

type QBoard = Record<Pieces, SquareSet>

function q_board(): QBoard {
    return {
        king: SquareSet.full(),
        King: SquareSet.full(),
        queen: SquareSet.full(),
        Queen: SquareSet.full(),
        rook: SquareSet.full(),
        Rook: SquareSet.full(),
        knight: SquareSet.full(),
        Knight: SquareSet.full(),
        bishop: SquareSet.full(),
        Bishop: SquareSet.full(),
        pawn: SquareSet.full(),
        Pawn: SquareSet.full(),
        rook2: SquareSet.full(),
        bishop2: SquareSet.full(),
        knight2: SquareSet.full(),
        Rook2: SquareSet.full(),
        Bishop2: SquareSet.full(),
        Knight2: SquareSet.full(),
        app: SquareSet.full(),
        APP: SquareSet.full(),

        queening_square: SquareSet.full(),
        Queening_Square: SquareSet.full()
    }
}

function q_occupied(a: QBoard) {
    let res = SquareSet.empty()

    for (let p of Pieces) {
        if (a[p].singleSquare()) {
            res = res.union(a[p])
        }
    }
    return res
}

function q_equals(a: QBoard, b: QBoard) {
    for (let p of Pieces) {
        if (!a[p].equals(b[p])) {
            return false
        }
    }
    return true
}

function q_clone(a: QBoard) {
    return { ...a }
}

function qc_backrank(q: QBoard, pieces: Pieces) {
    q[pieces] = q[pieces].intersect(SquareSet.backrank(color_pieces(pieces)))
}

function qc_put(q: QBoard, pieces: Pieces, square: Square) {
    q[pieces] = q[pieces].intersect(SquareSet.fromSquare(square))
}


function qc_take(q: QBoard, pieces: Pieces) {
    q[pieces] = SquareSet.empty()
}

function qc_dedup(q: QBoard) {

    for (let p of Pieces) {

        if (q[p].size() === 1) {
            for (let p2 of Pieces) {
                if (p !== p2) {
                    q[p2] = q[p2].without(q[p].singleSquare()!)
                }
            }
        }
    }
}


function SquareSet_APP(color: Color) {
    if (color === 'white') {

        return SquareSet.fromRank(6).union(
            SquareSet.fromRank(7))
    } else {
        return SquareSet.fromRank(2).union(
            SquareSet.fromRank(3))
    }
}

function file_of(sq: Square) {
    return sq % 8
}
function rank_of(sq: Square) {
    return Math.floor(sq / 8)
}

function SquareSet_Queening(color: Color, sq: Square) {
    if (color === 'white') {
        return SquareSet.fromRank(7).intersect(SquareSet.fromFile(file_of(sq)))
    } else {
        return SquareSet.fromRank(0).intersect(SquareSet.fromFile(file_of(sq)))
    }
}

function qc_app_places(q: QBoard) {


    q['pawn'] = q['pawn'].intersect(SquareSet.backranks().complement())
    q['Pawn'] = q['Pawn'].intersect(SquareSet.backranks().complement())

    q['app'] = q['app'].intersect(SquareSet_APP('black'))
    q['APP'] = q['APP'].intersect(SquareSet_APP('white'))

    q['queening_square'] = SquareSet.empty()
    for (let aps of q['app']) {
        q['queening_square'] = q['queening_square'].union(
            SquareSet_Queening('black', aps)
        )
    }

    q['Queening_Square'] = SquareSet.empty()
    for (let aps of q['APP']) {
        q['Queening_Square'] = q['Queening_Square'].union(
            SquareSet_Queening('white', aps)
        )
    }
}


const qc_alignment = (p1: Pieces, p2: Pieces) => (q: QBoard) => {
    let occupied = q_occupied(q)
    let piece1 = parse_piece(p1)
    let piece2 = parse_piece(p2)

    let res1 = SquareSet.empty()
    let res2 = SquareSet.empty()

    for (let p1s of q[p1]) {
        for (let p2s of attacks(piece1, p1s, occupied).intersect(q[p2])) {

            if (attacks(piece2, p2s, occupied).has(p1s)) {
                res1 = res1.set(p1s, true)
                res2 = res2.set(p2s, true)
            }
        }
    }

    q[p1] = res1
    q[p2] = res2
}


const qc_attacks = (p1: Pieces, p2: Pieces) => (q: QBoard) => {
    let occupied = q_occupied(q)
    let piece1 = parse_piece(p1)
    let piece2 = parse_piece(p2)

    let res2 = SquareSet.empty()

    for (let p1s of q[p1]) {
        res2 = res2.union(attacks(piece1, p1s, occupied).intersect(q[p2]))
    }

    q[p2] = res2
}

const qc_attacks_blocker = (p1: Pieces, p2: Pieces, blocker: Pieces) => (q: QBoard) => {
    let occupied = q_occupied(q)

    let piece1 = parse_piece(p1)
    let piece2 = parse_piece(p2)
    let blocker1 = parse_piece(blocker)

    let res1 = SquareSet.empty()
    let res2 = SquareSet.empty()
    let res3 = SquareSet.empty()

    for (let p1s of q[p1]) {
        for (let b1s of q[blocker]) {
            for (let p2s of attacks(piece1, p1s, occupied.without(b1s)).intersect(q[p2])) {

                if (between(p1s, p2s).has(b1s)) {

                    res1 = res1.set(p1s, true)
                    res2 = res2.set(p2s, true)
                    res3 = res3.set(b1s, true)
                }
            }
        }
    }

    q[p1] = res1
    q[p2] = res2
    q[blocker] = res3
}



const qc_alignment_blocker = (p1: Pieces, p2: Pieces, b1: Pieces) => (q: QBoard) => {
    let occupied = q_occupied(q)
    let piece1 = parse_piece(p1)
    let piece2 = parse_piece(p2)
    let blocker1 = parse_piece(b1)

    let res1 = SquareSet.empty()
    let res2 = SquareSet.empty()
    let res3 = SquareSet.empty()

    for (let p1s of q[p1]) {
        for (let b1s of q[b1]) {
            for (let p2s of attacks(piece1, p1s, occupied.without(b1s)).intersect(q[p2])) {

                if (attacks(piece2, p2s, occupied.without(b1s)).has(p1s)) {


                    if (between(p1s, p2s).has(b1s)) {

                        res1 = res1.set(p1s, true)
                        res2 = res2.set(p2s, true)
                        res3 = res3.set(b1s, true)
                    }
                }

            }
        }
    }

    q[p1] = res1
    q[p2] = res2
    q[b1] = res3
}

const qc_eyes = (p1: Pieces, eyes: Pieces[]) => (q: QBoard) => {
    let occupied = q_occupied(q)
    let piece1 = parse_piece(p1)
    let eyes1 = eyes.map(parse_piece)

    let res1 = SquareSet.empty()
    let res2s = eyes.map(_ => SquareSet.empty())

    for (let p1s of q[p1]) {
        for (let i = 0; i < eyes.length; i++) {
            let p2 = eyes[i]
            let res2 = res2s[i]

            for (let p2s of attacks(piece1, p1s, occupied).intersect(q[p2])) {
                res1 = res1.set(p1s, true)
                res2s[i] = res2.set(p2s, true)
            }
        }
    }

    q[p1] = res1
    eyes.map((eye1, i) => q[eye1] = res2s[i])
}

const qc_is_around_the_king = (p1: Pieces) => (q: QBoard) => {
    let occupied = q_occupied(q)
    let piece = parse_piece(p1)
    let king: Pieces = piece.color === 'white' ? 'King' : 'king'
    let king_piece = parse_piece(king)

    let res = SquareSet.empty()
    for (let ks of q[king]) {
        for (let p1s of attacks(king_piece, ks, occupied).intersect(q[p1])) {
            res = res.set(p1s, true)
        }
    }
    q[p1] = res
}

const qc_can_fork_or = (p1: Pieces, forked: Pieces[]) => (q: QBoard) => {
    let occupied = q_occupied(q)
    let piece = parse_piece(p1)
    let forked_pieces = forked.map(parse_piece)


    let res1 = SquareSet.empty()
    let res2s = forked.map(_ => SquareSet.empty())

    for (let p1s of q[p1]) {
        for (let a1s of attacks(piece, p1s, occupied))
        for (let i = 0; i < forked.length; i++) {
            let p2 = forked[i]
            let res2 = res2s[i]

            for (let p2s of attacks(piece, a1s, occupied).intersect(q[p2])) {
                res1 = res1.set(p1s, true)
                res2s[i] = res2.set(p2s, true)
            }
        }
    }

    q[p1] = res1
    forked.map((forked1, i) => q[forked1] = res2s[i])
}



const qc_can_fork_and = (p1: Pieces, forked: Pieces[]) => (q: QBoard) => {
    let occupied = q_occupied(q)
    let piece = parse_piece(p1)
    let forked_pieces = forked.map(parse_piece)


    let res1 = SquareSet.empty()
    let res2s = forked.map(_ => SquareSet.empty())

    for (let p1s of q[p1]) {
        a1s: for (let a1s of attacks(piece, p1s, occupied)) {
            for (let i = 0; i < forked.length; i++) {
                let p2 = forked[i]

                if (attacks(piece, a1s, SquareSet.empty()).intersect(q[p2]).isEmpty()) {
                    continue a1s
                }
            }
            res1 = res1.set(p1s, true)

            /*
            for (let p2s of attacks(piece, a1s, SquareSet.empty()).intersect(fork_all)) {
                res1 = res1.set(p1s, true)
            }
                */

        }
    }

    q[p1] = res1
    //forked.map((forked1, i) => q[forked1] = res2s[i])
}

const qc_can_eye = (p1: Pieces, eye: Pieces) => (q: QBoard) => {

    let occupied = q_occupied(q)
    let piece = parse_piece(p1)
    let eye_piece = parse_piece(eye)


    let res1 = SquareSet.empty()
    let res2 = SquareSet.empty()

    for (let p1s of q[p1]) {
        a1s: for (let a1s of attacks(piece, p1s, occupied)) {
            for (let p2s of attacks(piece, a1s, occupied).intersect(q[eye])) {
                res1 = res1.set(p1s, true)
            }
        }
    }

    q[p1] = res1

}

const qc_can_threaten_mate_on = (p1: Pieces, eye1: Pieces, with1: Pieces) => (q: QBoard) => {

    let occupied = q_occupied(q)
    const piece = parse_piece(p1)
    const eye_piece = parse_piece(eye1)
    const with_piece = parse_piece(with1)


    let res1 = SquareSet.empty()
    let res2 = SquareSet.empty()
    let res3 = SquareSet.empty()

    for (let p1s of q[p1]) {
        for (let w1s of q[with1]) {
            a1s: for (let a1s of
                attacks(piece, p1s, occupied).intersect(attacks(with_piece, w1s, occupied))) {
                for (let p2s of attacks(piece, a1s, occupied).intersect(q[eye1])) {
                    res1 = res1.set(p1s, true)
                    res2 = res2.set(p2s, true)
                    res3 = res3.set(w1s, true)
                }
            }
        }
    }


    q[p1] = res1
    q[eye1] = res2
    q[with1] = res3

}

const qc_is_controlling = (p1: Pieces, s1: Pieces, push: boolean) => (q: QBoard) => {

    const piece = parse_piece(p1)
    const square = parse_piece(s1)

    let res1 = SquareSet.empty()
    let res2 = SquareSet.empty()


    for (let p1s of q[p1]) {
        for (let sq1 of q[s1]) {
            let sq1push = sq1
            if (push) {
                if (square.color === 'white') {
                    sq1push = go_black(sq1push)!
                } else {

                    sq1push = go_white(sq1push)!
                }
            }
            if (sq1push ===  undefined) {
                continue
            }
            if (attacks(piece, p1s, SquareSet.empty()).has(sq1push)) {

                res1 = res1.set(p1s, true)
                res2 = res2.set(sq1, true)
            }
        }
    }

    q[p1] = res1
    q[s1] = res2

}

const qc_is_blockading = (p1: Pieces, sq1: Pieces) => (q: QBoard) => {
    let piece = parse_piece(p1)

    q[p1] = q[p1].intersect(q[sq1])
}

const qc_is_defending = (p1: Pieces, d1: Pieces, from_behind: boolean) => (q: QBoard) => {

    let occupied = q_occupied(q)
    let piece = parse_piece(p1)

    let res1 = SquareSet.empty()
    let res2 = SquareSet.empty()
    for (let p1s of q[p1]) {
        let a1ss = attacks(piece, p1s, occupied).intersect(q[d1])
        for (let a1s of a1ss) {
            if (rank_of(a1s) > rank_of(p1s) && piece.color === 'white' ||
                rank_of(a1s) < rank_of(p1s)) {

                    res1 = res1.set(p1s, true)
                    res2 = res2.set(a1s, true)
            }
        }
    }

    q[p1] = res1
    q[d1] = res2
}

const qc_are_attacking = (p1: Pieces, p2: Pieces, a1: Pieces) => (q: QBoard) => {

    let occupied = q_occupied(q)
    let piece = parse_piece(p1)
    let piece2 = parse_piece(p2)
    let attacked = parse_piece(a1)

    let res1 = SquareSet.empty()
    let res2 = SquareSet.empty()
    let res3 = SquareSet.empty()

    for (let p1s of q[p1]) {
        for (let p2s of q[p2]) {
            let a1ss = attacks(piece, p1s, occupied)
            .intersect(attacks(piece2, p2s, occupied))
            .intersect(q[a1])

            for (let a1s of a1ss) {
                res1 = res1.set(p1s, true)
                res2 = res2.set(p2s, true)
                res3 = res3.set(a1s, true)
            }
        }
    }

    q[p1] = res1
    q[p2] = res2
    q[a1] = res3
}




const mcc: Record<string, any> = {
    alignment: (x: AlignmentSentence) =>
        x.blocker ? 
        qc_alignment_blocker(x.aligned1 as Pieces, x.aligned2 as Pieces, x.blocker as Pieces) :
        qc_alignment(x.aligned1 as Pieces, x.aligned2 as Pieces),
    attacks: (x: AttacksSentence) => qc_attacks(x.piece as Pieces, x.attacked as Pieces),
    blocks_alignment: (x: BlocksAlignmentSentence) =>
        qc_alignment_blocker(x.aligned1 as Pieces, x.aligned2 as Pieces, x.blocker as Pieces),
    eyes: (x: EyesSentence) =>
        x.blocker ? qc_attacks_blocker(x.piece as Pieces, x.eyes[0] as Pieces, x.blocker as Pieces) :
        qc_eyes(x.piece as Pieces, x.eyes as Pieces[]),
        are_aligned: (x: AreAlignedSentence) =>
            qc_alignment(x.piece1 as Pieces, x.piece2 as Pieces),
    is_around_the_king: (x: IsAroundTheKingSentence) =>
        qc_is_around_the_king(x.piece as Pieces),
    can_fork: (x: CanForkSentence) =>
        qc_can_fork_and(x.piece as Pieces, x.forked as Pieces[]),
    can_eye: (x: CanEyeSentence) =>
        qc_can_eye(x.piece as Pieces, x.eye as Pieces),
    can_threaten_mate_on: (x: CanThreatenMateOnSentence) =>
        qc_can_threaten_mate_on(x.piece as Pieces, x.eye as Pieces, x.with as Pieces),
    is_controlling: (x: IsControllingSentence) =>
        qc_is_controlling(x.piece as Pieces, x.square as Pieces, x.push),
    is_blockading: (x: IsBlockadingSentence) =>
        qc_is_blockading(x.piece as Pieces, x.square as Pieces),
    is_defending: (x: IsDefendingSentence) =>
        qc_is_defending(x.piece as Pieces, x.defended as Pieces, x.from_behind),
    are_attacking: (x: AreAttackingSentence) =>
        qc_are_attacking(x.piece as Pieces, x.piece2 as Pieces, x.attacked as Pieces),
    can_attack: (x: CanAttackSentence) =>
        qc_can_eye(x.piece as Pieces, x.attacked as Pieces),
}

export function mor2(text: string) {
    let conds = text.trim().split('\n').filter(_ => !_.startsWith(':'))

    let xx = conds.map(line => {
        let a = new Parser(new Lexer(line)).parse_sentence()
        return a
    })



    let cc = xx.map(x => {
        if (mcc[x.type]) {
            return mcc[x.type](x)
        }
        console.warn('Unknown MCC', x.type)
        return (q: QBoard) => {}
    })

    const f = (q: QBoard) => {
        cc.forEach(_ => _(q))
        qc_dedup(q)
        qc_app_places(q)
    }

    let q = q_board()
    //qc_put(q, 'king', parseSquare('g8'))

    //let qq = qc_pull2o(q, ['King', 'king', 'queen', 'Queen', 'bishop', 'Pawn', 'Rook', 'rook', 'Knight', 'rook2', 'pawn'], f)
    //let qq = qc_pull2o(q, ['Pawn', 'Rook', 'rook', 'rook2', 'pawn', 'Knight', 'King', 'king', 'queen', 'Queen', 'bishop'], f)
    //let qq = qc_pull2o(q, ['Pawn', 'queen', 'Knight', 'Pawn'], f)
    //let qq = qc_pull2o(q, ['king', 'APP', 'knight2', 'Rook', 'Pawn', 'knight', 'King'], f)
    //let qq = qc_pull2o(q, ['king', 'APP', 'Pawn', 'knight'], f)
    let qq = qc_pull2o(q, ['queen', 'Queen', 'rook', 'Rook', 'rook2', 'Rook2', 'king'], f)


    return qq?.map(qc_fen_singles)
}

function qc_pull2o(q: QBoard, pieces: Pieces[], cc: (q: QBoard) => void) {

    let res: QBoard[] = []
    let limit = 0

    function dfs(q: QBoard) {

        //if (limit ++ > 100000) return
        //console.log(qc_fen_singles(q))
        let q2 = { ...q }
        let q3 = q2


        while (true) {
            cc(q3)
            if (q_equals(q2, q3)) {
                break
            }

            q2 = q3
            q3 = { ...q3 }
        }

        for (let piece of pieces) {
            if (q3[piece].isEmpty()) {
                //console.log('blow', piece)
                return
            }
        }

        let all_single = true
        for (let piece of pieces) {
            if (q3[piece].singleSquare() === undefined) {
                all_single = false
                break
            }
        }

        if (all_single) {
            res.push(q3)
            return
        }

        for (let piece of pieces) {
            if (q3[piece].singleSquare() !== undefined) {
                continue
            }
            let count = q3[piece].size()
            for (let skip = 0; skip < count; skip++) {
                let q_next = { ...q3 }
                //console.log('pull', piece, skip)
                if (piece === 'King' && skip === 50) {
                    debugger
                }
                qc_pull1(q_next, piece, skip)
                dfs(q_next)
                if (res.length >= 10) {
                    return
                }
            }
            //console.log('out pull', piece)
            break
        }
    }

    dfs(q)
    return res
}

function qc_pull2(q: QBoard, pieces: Pieces[], cc: (q: QBoard) => void) {
    let limit = 0
    let q2 = q
    let skips = pieces.map(_ => 0)
    let qqs = pieces.map(_ => ({ ...q }))

    let res = []

    for (let i = 0; i < pieces.length; i++) {
        //if (limit++ > 1000) break
        //console.log(qc_fen_singles(q2), skips)
        let piece = pieces[i]
        let skip = skips[i]

        let q_back = { ...q2 }
        let q3 = { ... q2 }
        let is_end = !qc_pull1(q3, piece, skip)
        if (is_end) {
            if (i === 0) {
                break
            }
            skips[i] = 0
            i -= 1
            skips[i]++;
            i -= 1

            q2 = {...q}
            for (let j = 0; j < i + 1; j++) {
                qc_pull1(q2, pieces[j], skips[j])
            }

            continue
        }

        while (true) {
            if (q_equals(q2, q3)) {
                break
            }
            cc(q3)
            q2= q3
            q3 = { ...q3 }
        }
        for (let piece of pieces) {
            if (q3[piece].isEmpty()){
                skips[i] = skip + 1
                i -= 1
                q2 = q_back
                break
            }
        }


        if (i === pieces.length - 1) {
            res.push(q2)
            skips[i] = skip + 1
            i = -1

            q2 = { ...q }
            /*
            for (let j = 0; j < pieces.length; j++) {
                qc_pull1(q2, pieces[j], skips[j])
            }
                */

            if (res.length > 0) {
                break
            }

            continue
        }

     }

    return res
}

function qc_pull1(q: QBoard, pieces: Pieces, skip: number = 0) {
    for (let i = 0; i < skip; i++) {
        q[pieces] = q[pieces].withoutFirst()
    }

    let f = q[pieces].first()
    if (f === undefined) {
        return false
    }
    q[pieces] = SquareSet.fromSquare(f)

    return true
}

function qc_fen_singles(q: QBoard) {
    let res = Chess.fromSetupUnchecked(parseFen(EMPTY_FEN).unwrap())

    for (let p of Pieces) {
        let sq = q[p].singleSquare()
        if (sq !== undefined) {

            if (parse_piece_and_squares(p) === undefined) {
                continue
            }
            res.board.set(sq, parse_piece(p))
        }
    }
    return makeFen(res.toSetup())
}


function color_pieces(pieces: Pieces): Color {
    if (pieces[0].toLowerCase() === pieces[0]) {
        return 'black'
    }
    return 'white'
}

function parse_piece_and_squares(pieces: Pieces): Piece | undefined {

    if (pieces.includes('quare')) {
        return undefined
    }
    return parse_piece(pieces)
}

function parse_piece(pieces: Pieces): Piece {
    if (pieces === 'app') {
        return { color: 'black', role: 'pawn' }
    }
    if (pieces === 'APP') {
        return { color: 'white', role: 'pawn' }
    }
    let color = color_pieces(pieces)
    let role = pieces.replace(/2/, '').toLowerCase() as Role
    return {
        color,
        role
    }
}
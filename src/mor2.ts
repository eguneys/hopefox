import { attacks, between } from "./attacks"
import { Chess } from "./chess"
import { EMPTY_FEN, makeFen, parseFen } from "./fen"
import { AlignmentSentence, AreAlignedSentence, AttacksSentence, BlocksAlignmentSentence, CanForkSentence, EyesSentence, IsAroundTheKingSentence, Lexer, Parser } from "./mor1"
import { SquareSet } from "./squareSet"
import { Color, Piece, Role, Square } from "./types"
import { parseSquare } from "./util"

type Pieces = 'king' | 'King' | 'rook' | 'Rook' | 'queen' | 'Queen' | 'knight' | 'Knight' | 'bishop' | 'Bishop' | 'pawn' | 'Pawn'
| 'rook2' | 'bishop2' | 'knight2'
| 'Rook2' | 'Bishop2' | 'Knight2'

const Pieces: Pieces[] = ['king','King','rook','Rook', 'queen', 'Queen', 'knight', 'Knight', 'bishop', 'Bishop', 'pawn', 'Pawn',
    'rook2', 'bishop2', 'knight2',
    'Rook2', 'Bishop2', 'Knight2',
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

    }
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


const qc_alignment = (p1: Pieces, p2: Pieces) => (q: QBoard) => {
    let piece1 = parse_piece(p1)
    let piece2 = parse_piece(p2)

    let res1 = SquareSet.empty()
    let res2 = SquareSet.empty()

    for (let p1s of q[p1]) {
        for (let p2s of attacks(piece1, p1s, SquareSet.empty()).intersect(q[p2])) {

            if (attacks(piece2, p2s, SquareSet.empty()).has(p1s)) {
                res1 = res1.set(p1s, true)
                res2 = res2.set(p2s, true)
            }
        }
    }

    q[p1] = res1
    q[p2] = res2
}


const qc_attacks = (p1: Pieces, p2: Pieces) => (q: QBoard) => {
    let piece1 = parse_piece(p1)
    let piece2 = parse_piece(p2)

    let res2 = SquareSet.empty()

    for (let p1s of q[p1]) {
        res2 = res2.union(attacks(piece1, p1s, SquareSet.empty()).intersect(q[p2]))
    }

    q[p2] = res2
}

const qc_attacks_blocker = (p1: Pieces, p2: Pieces, blocker: Pieces) => (q: QBoard) => {
    let piece1 = parse_piece(p1)
    let piece2 = parse_piece(p2)
    let blocker1 = parse_piece(blocker)

    let res1 = SquareSet.empty()
    let res2 = SquareSet.empty()
    let res3 = SquareSet.empty()

    for (let p1s of q[p1]) {
        for (let p2s of attacks(piece1, p1s, SquareSet.empty()).intersect(q[p2])) {
            for (let b1s of q[blocker]) {

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
    let piece1 = parse_piece(p1)
    let piece2 = parse_piece(p2)
    let blocker1 = parse_piece(b1)

    let res1 = SquareSet.empty()
    let res2 = SquareSet.empty()
    let res3 = SquareSet.empty()

    for (let p1s of q[p1]) {
        for (let p2s of attacks(piece1, p1s, SquareSet.empty()).intersect(q[p2])) {

            if (attacks(piece2, p2s, SquareSet.empty()).has(p1s)) {

                for (let b1s of q[b1]) {

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

function qc_pull1(q: QBoard, pieces: Pieces) {
    let f = q[pieces].first()
    if (f === undefined) {
        return false
    }
    q[pieces] = SquareSet.fromSquare(f)
    return true
}

function qc_pull2(q: QBoard, pieces: Pieces[], cc: (q: QBoard) => void) {
    for (let piece of pieces) {
        let q2 = { ... q }
        qc_pull1(q2, piece)
        while (true) {
            if (q_equals(q, q2)) {
                break
            }
            cc(q2)
            q = q2
            q2 = { ...q2 }
        }
    }

    return q
}

const qc_eyes = (p1: Pieces, eyes: Pieces[]) => (q: QBoard) => {
    let piece1 = parse_piece(p1)
    let eyes1 = eyes.map(parse_piece)

    let res1 = SquareSet.empty()
    let res2s = eyes.map(_ => SquareSet.empty())

    for (let p1s of q[p1]) {
        for (let i = 0; i < eyes.length; i++) {
            let p2 = eyes[i]
            let res2 = res2s[i]

            for (let p2s of attacks(piece1, p1s, SquareSet.empty()).intersect(q[p2])) {
                res1 = res1.set(p1s, true)
                res2s[i] = res2.set(p2s, true)
            }
        }
    }

    q[p1] = res1
    eyes.map((eye1, i) => q[eye1] = res2s[i])
}

const qc_is_around_the_king = (p1: Pieces) => (q: QBoard) => {

    let piece = parse_piece(p1)
    let king: Pieces = piece.color === 'white' ? 'King' : 'king'
    let king_piece = parse_piece(king)

    let res = SquareSet.empty()
    for (let ks of q[king]) {
        for (let p1s of attacks(king_piece, ks, SquareSet.empty()).intersect(q[p1])) {
            res = res.set(p1s, true)
        }
    }
    q[p1] = res
}


const qc_can_fork = (p1: Pieces, forked: Pieces[]) => (q: QBoard) => {

    let piece = parse_piece(p1)
    let forked_pieces = forked.map(parse_piece)


    let res1 = SquareSet.empty()
    let res2s = forked.map(_ => SquareSet.empty())

    for (let p1s of q[p1]) {
        for (let a1s of attacks(piece, p1s, SquareSet.empty()))
        for (let i = 0; i < forked.length; i++) {
            let p2 = forked[i]
            let res2 = res2s[i]

            for (let p2s of attacks(piece, a1s, SquareSet.empty()).intersect(q[p2])) {
                res1 = res1.set(p1s, true)
                res2s[i] = res2.set(p2s, true)
            }
        }
    }

    q[p1] = res1
    forked.map((forked1, i) => q[forked1] = res2s[i])
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
        qc_can_fork(x.piece as Pieces, x.forked as Pieces[])

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
    }

    let q = q_board()
    qc_put(q, 'king', parseSquare('g8'))

    //q = qc_pull2(q, ['King', 'king', 'queen', 'Queen', 'bishop', 'Pawn', 'Rook', 'rook', 'Knight', 'rook2', 'pawn'], f)
    //q = qc_pull2(q, ['queen', 'Knight'], f)
    q = qc_pull2(q, ['king', 'queen', 'Knight'], f)

    return qc_fen_singles(q)
}



function qc_fen_singles(q: QBoard) {
    let res = Chess.fromSetupUnchecked(parseFen(EMPTY_FEN).unwrap())

    for (let p of Pieces) {
        let sq = q[p].singleSquare()
        if (sq !== undefined) {

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

function parse_piece(pieces: Pieces): Piece {
    let color = color_pieces(pieces)
    let role = pieces.replace(/2/, '').toLowerCase() as Role
    return {
        color,
        role
    }
}
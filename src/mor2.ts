import { attacks, between } from "./attacks"
import { Chess } from "./chess"
import { EMPTY_FEN, makeFen, parseFen } from "./fen"
import { AlignmentSentence, AttacksSentence, BlocksAlignmentSentence, EyesSentence, Lexer, Parser } from "./mor1"
import { SquareSet } from "./squareSet"
import { Color, Piece, Role, Square } from "./types"
import { parseSquare } from "./util"

type Pieces = 'king' | 'King' | 'rook' | 'Rook' | 'queen' | 'Queen' | 'knight' | 'Knight' | 'bishop' | 'Bishop' | 'pawn' | 'Pawn'

const Pieces: Pieces[] = ['king','King','rook','Rook', 'queen', 'Queen', 'knight', 'Knight', 'bishop', 'Bishop', 'pawn', 'Pawn']

type QBoard = Record<Pieces, SquareSet>

function q_board(): QBoard {
    return {
        king: SquareSet.full(),
        King: SquareSet.full(),
        rook: SquareSet.full(),
        Rook: SquareSet.full(),
        queen: SquareSet.full(),
        Queen: SquareSet.full(),
        knight: SquareSet.full(),
        Knight: SquareSet.full(),
        bishop: SquareSet.full(),
        Bishop: SquareSet.full(),
        pawn: SquareSet.full(),
        Pawn: SquareSet.full(),
    }
}

function q_equals(a: QBoard, b: QBoard) {
    return a.king.equals(b.king) &&
    a.queen.equals(b.queen) &&
    a.bishop.equals(b.bishop) &&
    a.knight.equals(b.knight) &&
    a.rook.equals(b.rook) &&
    a.pawn.equals(b.pawn) &&
    a.King.equals(b.King) &&
    a.Queen.equals(b.Queen) &&
    a.Bishop.equals(b.Bishop) &&
    a.Knight.equals(b.Knight) &&
    a.Rook.equals(b.Rook) &&
    a.Pawn.equals(b.Pawn)
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
            attacks(piece1, p1s, SquareSet.empty()).intersect(q[p2])
        }
    }

    q[p1] = res1
    eyes.map((eye1, i) => q[eye1] = res2s[i])
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
        qc_eyes(x.piece as Pieces, x.eyes)
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
        return (q: QBoard) => {}
    })

    const f = (q: QBoard) => {
        cc.forEach(_ => _(q))
        qc_dedup(q)
    }

    let q = q_board()
    qc_put(q, 'king', parseSquare('g8'))

    q = qc_pull2(q, ['King', 'king', 'queen', 'Queen', 'bishop', 'Pawn', 'Rook', 'rook'], f)

    return qc_fen_singles(q)
}



function qc_fen_singles(q: QBoard) {
    let res = Chess.fromSetupUnchecked(parseFen(EMPTY_FEN).unwrap())

    for (let p of Pieces) {
        let sq = q[p].singleSquare()
        if (sq) {

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
    let role = pieces.toLowerCase() as Role
    return {
        color,
        role
    }
}
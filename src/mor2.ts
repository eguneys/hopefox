import { attacks } from "./attacks"
import { Lexer, Parser } from "./mor1"
import { SquareSet } from "./squareSet"
import { Color, Piece, Role, Square } from "./types"

type Pieces = 'king' | 'King' | 'rook' | 'Rook' | 'queen' | 'Queen' | 'knight' | 'Knight' | 'bishop' | 'Bishop' | 'pawn' | 'Pawn'

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

function qc_backrank(q: QBoard, pieces: Pieces) {
    q[pieces] = q[pieces].intersect(SquareSet.backrank(color_pieces(pieces)))
}

function qc_pull(q: QBoard, pieces: Pieces, square: Square) {
    q[pieces] = q[pieces].intersect(SquareSet.fromSquare(square))
}

function qc_alignment(q: QBoard, p1: Pieces, p2: Pieces) {
    let piece1 = parse_piece(p1)
    let piece2 = parse_piece(p2)

    let res1 = SquareSet.empty()
    let res2 = SquareSet.empty()

    for (let p1s of q[p1]) {
        for (let p2s of attacks(piece1, p1s, SquareSet.empty()).intersect(q[p2])) {

            if (attacks(piece2, p2s, SquareSet.empty()).has(p1s)) {
                res1.set(p1s, true)
                res2.set(p2s, true)
            }
        }
    }

    q[p1] = res1
    q[p2] = res2
}


function qc_attacks(q: QBoard, p1: Pieces, p2: Pieces) {
    let piece1 = parse_piece(p1)
    let piece2 = parse_piece(p2)

    let res2 = SquareSet.empty()

    for (let p1s of q[p1]) {
        res2 = res2.union(attacks(piece1, p1s, SquareSet.empty()).intersect(q[p2]))
    }

    q[p2] = res2
}



export function mor2(text: string) {
    let conds = text.trim().split('\n').filter(_ => !_.startsWith(':'))

    let xx = conds.map(line => {
        let a = new Parser(new Lexer(line)).parse_sentence()
        return a
    })


    return 'hey'
}

function color_pieces(pieces: Pieces): Color {
    if (pieces[0].toLowerCase() === pieces[0]) {
        return 'white'
    }
    return 'black'
}

function parse_piece(pieces: Pieces): Piece {

    let color = color_pieces(pieces)
    let role = pieces.toLowerCase() as Role
    return {
        color,
        role
    }
}
import HM from '../wasm/hopefox.js'
import { parseCastlingFen } from './fen.js'
import { SquareSet } from './squareSet.js'
import { Move, Role, Square } from './types.js'


export type PositionC = number
export type MoveC = number

export type PieceTypeC = number
export type SquareC = number

const PAWN = 1
const KNIGHT = 2
const BISHOP = 3
const ROOK = 4
const QUEEN = 5
const KING = 6

const NORMAL_MOVE = 0
const PROMOTION = 1 << 14
const EN_PASSANT = 2 << 14
const CASTLING = 3 << 14

function make_piece_type(r: Role) {
    switch (r) {
        case 'pawn': return PAWN
        case 'knight': return KNIGHT
        case 'bishop': return BISHOP
        case 'rook': return ROOK
        case 'queen': return QUEEN
        case 'king': return KING
    }
}

function piece_c_to_role(p: PieceTypeC): Role {
    switch (p) {
        case PAWN: return 'pawn'
        case KNIGHT: return 'knight'
        case BISHOP: return 'bishop'
        case ROOK: return 'rook'
        case QUEEN: return 'queen'
        case KING: return 'king'
    }
    throw 'No Piece Type'
}

function make_move(move: Move, castling?: boolean, en_passant?: boolean): MoveC {
    let pt = KNIGHT
    let type = NORMAL_MOVE
    if (move.promotion) {
        pt = make_piece_type(move.promotion)
        type = PROMOTION
    }
    if (en_passant) {
        type = EN_PASSANT
    }
    if (castling) {
        type = CASTLING
    }
    return type + ((pt - KNIGHT) << 12) + (move.from << 6) + move.to
}

export function move_c_to_Move(c: MoveC): Move {

    let to = c & 0x3F
    let from = (c >> 6) & 0x3f
    let type = c & (3 << 14)


    let promotion = type === PROMOTION ? piece_c_to_role(((c >> 12) &  3) + KNIGHT): undefined

    return {
        from,
        to,
        promotion
    }
}


export class PositionManager {

    static async make() {
        let m = await HM()
        m._init()
        return new PositionManager(m)
    }

    constructor(readonly m: any) {}



    create_position(fen: string): PositionC {
        return this.m._create_position(this.stringToWasm(fen))
    }


    delete_position(id: PositionC) {
        this.m._delete_position(id)
    }

    unmake_move(id: PositionC, move: MoveC) {
        this.m._unmake_move(id, move)
    }
    make_move(id: PositionC, move: MoveC) {
        this.m._make_move(id, move)
    }

    get_legal_moves(id: PositionC): MoveC[] {
        const sizePtr = this.m._malloc(4)

        let movesPtr = this.m._get_legal_moves(id, sizePtr)

        const size = this.m.getValue(sizePtr, 'i32')

        let res = []
        for (let i = 0; i < size; i++) {
            const move = this.m.getValue(movesPtr + i * 4, 'i32')
            res.push(move)
        }

        this.m._free(sizePtr)
        this.m._free(movesPtr)

        return res
    }


    attacks(pt: PieceTypeC, s: SquareC, bb: SquareSet): SquareSet {
        const bbPtr = this.m._malloc(4 * 2)

        this.m._attacks(pt, s, bb.lo, bb.hi, bbPtr)

        const lo = this.m.getValue(bbPtr, 'i32')
        const hi = this.m.getValue(bbPtr + 4, 'i32')

        this.m._free(bbPtr)

        return new SquareSet(lo, hi)
    }

    stringToWasm(str: string) {
        let Module = this.m
        // Allocate space in WebAssembly memory (add 1 for null terminator)
        const length = str.length + 1;
        const ptr = Module._malloc(length);

        // Copy the string into the WebAssembly memory (UTF-8 encoding)
        Module.stringToUTF8(str, ptr, length);

        // Return the pointer to the string in WebAssembly memory
        return ptr;
    }

}
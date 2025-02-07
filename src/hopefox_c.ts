import HM from '../wasm/hopefox.js'
import { Chess, Position } from './chess.js'
import { parseCastlingFen, parseFen } from './fen.js'
import { makeSan } from './san.js'
import { SquareSet } from './squareSet.js'
import { Color, Move, Piece, Role, Square } from './types.js'


export type PositionC = number
export type MoveC = number

export type PieceTypeC = number
export type SquareC = number

export type ColorC = number
export type PieceC = number

export const WHITE = 0
export const BLACK = 1


export const PAWN = 1
export const KNIGHT = 2
export const BISHOP = 3
export const ROOK = 4
export const QUEEN = 5
export const KING = 6

export const NO_PIECE = 0
export const W_PAWN = PAWN
export const W_KNIGHT = KNIGHT
export const W_BISHOP = BISHOP
export const W_ROOK = ROOK
export const W_QUEEN = QUEEN
export const W_KING = KING


export const B_PAWN = PAWN + 8
export const B_KNIGHT = KNIGHT + 8
export const B_BISHOP = BISHOP + 8
export const B_ROOK = ROOK + 8
export const B_QUEEN = QUEEN + 8
export const B_KING = KING + 8




const NORMAL_MOVE = 0
const PROMOTION = 1 << 14
const EN_PASSANT = 2 << 14
const CASTLING = 3 << 14

export function role_to_c(r: Role) {
    switch (r) {
        case 'pawn': return PAWN
        case 'knight': return KNIGHT
        case 'bishop': return BISHOP
        case 'rook': return ROOK
        case 'queen': return QUEEN
        case 'king': return KING
    }
}

function c_to_role(p: PieceTypeC): Role {
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
        pt = role_to_c(move.promotion)
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


    let promotion = type === PROMOTION ? c_to_role(((c >> 12) &  3) + KNIGHT): undefined

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

    pos_turn(pos: number): Color {
        if (this.m._get_turn(pos) === WHITE) {
            return 'white'
        }
        return 'black'
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

    pos_attacks(pos: PositionC, sq: SquareC) {
        const bbPtr = this.m._malloc(4 * 2)

        this.m._pos_attacks(pos, sq, bbPtr)

        const lo = this.m.getValue(bbPtr, 'i32')
        const hi = this.m.getValue(bbPtr + 4, 'i32')

        this.m._free(bbPtr)

        return new SquareSet(lo, hi)
    }

    get_pieces_bb(pos: PositionC, pieces: PieceC[]) {
        const bbPtr = this.m._malloc(4 * 2)
        const pPtr = this.m._malloc(4 * pieces.length)

        for (let i = 0; i < pieces.length; i++) {
            this.m.setValue(pPtr + i * 4, pieces[i], 'i32')
        }

        this.m._get_pieces_bb(pos, pPtr, pieces.length, bbPtr)

        const lo = this.m.getValue(bbPtr, 'i32')
        const hi = this.m.getValue(bbPtr + 4, 'i32')

        this.m._free(bbPtr)
        this.m._free(pPtr)

        return new SquareSet(lo, hi)
    }

    get_at(pos: PositionC, sq: SquareC): PieceC | undefined {
        let res = this.m._get_at(pos, sq)
        if (res === NO_PIECE) {
            return undefined
        }
        return res
    }

    is_checkmate(pos: number) {
        return this.m._is_checkmate(pos)
    }

    get_pos_read_fen(pos: PositionC): Position {
        let fen = this.wasmToStringAndFree(this.m._get_fen(pos))

        return Chess.fromSetup(parseFen(fen).unwrap()).unwrap()
    }

    make_san(id: PositionC, move: MoveC) {
        let pos = this.get_pos_read_fen(id)

        return makeSan(pos, move_c_to_Move(move))
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

    wasmToStringAndFree(ptr: number) {
        let Module = this.m
        return Module.UTF8ToString(ptr)
        Module._free(ptr)
    }

}
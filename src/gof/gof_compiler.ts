import { No_Piece_Type, role_to_c } from "../distill/hopefox_c"
import { Role, ROLES } from "../distill/types"
import { composite_name_hash } from "./compiler"
import { CompositeActionId, FreeCompositeRing, Gof, PieceSymbolIdNull, PieceSymbolIdUndefined } from "./types"


export const GofHashTable: Map<CompositeActionId, string> = new Map()

export function Clear_table() {
    GofHashTable.clear()
}

class UnrecognizedPieceIdException extends Error {
    constructor(text: string) {
        super(`Unrecognized piece id: ${text}`)
    }
}

function is_role(text: string): text is Role {
    return ROLES.includes(text as Role)
}

const role_to_c_or_no_piece = (text: string) => {
    if (is_role(text)) {
        return role_to_c(text)
    } else {
        return No_Piece_Type
    }
}

function piece_id_make(text: string) {
    if (text === 'null') {
        return [No_Piece_Type, PieceSymbolIdNull]
    }
    let m = text.match(/([a-zA-Z]*)([0-9]*)?/)

    if (!m) {
        throw new UnrecognizedPieceIdException(text)
    }

    let piece = role_to_c_or_no_piece(m[1])
    let id = m[2] === undefined ? PieceSymbolIdUndefined : parseInt(m[2])

    return [ piece, id ]
}

function piece_symbol_make(text: string) {
    let [a, b] = text.split('_')

    let [piece, id] = piece_id_make(a)
    if (b === undefined) {
        return {
            piece,
            id,
            piece_to: No_Piece_Type,
            id_to: PieceSymbolIdUndefined
        }
    } else {
        let [piece_to, id_to] = piece_id_make(b)
        return {
            piece,
            id,
            piece_to,
            id_to
        }
    }
}

function parse_call(text: string) {

    let m = text.match(/if (.*)\((.*)\) then/)

    if (!m) {
        return undefined
    }

    let id = composite_name_hash(m[1])
    let params = m[2].split(', ').map(_ => piece_symbol_make(_))

    GofHashTable.set(id, text)

    return {
        id,
        params
    }
}

export function compile_str_to_gof(text: string) {

    let res: Gof = []
    let ring: FreeCompositeRing = []

    for (let line of text.split('\n')) {

        let t_line = line.trim()

        if (t_line === '') {
            if (ring.length > 0) {
                res.push(ring.slice(0))
                ring.length = 0
            }
            continue
        }

        let call = parse_call(t_line)

        if (call !== undefined) {
            ring.push(call)
        }
    }

    return res;
}
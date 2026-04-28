import { Role, ROLES } from "../distill/types";
import { AtomicActionId, AtomicFilterId, CompositeActionBody, CompositeActionDefinition, CompositeActionHead, CompositeRing, PieceSymbol, PSymbol, VariableSymbol, VSymbol } from "./types";

export function parse_defs(code: string): CompositeActionDefinition[] {
    let res: CompositeActionDefinition[] = []

    let in_def = false
    let current_head: CompositeActionHead | undefined
    let current_body: CompositeActionBody = []
    for (let line of code.split('\n')) {
        if (!in_def) {
            if (line.includes('#')) {
                in_def = true
            }
            continue
        }

        let m = line.match(/def (.*)\((.*)\)/)

        if (m !== null) {
            if (current_head) {
                res.push({
                    head: current_head,
                    body: current_body
                })
                current_head = undefined
                current_body = []
            }

            let id = m[1]
            let params = m[2].split(', ').map(_ => parse_vsymbol(_))
            current_head = { id, params }
            continue
        }

        let n = line.match(/(.*)\((.*)\)/)

        if (n !== null) {
            let id = parse_atomic_id(n[1].trim())
            let params = n[2].split(', ').map(_ => parse_vsymbol(_))

            current_body.push({
                id,
                params
            })
        }

    }
    if (current_head) {
        res.push({
            head: current_head,
            body: current_body
        })
    }

    return res
}


class BadVariableSymbolException extends Error {
    constructor(s: string) {
        super(`Bad Variable Symbol: ${s}`);
        this.name = "BadVariableSymbolException";
    }
}


class BadAtomicIdException extends Error {
    constructor(s: string) {
        super(`Bad Atomic Id: ${s}`);
        this.name = "BadAtomicIdException";
    }
}



function parse_vsymbol(s: string): VSymbol {
    let [a, b] = s.split('_')

    if (b !== undefined) {
        return {
            id: a,
            id2: b
        }
    }

    return {
        id: s
    }
}

function parse_atomic_id(s: string): AtomicActionId | AtomicFilterId {
    switch (s) {
        case 'move':
            return AtomicActionId.Move
        case 'push':
            return AtomicActionId.Push
        case 'capture':
            return AtomicActionId.Capture
        case 'promote':
            return AtomicActionId.Promote
        case 'attack':
            return AtomicFilterId.Attack
        case 'attack_through':
            return AtomicFilterId.Attack_Through
        case 'no_king_evades':
            return AtomicFilterId.No_King_Evades
        case 'no_captures':
            return AtomicFilterId.No_Captures
        case 'no_blocks_check':
            return AtomicFilterId.No_Blocks_Check
        case 'no_push_blocks_check':
            return AtomicFilterId.No_Push_Blocks_Check
    }
    throw new BadAtomicIdException(s)
}

export function parse_ring(code: string): CompositeRing {
    let res: CompositeRing = []

    for (let line of code.split('\n')) {
        if (line.includes('#')) {
            break
        }

        let m = line.match(/if (.*)\((.*)\) then/)

        if (m === null) {
            continue
        }

        let id = m[1]
        let params = m[2].split(', ').map(_ => piece_symbol_make(_))

        res.push({
            id,
            params
        })
    }

    return res
}

class BadPieceSymbolException extends Error {
    constructor(s: string) {
        super(`Bad Piece Symbol: ${s}`);
        this.name = "BadPieceSymbolException";
    }
}

function piece_symbol_make(s: string): PSymbol {
    let [a, b] = s.split('_')

    if (b !== undefined) {
        return {
            a: piece_symbol_make(a) as PieceSymbol,
            b: piece_symbol_make(b) as PieceSymbol
        }
    }

    let id

    for (let role of ROLES) {
        id = piece_symbol_id(role, s)
        if (id !== undefined) {
            return {
                piece: role,
                id: `${id}`
            }
        }
    }

    throw new BadPieceSymbolException(s)
    function piece_symbol_id(role: Role, s: string) {
        if (s.startsWith(role)) {
            return s.slice(role.length)
        }
        return undefined
    }
}
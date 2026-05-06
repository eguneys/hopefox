import { Role, ROLES } from "../distill/types";
import { AtomicActionId, AtomicFilterId, CompositeActionBody, CompositeActionCall, CompositeActionDefinition, CompositeActionHead, CompositeNestedGraphNode, CompositeNestedGraphRoot, CompositeRing, PieceSymbol, PSymbol, Quantification, VariableSymbol, Visual_CompositeActionCall, Visual_CompositeNestedGraphNode, Visual_CompositeNestedGraphRoot, VSymbol } from "./types";

export function parse_defs(code: string): CompositeActionDefinition[] {
    let res: CompositeActionDefinition[] = []

    code = code.split('###')[code.split('###').length - 1]

    let current_head: CompositeActionHead | undefined
    let current_body: CompositeActionBody = []
    for (let line of code.split('\n')) {

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


export class BadVariableSymbolException extends Error {
    constructor(s: string) {
        super(`Bad Variable Symbol: ${s}`);
        this.name = "BadVariableSymbolException";
    }
}


export class BadAtomicIdException extends Error {
    constructor(s: string) {
        super(`Bad Atomic Id: ${s}`);
        this.name = "BadAtomicIdException";
    }
}



export function parse_vsymbol(s: string): VSymbol {
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

export function parse_atomic_id(s: string): AtomicActionId | AtomicFilterId {
    switch (s) {
        case 'safe_move':
            return AtomicActionId.Safe_Move
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
        case 'defend':
            return AtomicFilterId.Defend
        case 'about_to_promote':
            return AtomicFilterId.About_To_Promote
        case 'about_to_push':
            return AtomicFilterId.About_To_Push
        case 'no_king_evades':
            return AtomicFilterId.No_King_Evades
        case 'no_captures':
            return AtomicFilterId.No_Captures
        case 'no_blocks_check':
            return AtomicFilterId.No_Blocks_Check
        case 'no_push_blocks_check':
            return AtomicFilterId.No_Push_Blocks_Check
        case 'no_defense':
            return AtomicFilterId.No_Defense
        case 'no_attack':
            return AtomicFilterId.No_Attack
        case 'same':
            return AtomicFilterId.Same
        case 'opposite':
            return AtomicFilterId.Opposite
        case 'backrank_wall':
            return AtomicFilterId.BackrankWall
    }
    throw new BadAtomicIdException(s)
}

export class BadPieceSymbolException extends Error {
    constructor(s: string) {
        super(`Bad Piece Symbol: ${s}`);
        this.name = "BadPieceSymbolException";
    }
}

export function piece_symbol_make(s: string): PSymbol {
    let [a, b] = s.split('_')

    if (b !== undefined) {
        return {
            a: piece_symbol_make(a) as PieceSymbol,
            b: piece_symbol_make(b) as PieceSymbol
        }
    }

    let is_negation_bag = false
    let global_id = undefined

    if (s.endsWith('!')) {
        s = s.slice(0, s.length - 1)
        is_negation_bag = true
    }

    if (s.startsWith('$')) {
        s = s.slice(1)
        global_id = s
    }


    let id

    for (let role of ROLES) {
        id = piece_symbol_id(role, s)
        if (id !== undefined) {
            return {
                is_negation_bag,
                global_id,
                piece: role,
                id: `${id}`
            }
        }
    }

    return {
        is_negation_bag,
        global_id,
        id: `${s}`
    }

    function piece_symbol_id(role: Role, s: string) {
        if (s.startsWith(role)) {
            return s.slice(role.length)
        }
        return undefined
    }
}


export function parse_nested_graph_root(code: string): CompositeNestedGraphRoot {

    code = code.split('###')[code.split('###').length - 2]
    const lines = code.split('\n').filter(line => line.trim() !== '');

    let root: CompositeNestedGraphRoot = []
    const stack: { indent: number; node: CompositeNestedGraphNode }[] = [];

    let last_calls

    lines.forEach(line => {
        const indent = line.search(/\S/); // Count leading spaces
        const trimmed = line.trim();

        // Extract Type and Condition using Regex
        const match = trimmed.match(/^(ve|if|forall)\s+(.*?)[\s+then]?$/);
        if (!match) return;

        if (match[1] === 've') {

            let m2 = match[2].trim().match(/(.*)\((.*)\)/)
            if (!m2) return

            let id = m2[1]
            let params = m2[2].split(', ').map(_ => piece_symbol_make(_))

            let call = {
                id,
                params
            }

            last_calls.push(call)
            return
        }

        let quantification = match[1] === 'if' ? Quantification.IfThen : Quantification.ForAll

        let m2 = match[2].trim().match(/(.*)\((.*)\)/)

        if (!m2) return

        let id = m2[1]
        let params = m2[2].split(', ').map(_ => piece_symbol_make(_))

        let call = {
            id,
            params
        }

        last_calls = [call]

        const newNode: CompositeNestedGraphNode = {
            data: {
                quantification,
                call: last_calls
            },
            children: []
        };

        // Find the correct parent based on indentation
        while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
            stack.pop();
        }

        if (stack.length === 0) {
            root.push(newNode);
        } else {
            stack[stack.length - 1].node.children.push(newNode);
        }

        stack.push({ indent, node: newNode });
    });

    return root

}


export function visual_parse_nested_graph_root(code: string): Visual_CompositeNestedGraphRoot {

    code = code.split('###')[code.split('###').length - 2]
    const lines = code.split('\n').filter(line => line.trim() !== '');

    let root: Visual_CompositeNestedGraphRoot = []
    const stack: { indent: number; node: Visual_CompositeNestedGraphNode }[] = [];

    let last_calls: Visual_CompositeActionCall[] = []

    lines.forEach((line, line_idx) => {
        let line_no = line_idx + 1
        let name = line

        const indent = line.search(/\S/); // Count leading spaces
        const trimmed = line.trim();

        // Extract Type and Condition using Regex
        const match = trimmed.match(/^(ve|if|forall)\s+(.*?)[\s+then]?$/);
        if (!match) return;

        if (match[1] === 've') {

            let m2 = match[2].trim().match(/(.*)\((.*)\)/)
            if (!m2) return

            let id = m2[1]
            let params = m2[2].split(', ').map(_ => piece_symbol_make(_))

            let call: Visual_CompositeActionCall = {
                name,
                params,
                witness: [],
                line_no
            }

            last_calls.push(call)
            return
        }

        let quantification = match[1] === 'if' ? Quantification.IfThen : Quantification.ForAll

        let m2 = match[2].trim().match(/(.*)\((.*)\)/)

        if (!m2) return

        let id = m2[1]
        let params = m2[2].split(', ').map(_ => piece_symbol_make(_))

        let call: Visual_CompositeActionCall = {
            name,
            params,
            witness: [],
            line_no
        }

        last_calls = [call]

        const newNode: Visual_CompositeNestedGraphNode = {
            data: {
                quantification,
                call: last_calls
            },
            children: []
        };

        // Find the correct parent based on indentation
        while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
            stack.pop();
        }

        if (stack.length === 0) {
            root.push(newNode);
        } else {
            stack[stack.length - 1].node.children.push(newNode);
        }

        stack.push({ indent, node: newNode });
    });

    return root

}
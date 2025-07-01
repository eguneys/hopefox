import { c_to_piece, move_c_to_Move, MoveC, PositionC } from "./hopefox_c"
import { FEN, Line, parse_line_recur, parse_rules, ParsedSentence, Pieces } from "./mor3_hope1"
import { Move, Piece, Square } from "./types"
import { m } from './mor3_hope1'
import { moveEquals } from "./util"
import { makeSan } from "./san"



export function mor_nogen(text: string, fen: FEN) {

    let root = parse_rules(text)
    parse_line_recur(root)


    let res = pos_node(root)

    let pos = m.create_position(fen)

    let cxx = extract_p_context(pos)

    let pos_root = cxx.map(context => ({
        data: {
            move: undefined,
            context
        }
    }))


    pos_node_expand(res, pos_root, pos)


    let res_out = print_node(res, pos)

    m.delete_position(pos)
    return res_out
}

type PosNode = {
    sentence: ParsedSentence
    children: PosNode[]
    res: PosExpansionNode[]
    children_resolved: boolean
    line: Line
}

type PosExpansionNode = {
    parent?: PosExpansionNode
    data: PosExpansion
}

type PosExpansion = {
    context: PContext
    move?: MoveC
}

type PContext = Record<Pieces, Square>

type PConstraint = (pex: PosExpansion) => boolean


function pos_node(root: Line): PosNode {
    let sentence = root.sentence
    let children = root.children.map(pos_node)

    return {
        sentence,
        children,
        res: [],
        children_resolved: false,
        line: root
    }
}


function pos_node_expand(node: PosNode, pp_parent: PosExpansionNode[], pos: PositionC): PosExpansionNode[] {

    let sub_res: PosExpansionNode[] = []
    let res: PosExpansionNode[] = node.res

    let cc = resolve_cc(node.sentence)

    for (let p_parent of pp_parent) {

        let eqq = pe_expand_precessor(node.sentence, p_parent, pos)

        eqq = eqq.filter(cc)

        for (let eq of eqq)
            res.push({
                parent: p_parent,
                data: eq
            })
    }

    if (node.sentence.precessor === 'E' || node.sentence.precessor === '.') {
        let lqq = res
        for (let c of node.children) {
            let eqq = pos_node_expand(c, lqq, pos)

            lqq = lqq.filter(p => !eqq.find(_ => _ === p || _.parent === p))
        }
        if (node.children.length === 0 || lqq.length < pp_parent.length) {
            node.children_resolved = true
        }
    } else if (node.sentence.precessor === 'A') {
        let lqq = res
        for (let c of node.children) {
            let eqq = pos_node_expand(c, lqq, pos)

            lqq = lqq.filter(p => !eqq.find(_ => _ === p || _.parent === p))
        }
        if (node.children.length === 0 || lqq.length === 0) {
            node.children_resolved = true
        }
    } else {
        node.children_resolved = true
    }

    return res
}

function pcc_move_attack(sentence: ParsedSentence): PConstraint {
    return (p: PosExpansion) => {

        return true
    }
}

const pcc_no_constraint = () => true

function resolve_cc(sentence: ParsedSentence): PConstraint {

    if (sentence.type === 'move_attack') {
        return pcc_move_attack(sentence)
    }
    return pcc_no_constraint
}

function pe_expand_precessor(sentence: ParsedSentence, p: PosExpansionNode, pos: PositionC): PosExpansion[] {
    if (['E', 'A', '*'].includes(sentence.precessor)) {
        if (p.data.move) {
            m.make_move(pos, p.data.move)
            let res = m.get_legal_moves(pos)
            let res_out = res.map(move => ({ move, context: p_context_make_move(p.data.context, pos, move) }))
            m.unmake_move(pos, p.data.move)
            return res_out
        } else {
            return m.get_legal_moves(pos).map(move => ({ move, context: p_context_make_move(p.data.context, pos, move) }))
        }
    } else {
        return [p.data]
    }
}



function print_m(e: PosExpansionNode, pos_c: PositionC) {

    if (!e.data.move) {
        return ''
    }


    if (!e.parent) {
        
        let move = move_c_to_Move(e.data.move)
        m.make_move(pos_c, e.data.move)
        let pos = m.get_pos_read_fen(pos_c)
        m.unmake_move(pos_c, e.data.move)

        let san = makeSan(pos, move)


        return `${san}`
    }


    let moves = []
    let sans = []
    let i: PosExpansionNode = e
    while (i.parent !== undefined) {

        if (!i.data.move) {
            i = i.parent
            continue
        }

        moves.push(i.data.move)

        i = i.parent
    }
    moves.reverse()

    for (let move of moves) {

        let pos = m.get_pos_read_fen(pos_c)
        let san = makeSan(pos, move_c_to_Move(move))

        m.make_move(pos_c, move)
        sans.push(san)
    }
    moves.reverse()
    for (let move of moves) {
        m.unmake_move(pos_c, move)
    }

    return `${sans.join(' ')}`
}

function print_node(n: PosNode, pos: PositionC): string {
    let l = n.line

    let res = ''
    let ind = " ".repeat(l.depth + 1)

    let long = l.long ? 150 : 1

    //let m = l.no_c ? l.p_m : l.m
    //let m = l.no_c ? l.m : l.m

    let m = l.no_c ? n.res : n.res

    let ms = m.slice(0, long).map(_ => print_m(_, pos)).join(', ')

    if (m.length > 1) {
        ms += ' ..' + m.length
    }

    let pass = n.children_resolved

    res += " " + l.rule + (pass ? " OK" : " ?") + " <" + (ms ?? "?") + ">" + "\n"

    let children = n.children.map((c, i) => {
        if (i === n.children.length - 1) {
            res += ind + "└─"
        } else if (i === 0) {
            res += ind + "├─"
        } else {
            res += ind + "│ "
        }
        res += print_node(c, pos)
    }).join('')

    return res
}


function p_context_make_move(ctx: PContext, pos: PositionC, move: MoveC): PContext {

    return ctx
}

function extract_p_context(pos: PositionC): PContext[] {
    return []
}
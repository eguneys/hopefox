import { c_to_piece, move_c_to_Move, MoveC, NO_PIECE, PositionC } from "./hopefox_c"
import { FEN, Line, MoveAttackSentence, parse_line_recur, parse_piece, parse_rules, ParsedSentence, piece2_pieces, Pieces, pieces_of_color } from "./mor3_hope1"
import { Move, Piece, Square } from "./types"
import { m } from './mor3_hope1'
import { moveEquals } from "./util"
import { makeSan } from "./san"
import { SquareSet } from "./squareSet"



export function mor_nogen(text: string, fen: FEN) {

    let root = parse_rules(text)
    parse_line_recur(root)


    let res = pos_node(root)

    let pos = m.create_position(fen)

    let context = extract_p_context(pos)

    let pos_root = {
        data: {
            move: undefined,
            before: context,
            after: context
        }
    }


    pos_node_expand(res, [pos_root], pos)


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
    before: PContext
    after: PContext
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

    let cc = resolve_cc(node.sentence, pos)

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
        let mm = lqq[0]?.data.move
        if (mm) {
            m.make_move(pos, mm)
        }
        for (let c of node.children) {
            let eqq = pos_node_expand(c, lqq, pos)

            lqq = lqq.filter(p => !eqq.find(_ => _ === p || _.parent === p))
        }
        if (mm) {
            m.unmake_move(pos, mm)
        }
        if (node.children.length === 0 || lqq.length < pp_parent.length) {
            node.children_resolved = true
        }
    } else if (node.sentence.precessor === 'A') {
        let lqq = res
        let mm = lqq[0]?.data.move
        if (mm) {
            m.make_move(pos, mm)
        }
        for (let c of node.children) {
            let eqq = pos_node_expand(c, lqq, pos)

            lqq = lqq.filter(p => !eqq.find(_ => _ === p || _.parent === p))
        }
        if (mm) {
            m.unmake_move(pos, mm)
        }
        if (node.children.length === 0 || lqq.length === 0) {
            node.children_resolved = true
        }
    } else {
        node.children_resolved = true
    }

    return res
}

function pcc_move_attack(res: MoveAttackSentence, pos: PositionC): PConstraint {

    let move = parse_piece(res.move)
    let attacks1 = res.attack.map(parse_piece)
    let blocked = res.blocked.map(([a, b]) => [parse_piece(a), parse_piece(b)])
    let unblocked = res.unblocked.map(([a, b]) => [parse_piece(a), parse_piece(b)])

    let captured = res.captured ? parse_piece(res.captured) : undefined

    let attacked_by = res.attacked_by.map(parse_piece)

    let zero_defend = res.zero_defend
    let zero_attack = res.zero_attack

    let is_mate = res.is_mate

    return (pexp: PosExpansion) => {


        if (!pexp.move) {
            return false
        }

        let move_c = pexp.move
        let m1 = move_c_to_Move(pexp.move)

        let bx = pexp.before
        let ax = pexp.after

        if (is_mate) {
            m.make_move(pos, move_c)

            if (!m.is_checkmate(pos)) {
                m.unmake_move(pos, move_c)
                return false
            }

            m.unmake_move(pos, move_c)
        }

        if (bx[res.move] !== m1.from) {
            return false
        }

        if (res.captured) {
            if (bx[res.captured] !== m1.to) {
                return false
            }
        }

        if (res.zero_defend) {
            for (let p1 of get_Pieces(ax)) {
                if (m.pos_attacks(pos, ax[p1]).has(m1.to)) {
                    return false
                }
            }
        }


        if (res.attack) {

            m.make_move(pos, move_c)
            for (let i = 0; i < res.attack.length; i++) {
                let a1s = bx[res.attack[i]]
                if (a1s === undefined) {
                    m.unmake_move(pos, move_c)
                    return false
                }

                if (!m.pos_attacks(pos, m1.to).has(a1s)) {
                    m.unmake_move(pos, move_c)
                    return false
                }

            }
            m.unmake_move(pos, move_c)
        }

        if (res.attacked_by) {
            m.make_move(pos, move_c)
            for (let i = 0; i < res.attacked_by.length; i++) {
                let a1s = bx[res.attacked_by[i]]
                if (a1s === undefined) {
                    m.unmake_move(pos, move_c)
                    return false
                }

                if (!m.pos_attacks(pos, a1s).has(m1.to)) {
                    m.unmake_move(pos, move_c)
                    return false
                }
            }


            for (let b1 of Object.keys(bx)) {
                if (!res.attacked_by.includes(b1)) {
                    let b1s = bx[b1]

                    if (m.pos_attacks(pos, b1s).has(m1.to)) {
                        m.unmake_move(pos, move_c)
                        return false
                    }
                }
            }

            m.unmake_move(pos, move_c)
        }

        return true
    }
}

const pcc_no_constraint = () => true

function resolve_cc(sentence: ParsedSentence, pos: PositionC): PConstraint {

    if (sentence.type === 'move_attack') {
        return pcc_move_attack(sentence, pos)
    }
    return pcc_no_constraint
}

function pe_expand_precessor(sentence: ParsedSentence, p: PosExpansionNode, pos: PositionC): PosExpansion[] {
    if (['E', 'A', '*'].includes(sentence.precessor)) {
        if (p.data.move) {
            let res = m.get_legal_moves(pos)
            let res_out = res.map(move => ({ move, before: p.data.before, after: p_context_make_move(p.data.before, pos, move) }))
            return res_out
        } else {
            return m.get_legal_moves(pos).map(move => ({ move, before: p.data.before, after: p_context_make_move(p.data.before, pos, move) }))
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


function p_context_make_move(ctx: PContext, pos: PositionC, move_c: MoveC): PContext {

    let res: PContext = {}
    let move = move_c_to_Move(move_c)

    for (let p1 of Object.keys(ctx)) {

        if (ctx[p1] === move.from) {
            res[p1] = move.to
        } else if (ctx[p1] === move.to) {
        } else {
            res[p1] = ctx[p1]
        }
    }
    return ctx
}

function extract_p_context(pos: PositionC): PContext {
    let twos: PContext = {}
    for (let sq of SquareSet.full()) {
        let p = m.get_at(pos, sq)
        if (p !== undefined) {
           let p1 = c_to_piece(p)
           
           let p2 = piece2_pieces(p1)

           if (twos[p2] !== undefined) {
               twos[p2 + '2'] = sq
           } else {
               twos[p2] = sq
           }
        }
    }
    return twos
}

export function mor_nogen_find_san(text: string, fen: FEN) {

    let a = mor_nogen(text, fen)

    let m = a.trim().split('\n')[1].match(/<([^>]+)/)

    let res = m?.[1]

    if (res?.includes('.')) {
        return res.slice(0, res.indexOf('.'))
    } else {
        return res
    }
}


function get_Pieces(ax: PContext) {
    return Object.keys(ax).filter(_ => _[0].toLowerCase() !== _[0])
}
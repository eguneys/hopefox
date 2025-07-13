import { c_to_piece, move_c_to_Move, MoveC, NO_PIECE, PositionC } from "./hopefox_c"
import { FEN, Line, MoveAttackSentence, parse_line_recur, parse_piece, parse_rules, ParsedSentence, piece2_pieces, Pieces, pieces_of_color, StillAttackSentence } from "./mor3_hope1"
import { Move, Piece, Square } from "./types"
import { m } from './mor3_hope1'
import { moveEquals } from "./util"
import { makeSan } from "./san"
import { SquareSet } from "./squareSet"
import { moveCursor } from "readline"
import { attacks } from "./attacks"
import { makeFen } from "./fen"



export function mor_nogen(text: string, fen: FEN) {

    let root = parse_rules(text)
    parse_line_recur(root)


    let res = pos_node(root)

    let pos = m.create_position(fen)

    let context = extract_p_context(pos)

    let pos_root = {
        data: {
            path: [],
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
    path: MoveC[]
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
    let res: PosExpansionNode[] = []

    let cc = resolve_cc(node.sentence, pos)

    for (let p_parent of pp_parent) {


        for (let mc of p_parent.data.path) {
            m.make_move(pos, mc)
        }

        if (['E', 'A'].includes(node.sentence.precessor) && p_parent.data.move)
            m.make_move(pos, p_parent.data.move)

        let eqq = pe_expand_precessor(node.sentence, p_parent, pos)


        eqq = eqq.filter(cc)

        for (let eq of eqq)
            res.push({
                parent: p_parent,
                data: eq
            })

        if (['E', 'A'].includes(node.sentence.precessor) && p_parent.data.move)
            m.unmake_move(pos, p_parent.data.move)

        for (let i = p_parent.data.path.length - 1; i >= 0; i--) {
            let mc = p_parent.data.path[i]
            m.unmake_move(pos, mc)
        }


    }

    if (res.length === 0) {
        node.children_resolved = false
        node.res = []
        return node.res
    }


    let lqq = res
    let mls: Map<string, PosExpansionNode[]> = new Map()

    for (let lq of lqq) {
        let m = lq.data.path.join(' ')
        if (!mls.has(m)) {
            mls.set(m, [])
        }
        mls.get(m)!.push(lq)
    }



    if (node.sentence.precessor === 'E' || node.sentence.precessor === '.' || node.sentence.precessor === 'G') {

        for (let [ms, lqq] of mls) {

            let aqq = lqq
            let yes_qq = []
            let no_qq = []
            for (let c of node.children) {

                let resolved = c.children_resolved
                let res = c.res
                c.res = []

                let eqq = pos_node_expand(c, lqq, pos)

                if (c.children_resolved) {
                    for (let p of lqq) {
                        if (eqq.find(_ => _ === p || _.parent === p)) {
                            yes_qq.push(p)
                        } else {
                            no_qq.push(p)
                        }
                    }
                    lqq = no_qq
                }

                c.res.push(...res)
                if (resolved) {
                    c.children_resolved = true
                }


            }

            if (node.children.length === 0) {
                node.res.push(...res)
                node.children_resolved = true
                break
            }

            if (yes_qq.length > 0) {
                node.res.push(...yes_qq)
                node.children_resolved = true
                //break
            }
        }

    } else if (node.sentence.precessor === 'A') {

        node.res = []
        let coverage_done = []
        //console.log('in')
        for (let [ms, lqq] of mls) {
            /*
            let rr = lqq[0].data.path.map(move_c_to_Move)
            if (rr[rr.length - 1].to === 52) {
                console.log(rr)
            }
                */

            let aqq = lqq
            for (let c of node.children) {

                let resolved = c.children_resolved
                let res = c.res
                c.res = []

                let eqq = pos_node_expand(c, lqq, pos)

                if (c.children_resolved) {
                    lqq = lqq.filter(p => !eqq.find(_ => _ === p || _.parent === p))
                }

                c.res.push(...res)
                if (resolved) {
                    c.children_resolved = true
                }


            }

            if (node.children.length > 0 && lqq.length !== 0) {
            } else {
                coverage_done.push(aqq)
            }
        }



        if (coverage_done.length > 0) {
            node.res = coverage_done.flat()
            node.children_resolved = true
        }
    } else {
        node.children_resolved = true
    }

    return node.res
}

function pcc_still_attack(res: StillAttackSentence, pos: PositionC): PConstraint {

    let piece = parse_piece(res.piece)
    let attacks1 = res.attack.map(parse_piece)
    let blocked = res.blocked.map(([a, b, c]) => [parse_piece(a), parse_piece(b), parse_piece(c)])
    let unblocked = res.unblocked.map(([a, b]) => [parse_piece(a), parse_piece(b)])

    let attacked_by = res.attacked_by.map(parse_piece)

    let double_blocked = res.double_blocked.map(([a, b, c]) => [parse_piece(a), parse_piece(b), parse_piece(c)])

    let undefended_by = res.undefended_by.map(parse_piece)

    let zero_defend = res.zero_defend
    let zero_attack = res.zero_attack

    let is_mate = res.is_mate

    return (pexp: PosExpansion) => {

        let p1s = pexp.after[res.piece]
        let ax = pexp.after


        if (p1s === undefined) {
          //  return false
        }

        if (is_mate) {
            if (!m.is_checkmate(pos)) {
                return false
            }
        }

        if (res.zero_defend) {
            for (let p1 of get_Upper(ax)) {
                if (m.pos_attacks(pos, ax[p1]).has(p1s)) {
                    return false
                }
            }
        }

        if (res.zero_attack) {
            for (let p1 of get_Lower(ax)) {
                if (m.pos_attacks(pos, ax[p1]).has(p1s)) {
                    return false
                }
            }
        }


        if (res.attack.length > 0) {

            for (let i = 0; i < res.attack.length; i++) {
                let a1s = ax[res.attack[i]]
                if (a1s === undefined) {
                    return false
                }

                if (!m.pos_attacks(pos, p1s).has(a1s)) {
                    return false
                }

            }
        }

        if (res.attacked_by.length > 0) {
            for (let i = 0; i < res.attacked_by.length; i++) {
                let a1s = ax[res.attacked_by[i]]
                if (a1s === undefined) {
                    return false
                }

                if (!m.pos_attacks(pos, a1s).has(p1s)) {
                    return false
                }
            }


            for (let b1 of Object.keys(ax)) {
                if (!res.attacked_by.includes(b1)) {
                    let b1s = ax[b1]

                    if (m.pos_attacks(pos, b1s).has(p1s)) {
                        return false
                    }
                }
            }
        }

        if (res.undefended_by.length > 0) {
            for (let i = 0; i < res.undefended_by.length; i++) {
                let u1 = res.undefended_by[i]

                if (m.pos_attacks(pos, ax[u1]).has(p1s)) {
                    return false
                }
            }
        }

        if (res.blocked.length > 0) {
            let pos_occupied = m.pos_occupied(pos)
            for (let i = 0; i < res.blocked.length; i++) {
                let pu1 = blocked[i][0]
                let [u1, u2, u3] = res.blocked[i]

                let u1s = ax[u1]
                let u2s = ax[u2]
                let u3s = ax[u3]

                if (u1s === undefined || u2s === undefined || u3s === undefined) {
                    return false
                }

                if (attacks(pu1, u1s, pos_occupied.without(u3s)).has(u2s) &&
                    !attacks(pu1, u1s, pos_occupied).has(u2s)) {
                        continue
                    }

                return false
            }
        }


        if (res.double_blocked.length > 0) {
            let pos_occupied = m.pos_occupied(pos)
            for (let i = 0; i < res.double_blocked.length; i++) {
                let [u2, u3, u4] = res.double_blocked[i]
                let u2s = ax[u2]
                let u3s = ax[u3]
                let u4s = ax[u4]

                if (u2s === undefined || u3s === undefined || u4s === undefined) {
                    return false
                }

                if (
                    attacks(parse_piece(u2), u2s, pos_occupied.without(u3s).without(u4s)).has(p1s) &&
                    !attacks(parse_piece(u2), u2s, pos_occupied.without(u3s)).has(p1s) &&
                    !attacks(parse_piece(u2), u2s, pos_occupied.without(u4s)).has(p1s)
                ) {
                    continue
                }
                return false
            }
        }

        return true
    }
}



function pcc_move_attack(res: MoveAttackSentence, pos: PositionC): PConstraint {

    let move = parse_piece(res.move)
    let attacks1 = res.attack.map(parse_piece)
    let blocked = res.blocked.map(([a, b, c]) => [parse_piece(a), parse_piece(b), parse_piece(c)])
    let unblocked = res.unblocked.map(([a, b]) => [parse_piece(a), parse_piece(b)])

    let captured = res.captured ? parse_piece(res.captured) : undefined

    let attacked_by = res.attacked_by.map(parse_piece)


    let undefended_by = res.undefended_by.map(parse_piece)

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
            for (let p1 of get_Upper(ax)) {
                if (m.pos_attacks(pos, ax[p1]).has(m1.to)) {
                    return false
                }
            }
        }

        if (res.zero_attack) {
            for (let p1 of get_Lower(ax)) {
                if (m.pos_attacks(pos, ax[p1]).has(m1.to)) {
                    return false
                }
            }
        }


        if (res.attack.length > 0) {

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

        if (res.attacked_by.length > 0) {
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

        if (res.unblocked.length > 0) {

            for (let i = 0; i < res.unblocked.length; i++) {
                let [u3, u2] = res.unblocked[i]

                let u3s = ax[u3]
                let u2s = ax[u2]

                if (m.pos_attacks(pos, u3s).has(u2s)) {
                    return false
                }
            }

            m.make_move(pos, move_c)

            for (let i = 0; i < res.unblocked.length; i++) {
                let [u3, u2] = res.unblocked[i]

                let u3s = bx[u3]
                let u2s = bx[u2]

                if (!m.pos_attacks(pos, u3s).has(u2s)) {
                    m.unmake_move(pos, move_c)
                    return false
                }
            }

            m.unmake_move(pos, move_c)
        }

        if (res.undefended_by.length > 0) {
            for (let i = 0; i < res.undefended_by.length; i++) {
                let u1 = res.undefended_by[i]

                if (m.pos_attacks(pos, bx[u1]).has(m1.to)) {
                    return false
                }
            }
        }


        if (res.blocked.length > 0) {
            let pos_occupied = m.pos_occupied(pos)
            m.make_move(pos, move_c)
            for (let i = 0; i < res.blocked.length; i++) {
                let pu1 = blocked[i][0]
                let [u1, u2, u3] = res.blocked[i]

                let u1s = ax[u1]
                let u2s = ax[u2]
                let u3s = ax[u3]

                if (u1s === undefined || u2s === undefined || u3s === undefined) {
                    m.unmake_move(pos, move_c)
                    return false
                }

                if (attacks(pu1, u1s, pos_occupied.without(u3s)).has(u2s) &&
                    !attacks(pu1, u1s, pos_occupied).has(u2s)
                ) {
                    continue
                }
                m.unmake_move(pos, move_c)
                return false

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
    } else if (sentence.type === 'still_attack') {
        return pcc_still_attack(sentence, pos)
    } else if (sentence.type === 'g_still_attack') {
        let aa = sentence.attacks.map(_ => pcc_still_attack(_, pos))
        return (exp: PosExpansion) => {
            return aa.every(_ => _(exp))
        }
    }
    return pcc_no_constraint
}

function pe_expand_precessor(sentence: ParsedSentence, p: PosExpansionNode, pos: PositionC): PosExpansion[] {
    if (['E', 'A', '*'].includes(sentence.precessor)) {
        let path = p.data.path.slice(0)
        if (p.data.move) {
            path.push(p.data.move)
        }
        return m.get_legal_moves(pos).map(move => ({ 
            path,
            move, 
            before: p.data.after, 
            after: p_context_make_move(p.data.after, pos, move) 
        }))
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


    let moves = e.data.path.slice(0)
    moves.push(e.data.move)
    let sans = []
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
    return res
}

function extract_p_context(pos: PositionC): PContext {
    let twos: PContext = {}
    for (let sq of SquareSet.full()) {
        let p = m.get_at(pos, sq)
        if (p !== undefined) {
           let p1 = c_to_piece(p)
           
           let p2 = piece2_pieces(p1)

           if (twos[p2] !== undefined) {
               for (let i = 2; i <= 8; i++) {
                   if (twos[p2 + i] === undefined) {
                       twos[p2 + i] = sq
                       break
                   }
               }
           } else {
               twos[p2] = sq
           }
        }
    }
    return twos
}

export function mor_nogen_find_san(text: string, fen: FEN) {

    let a = mor_nogen(text, fen)

    let m = 
    a.trim().split('\n')[1]?.match(/E [^O]*OK <([^>]+)/) ??
    a.trim().split('\n')[2]?.match(/E [^O]*OK <([^>]+)/) 

    let res = m?.[1]

    if (res?.includes('.')) {
        return res.slice(0, res.indexOf('.'))
    } else {
        return res
    }
}


function get_Upper(ax: PContext) {
    return Object.keys(ax).filter(_ => _[0].toLowerCase() !== _[0])
}
function get_Lower(ax: PContext) {
    return Object.keys(ax).filter(_ => _[0].toLowerCase() === _[0])
}




function ctx_equals(a: PContext, b: PContext) {
    for (let aa of Object.keys(a)) {
        if (a[aa] !== b[aa]) {
            return false
        }
    }
    for (let aa of Object.keys(b)) {
        if (a[aa] !== b[aa]) {
            return false
        }
    }
    return true
}
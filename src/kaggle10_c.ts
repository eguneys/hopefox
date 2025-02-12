import { move_c_to_Move, MoveC, PieceTypeC, PositionC, PositionManager, role_to_c, SquareC } from "./hopefox_c"
import { Color, Move } from "./types"
import { W_KNIGHT, W_BISHOP, W_ROOK, W_QUEEN, W_PAWN, W_KING } from './hopefox_c'
import { B_KNIGHT, B_BISHOP, B_ROOK, B_QUEEN, B_PAWN, B_KING } from './hopefox_c'
import { WHITE, BLACK } from './hopefox_c'
import { opposite } from "./util"
import { SquareSet } from "./squareSet"
import { Chess, Position } from "./chess"
import { makeSan } from "./san"
import { san } from "."
import { makeFen, parseFen } from "./fen"

export function set_debug() {
    DEBUG = true
}

let DEBUG = false

export function find_san10_c(fen: string, rules: string, m: PositionManager) {

    let root = make_root(fen, rules, m)

    let c = root.children[0]?.m[0]

    if (!c) {
        return undefined
    }

    let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()

    return print_m(c, pos, false)
}

function ctx_make_move(c: Context, move: MoveC) {
    let { from, to } = move_c_to_Move(move)

    let res: Context = {}
    for (let key of Object.keys(c)) {
        res[key] = c[key]
        if (q_to_roles_c(key, 'white').length > 0) {

            if (c[key] === from) {
                res[key] = to
            } else if (c[key] === to) {
                res[key] = -res[key]
            }
        }
    }

    return res
}

export function match_rules(l: Line, pos: PositionC, moves: MoveC[], ctx: Context, lowers_turn: Color, m: PositionManager): CGroup | undefined {

    if (l.rule[0] === 'E') {
        let a_ctx = ctx
        if (moves.length > 0) {
            m.make_move(pos, moves[moves.length - 1])

            a_ctx = ctx_make_move(ctx, moves[moves.length - 1])
        }

        let rule = l.rule.slice(1).trim()

        let covered_push = false
        for (let move of m.get_legal_moves(pos)) {

            let a
            if (DEBUG) {
                a = m.make_san(pos, move)
                if (a === 'Bxb5') {
                    console.log(a)
                }
            }

            let matched: CGroup = [a_ctx]

            if (rule) {
                let i = match_rule_comma(rule, a_ctx, pos, move, lowers_turn, m)
                if (i === undefined || i.length === 0) {
                    continue
                }
                matched = i
            }

            let nb_matched = matched.length

            for (let child of l.children) {
                if (matched.length === 0) {
                    break
                }
                matched = matched.filter(cc => 
                    !match_rules(child, pos, [...moves, move], cc, lowers_turn, m))
            }

            if (l.children.length === 0 && matched.length > 0) {
                l.m.push(({ ms: [...moves, move], ctx: a_ctx }))
                covered_push = true
            }

            if (matched.length < nb_matched) {
                l.m.push(({ ms: [...moves, move], ctx: a_ctx }))
                covered_push = true
            }
        }


        let res: CGroup | undefined = [ctx]

        if (covered_push) {
        } else {
            res = undefined
        }


        if (moves.length > 0) {
            m.unmake_move(pos, moves[moves.length - 1])
        }
        return res
    }

    if (l.rule[0] === 'A') {
        let a_ctx = ctx
        if (moves.length > 0) {
            m.make_move(pos, moves[moves.length - 1])
            a_ctx = ctx_make_move(ctx, moves[moves.length - 1])
        }

        let rule = l.rule.slice(1).trim()

        let covered_push = true
        for (let move of m.get_legal_moves(pos)) {

            let a
            if (DEBUG) {
                a = m.make_san(pos, move)
                if (a.includes('gxh6')) {
                    console.log(a)
                }
            }

            let matched: CGroup = [a_ctx]

            for (let child of l.children) {
                if (matched.length === 0) {
                    break
                }
                matched = matched.filter(cc => 
                    !match_rules(child, pos, [...moves, move], cc, lowers_turn, m))
            }

            if (matched.length > 0) {
                covered_push = false
                break
            }
        }

        let res: CGroup | undefined = [ctx]
        if (covered_push) {
            l.m.push(...res.map(ctx => ({ ms: moves, ctx })))
        } else {
            res = undefined
        }

        if (moves.length > 0) {
            m.unmake_move(pos, moves[moves.length - 1])
        }
        return res
    }

    let rule = l.rule[0] === '\\' ? l.rule.slice(1) : l.rule
    let move = moves[moves.length - 1]

    let i = match_rule_comma(rule, ctx, pos, move, lowers_turn, m)

    if (i === undefined || i.length === 0) {
        return undefined
    }

    let matched = i

    if (l.children.length === 0) {
        l.m.push(({ ms: moves, ctx }))
        return matched
    }

    for (let child of l.children) {
        if (matched.length === 0) {
            break
        }
        matched = matched.filter(cc =>
            !match_rules(child, pos, moves, cc, lowers_turn, m))
    }

    if (matched.length === 0) {
        if (moves.length > 0) {
            l.m.push(({ ms: moves, ctx }))
        }
        return [ctx]
    }

    return undefined
}

export function make_root(fen: string, rules: string, m: PositionManager) {
    let pos = m.create_position(fen)

    let root = parse_rules(rules)

    if (root.children.length === 0) {
        return root
    }

    match_rules(root, pos, [], {}, m.pos_turn(pos), m)

    m.delete_position(pos)

    return root
}



export function parse_rules(str: string): Line {
    let ss = str.trim().split('\n')

    let root = { depth: -1, rule: '.', children: [], p_m: [], m: [], n: [], long: false, no_c: false }
    const stack: Line[] = [root]

    for (let i = 0; i < ss.length; i++) {
        let line = ss[i]
        let rule = line.trim()
        if (!rule) continue

        const depth = line.search(/\S/)

        let no_c = false
        let long = false
        if (rule[rule.length - 1] === '5') {
            long = true
            rule = rule.slice(0, -1).trim()
        }

        if (rule[rule.length - 1] === '9') {
            no_c = true
            rule = rule.slice(0, -1).trim()
        }



        let node: Line  = { depth, rule, children: [], p_m: [], m: [], long, no_c }

        while (stack.length > depth + 1) {
            stack.pop()
        }

        stack[stack.length - 1].children.push(node)
        stack.push(node)
    }
    return root
}

export function print_m(m: M, pos: Position, no_c: boolean) {
    pos = pos.clone()
   
    let sans = m.ms.map((c: MoveC) => {
        let move = move_c_to_Move(c)
        let san = makeSan(pos, move)
        pos.play(move)
        return san
    })

    let c_ctx = no_c ? JSON.stringify(m.ctx) : ''

    return sans.join(' ') + c_ctx
}

export function print_rules(l: Line, pos: Position): string {

    let res = ''
    let ind = " ".repeat(l.depth + 1)

    let long = l.long ? 150 : 1

    let m = l.m

    let ms = m.slice(0, long).map(_ => print_m(_, pos, l.no_c)).join(', ')

    if (m.length > 1) {
        ms += '..' + m.length
    }

    res += " " + l.rule + " <" + (ms ?? "?") + ">" + "\n"

    let children = l.children.map((c, i) => {
        if (i === l.children.length - 1) {
            res += ind + "└─"
        } else if (i === 0) {
            res += ind + "├─"
        } else {
            res += ind + "│ "
        }
        res += print_rules(c, pos)
    }).join('')

    return res
}


export type Line = {
    depth: number,
    rule: string,
    children: Line[],
    m: M[],
    p_m: M[],
    long: boolean,
    no_c: boolean
}

export type M = {
    ms: MoveC[],
    ctx: Context
}


export type Var = string

export type Context = Record<Var, SquareC>

export type CGroup = Context[]

function match_rule(rule: string, g: Context, pos: PositionC, last_move: MoveC, lowers_turn: Color, m: PositionManager): CGroup | undefined {
    if (rule === '.') {
        return [g]
    }

    let aa: CGroup = []
    let [from, ...tos] = rule.split(' ')

    let frr = match_str_pc_from(from, g, pos, last_move, lowers_turn, m)

    if (!frr) {
        return undefined
    }

    let [q_from, rr] = frr

    let pushed = false
    for (let r of rr) {

        let a = tos.reduce((acc, to) =>
            acc.flatMap(_ => match_str_pc_to(to, q_from, _, pos, last_move, lowers_turn, m) ?? []), [r])
        if (!a || a.length === 0) {
            continue
        }
        pushed = true
        aa.push(...a)
    }

    return aa
}

export function match_rule_comma(rule: string, ctx: Context, pos: PositionC, last_move: MoveC, lowers_turn: Color, m: PositionManager): CGroup | undefined {
    let g = [ctx]
    let rr = rule.split(',')
    for (let r of rr) {
        let ag: CGroup = []
        for (let ctx of g) {
            let ii = match_rule(r.trim(), ctx, pos, last_move, lowers_turn, m)
            if (ii !== undefined) {
                ag.push(...ii)
            }
        }
        g = ag
    }
    return g
}

function match_str_pc_to(str: string, from_q: Var, ctx: Context, pos: PositionC, last_move: MoveC, lowers_turn: Color, m: PositionManager): Context[] | undefined {
    let li = str.match(/^"(\w*)$/)?.[1]
    let eh7 = str.match(/\=([a-h][1-8])$/)
    let eb = str.match(/\=([pqrnbkPQRNBKmjuaglMJUAGL]'?)$/)
    let oc1 = str.match(/\+([a-h][1-8])$/)
    let ocR = str.match(/\+([pqrnbkPQRNBKmjuaglMJUAGL]'?)$/)
    let bbK = str.match(/^([pqrnbkPQRNBKmjuaglMJUAGL]'?)\/([pqrnbkPQRNBKmjuaglMJUAGL]'?)$/)
    let uqQ = str.match(/^([pqrnbkPQRNBKmjuaglMJUAGL]'?)\+([pqrnbkPQRNBKmjuaglMJUAGL]'?)$/)

    if (li) {
        if (li !== m.make_san(pos, last_move)) {
            return undefined
        }
        return [ctx]
    }



    if (str.match(/#/)) {

        let s = m.make_move(pos, last_move)
        let mated = m.is_checkmate(pos)
        m.unmake_move(pos, last_move)

        if (!mated) {
            return undefined
        } else {
            return [ctx]
        }
    }

    let res = []

    if (ctx[from_q] === undefined || ctx[from_q] < 0) {
        return undefined
    }

    let q_piece = m.get_at(pos, ctx[from_q])!

    let { from, to } = move_c_to_Move(last_move)

    let m_piece =  m.get_at(pos, from)!
    let x_piece = m.get_at(pos, to)


    if (uqQ) {
        let [_, q, Q] = uqQ

        let bb = ctx[q] ? SquareSet.fromSquare(ctx[q]) : m.get_pieces_bb(pos, q_to_roles_c(q, lowers_turn))
        let KK = ctx[Q] ? SquareSet.fromSquare(ctx[Q]) : m.get_pieces_bb(pos, q_to_roles_c(Q, lowers_turn))

        for (let ibb of bb) {
            let ikk = m.pos_attacks(pos, ibb).intersect(KK).singleSquare()

            m.make_move(pos, last_move)

            let ikk2 = m.pos_attacks(pos, ibb).intersect(KK).singleSquare()

            if (ikk === undefined && ikk2 !== undefined) {
                res.push({...ctx, [q]: ibb, [Q]: ikk2})
            }
            m.unmake_move(pos, last_move)
        }

        return res
    }



    if (bbK) {
        let [_, b, K] = bbK


        let bb = ctx[b] ? SquareSet.fromSquare(ctx[b]) : m.get_pieces_bb(pos, q_to_roles_c(b, lowers_turn))
        let KK = ctx[K] ? SquareSet.fromSquare(ctx[K]) : m.get_pieces_bb(pos, q_to_roles_c(K, lowers_turn))

        for (let ibb of bb) {
            let ikk = m.pos_attacks(pos, ibb).intersect(KK).singleSquare()

            m.make_move(pos, last_move)

            let ikk2 = m.pos_attacks(pos, ibb).intersect(KK).singleSquare()

            if (ikk !== undefined && ikk2 === undefined) {
                res.push({...ctx, [b]: ibb, [K]: ikk})
            }
            m.unmake_move(pos, last_move)
        }

    }

    if (eb) {

        let [_, b] = eb

        if (!x_piece) {
            return undefined
        }
        

        if (ctx[b] !== undefined) {
            if (ctx[b] !== to) {
                return undefined
            }
            return [ctx]
        }


        let roles = q_to_roles_c(b, lowers_turn)

        // TODO bb set
        if (!roles.find(r => r === x_piece)) {
            return undefined
        }

        let c = { ...ctx, [b]: to }

        res.push(c)
    }


    if (eh7) {
        let [_, h7] = eh7

        if (ctx[h7] !== undefined) {
            if (ctx[h7] !== to) {
                return undefined
            }
            return [ctx]
        }

        let c = {...ctx, [h7]: to }
        res.push(c)
    }

    if (oc1) {
        let [_, c1] = oc1

        m.make_move(pos, last_move)

        let a_to = ctx[from_q]
        if (a_to === from) {
            a_to = to
        }

        let attacks = m.pos_attacks(pos, a_to)

        if (ctx[c1] !== undefined) {
            if (!attacks.has(ctx[c1])) {
                m.unmake_move(pos, last_move)
                return undefined
            }
            let c = {...ctx}
            res.push(c)
        } else {
            for (let c_sq of attacks) {
                let c = { ...ctx, [c1]: c_sq }
                res.push(c)
            }
        }

        m.unmake_move(pos, last_move)
    }

    if (ocR) {
        let [_, R] = ocR


        m.make_move(pos, last_move)
        let a_to = ctx[from_q]
        if (a_to === from) {
            a_to = to
        }

        let attacks = m.pos_attacks(pos, a_to)

        if (ctx[R] !== undefined) {
            if (!attacks.has(ctx[R])) {
                m.unmake_move(pos, last_move)
                return undefined
            } else {
                m.unmake_move(pos, last_move)
                return [ctx]
            }
        }

        let r_roles = m.get_pieces_bb(pos, q_to_roles_c(R, lowers_turn))

        for (let c_sq of attacks.intersect(r_roles)) {
            let c = {...ctx, [R]: c_sq}
            res.push(c)
        }

        m.unmake_move(pos, last_move)
    }

    return res
}



function match_str_pc_from(str: string, ctx: Context, pos: PositionC, last_move: MoveC, lowers_turn: Color, m: PositionManager): [Var, Context[]] | undefined {

    let li = str.match(/^"(\w*)$/)?.[1]
    let eq = str.match(/^=([pqrnbkPQRNBKmjuaglMJUAGL]'?)$/)?.[1]
    let qe = str.match(/^([pqrnbkPQRNBKmjuaglMJUAGL]'?)=$/)?.[1]
    let qq = str.match(/^([pqrnbkPQRNBKmjuaglMJUAGL]'?)$/)?.[1]
    let ec1 = str.match(/^=([a-h][1-8])$/)?.[1]

    let res: Context[] = []

    let { from, to } = move_c_to_Move(last_move)

    if (li) {
        if (li !== m.make_san(pos, last_move)) {
            return undefined
        }
        return [li, [ctx]]
    }

    if (ec1) {

        let q = ec1
        if (ctx[q] !== undefined) {
            if (ctx[q] === from) {
                return undefined
            }
            if (ctx[q] !== to) {
                return undefined
            }
            let c = { ...ctx }
            delete c[q]
            return [q, [c]]
        }

        let c = { ...ctx }
        res.push(c)

        return [q, res]
    }


    if (eq) {

        let q = eq

        if (ctx[q] !== undefined) {
            if (ctx[q] === from) {
                return undefined
            }
            if (ctx[q] !== to) {
                return undefined
            }
            let c = { ...ctx }
            delete c[q]
            return [q, [c]]
        }

        let froms = m.get_pieces_bb(pos, q_to_roles_c(q, lowers_turn))

        if (!froms.has(to)) {
            return undefined
        }

        let c = { ...ctx }
        res.push(c)

        return [q, res]
    }

    if (qe) {
        let q = qe
        if (ctx[q] !== undefined) {
            if (ctx[q] !== from) {
                return undefined
            }
            return [q, [ctx]]
        }

        let froms = m.get_pieces_bb(pos, q_to_roles_c(q, lowers_turn))

        if (!froms.has(from)) {
            return undefined
        }

        let c = { ...ctx, [q]: from }
        res.push(c)

        return [q, res]
    }

    if (qq) {

        let q = qq

        if (ctx[q] !== undefined) {
            if (ctx[q] === from) {
                return undefined
            } else if (ctx[q] === to) {
                return undefined
            } else if (ctx[q] < 0) {
                return undefined
            }
            return [q, [ctx]]
        }

        let froms = m.get_pieces_bb(pos, q_to_roles_c(q, lowers_turn))

        froms.set(from, false)
        froms.set(to, false)

        for (let from of froms) {
            let c = { ...ctx, [q]: from }
            res.push(c)
        }

        return [q, res]
    }
}



export function q_to_roles_c(q: string, lowers_turn: Color): PieceTypeC[] {
    let qq = q[0]
    // W
    // q white
    // Q black
    // B
    // Q white
    // q black
    if ((qq.toLowerCase() === qq) === (lowers_turn === 'white')) {
        qq = qq.toUpperCase()
    } else {
        qq = qq.toLowerCase()
    }
    
    switch (qq[0]) {
        case 'Q': return [W_QUEEN]
        case 'R': return [W_ROOK]
        case 'B': return [W_BISHOP]
        case 'N': return [W_KNIGHT]
        case 'K': return [W_KING]
        case 'P': return [W_PAWN]
        case 'M': return [W_KNIGHT, W_BISHOP]
        case 'J': return [W_ROOK, W_QUEEN]
        case 'U': return [W_KNIGHT, W_BISHOP, W_ROOK, W_QUEEN]
        case 'L': return [W_QUEEN, W_ROOK, W_BISHOP, W_KNIGHT, W_KING]
        case 'G': return [W_QUEEN, W_ROOK, W_BISHOP, W_KNIGHT, W_PAWN]
        case 'A': return [W_PAWN, W_KING, W_QUEEN, W_ROOK, W_BISHOP, W_KNIGHT]
        case 'q': return [B_QUEEN]
        case 'r': return [B_ROOK]
        case 'b': return [B_BISHOP]
        case 'n': return [B_KNIGHT]
        case 'k': return [B_KING]
        case 'p': return [B_PAWN]
        case 'm': return [B_KNIGHT, B_BISHOP]
        case 'j': return [B_ROOK, B_QUEEN]
        case 'u': return [B_KNIGHT, B_BISHOP, B_ROOK, B_QUEEN]
        case 'l': return [B_QUEEN, B_ROOK, B_BISHOP, B_KNIGHT, B_KING]
        case 'g': return [B_QUEEN, B_ROOK, B_BISHOP, B_KNIGHT, B_PAWN]
        case 'a': return [B_PAWN, B_KING, B_QUEEN, B_ROOK, B_BISHOP, B_KNIGHT]
        default: return []
    }
}

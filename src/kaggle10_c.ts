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
import { parseFen } from "./fen"

export function set_debug() {
    DEBUG = true
}

let DEBUG = false

export function find_san10_c(fen: string, rules: string, m: PositionManager) {

    let root = make_root(fen, rules, m)

    let c = root.children[0].m[0]

    if (!c) {
        return undefined
    }

    let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()

    return print_m(c, pos)
}


export function match_rules(l: Line, pos: PositionC, moves: MoveC[], g: CGroup, lowers_turn: Color, m: PositionManager): [CGroup, CGroup] {

    if (l.rule[0] === 'E') {
        if (moves.length > 0) {
            m.make_move(pos, moves[moves.length - 1])
        }
        let aa: CGroup = [],
        bb: CGroup = []

        let rule = l.rule.slice(1).trim()

        let covered_push = false
        for (let move of m.get_legal_moves(pos)) {
            let iaa = g
            let ibb: CGroup = []

            if (DEBUG) {
                let a = m.make_san(pos, move)
                if (a === 'Bf4') {
                    //console.log(a)
                }
            }

            if (rule) {
                let [saa, sbb] = match_rule_comma(rule, iaa, pos, move, lowers_turn, m)
                iaa = saa
                ibb.push(...sbb)
            }


            for (let child of l.children) {
                if (iaa.length === 0) {
                    break
                }

                let [saa, sbb] = match_rules(child, pos, [...moves, move], iaa, lowers_turn, m)
                iaa = saa
                ibb.push(...sbb)
            }

            if (iaa.length > 0) {
                l.m.push(({ ms: [...moves, move], ctx: iaa[0] }))
                covered_push = true
            }
        }

        if (covered_push) {
            aa.push(...g)
        } else {
            bb.push(...g)
        }

        if (moves.length > 0) {
            m.unmake_move(pos, moves[moves.length - 1])
        }
        return [aa, bb]
    }

    if (l.rule[0] === 'A') {
        if (moves.length > 0) {
            m.make_move(pos, moves[moves.length - 1])
        }
        let aa: CGroup = [],
        bb: CGroup = []

        let rule = l.rule.slice(1).trim()

        let covered_push = true

        for (let move of m.get_legal_moves(pos)) {

            let a
            if (DEBUG) {
                a = m.make_san(pos, move)
                if (a.includes('Qxg5')) {
                    console.log(a)
                }
            }

            let iaa: CGroup = []
            let ibb  = g

            /*
            if (rule) {
                let [saa, sbb] = match_rule_comma(rule, ibb, pos, move, lowers_turn, m)
                ibb = sbb
                iaa.push(...saa)
            }
                */

            for (let child of l.children) {
                let [saa, sbb] = match_rules(child, pos, [...moves, move], ibb, lowers_turn, m)
                ibb = sbb
                iaa.push(...saa)
                if (ibb.length === 0) {
                    break
                }
            }

            if (ibb.length > 0) {
                covered_push = false
                break
            }
            /*
            if (ibb.length === 0) {
                l.m.push(...iaa.map(ctx => ({ ms: [...moves, move], ctx })))
                aa.push(...iaa)
            }
                */
        }

        if (covered_push) {
            aa.push(...g)
            l.m.push(...g.map(ctx => ({ ms: moves, ctx })))
        } else {
            bb.push(...g)
        }

        if (moves.length > 0) {
            m.unmake_move(pos, moves[moves.length - 1])
        }
        return [aa, bb]
    }

    let iaa: CGroup = []
    let ibb: CGroup = []

    let rule = l.rule[0] === '\\' ? l.rule.slice(1) : l.rule
    let move = moves[moves.length - 1]

    let [saa, sbb] = match_rule_comma(rule, g, pos, move, lowers_turn, m)
    if (rule === '.') {
        //console.log('here')
    }
    iaa = saa
    ibb.push(...sbb)

    let imm: Context[] = []
    if (l.children.length === 0) {
        imm = iaa
    }
    for (let child of l.children) {
        let [saa, sbb] = match_rules(child, pos, moves, iaa, lowers_turn, m)
        iaa = sbb
        imm.push(...saa)
    }

    if (imm.length > 0) {
        if (moves.length > 0) {
            l.m.push(...imm.map(ctx => ({ ms: moves, ctx })))
        }
    }

    if (l.children.length > 0) {
        ibb.push(...iaa)
    }
    return [imm, ibb]
}

export function make_root(fen: string, rules: string, m: PositionManager) {
    let pos = m.create_position(fen)

    let root = parse_rules(rules)

    if (root.children.length === 0) {
        return root
    }

    let g: CGroup = [{}]

    match_rules(root, pos, [], g, m.pos_turn(pos), m)

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

        if (rule[rule.length - 1] === 'P') {
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

export function print_m(m: M, pos: Position) {
    pos = pos.clone()
   
    let sans = m.ms.map((c: MoveC) => {
        let move = move_c_to_Move(c)
        let san = makeSan(pos, move)
        pos.play(move)
        return san
    })

    return sans.join(' ')
}

export function print_rules(l: Line, pos: Position): string {

    let res = ''
    let ind = " ".repeat(l.depth + 1)

    let long = l.long ? 150 : 1

    let m = l.no_c ? l.p_m : l.m

    let ms = m.slice(0, long).map(_ => print_m(_, pos)).join(', ')

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

function match_rule(rule: string, g: CGroup, pos: PositionC, last_move: MoveC, lowers_turn: Color, m: PositionManager): [CGroup, CGroup] {
    if (rule === '.') {
        return [g, []]
    }

    if (rule[0] === '!') {
        let [a, b] = match_rule(rule.slice(1), g, pos, last_move, lowers_turn, m)
        return [b, a]
    }

    let [from, ...tos] = rule.split(' ')


    let aa: CGroup = [],
    bb: CGroup = []

    for (let pc of g) {
        let frr = match_str_pc_from(from, pc, pos, last_move, lowers_turn, m)

        if (!frr) {
            bb.push(pc)
            continue
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

        if (!pushed) {
            bb.push(pc)
        }
    }
    return [aa, bb]
}

export function match_rule_comma(rule: string, p: CGroup, pos: PositionC, last_move: MoveC, lowers_turn: Color, m: PositionManager): [CGroup, CGroup] {
    return rule.split(',')
    .reduce<[CGroup, CGroup]>((acc, rule) => 
        match_rule(rule.trim(), acc[0], pos, last_move, lowers_turn, m), [p, []])
}

function match_str_pc_to(str: string, from_q: Var, ctx: Context, pos: PositionC, last_move: MoveC, lowers_turn: Color, m: PositionManager): Context[] | undefined {
    let eh7 = str.match(/\=([a-h][1-8])$/)
    let eb = str.match(/\=([pqrnbkPQRNBKmjuaglMJUAGL]'?)$/)
    let oc1 = str.match(/\+([a-h][1-8])$/)
    let ocR = str.match(/\+([pqrnbkPQRNBKmjuaglMJUAGL]'?)$/)

    if (str.match(/#/)) {
        if (!m.is_checkmate(pos)) {
            return undefined
        }
    }

    let res = []

    let q_piece = m.get_at(pos, ctx[from_q])!

    let { from, to } = move_c_to_Move(last_move)

    let m_piece =  m.get_at(pos, from)!
    let x_piece = m.get_at(pos, to)


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
            // todo fix
            let c = { ...ctx, [q]: to}
            return [q, [c]]
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

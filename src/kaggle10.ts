import { attacks } from "./attacks"
import { boardEquals } from "./board"
import { Chess, Position } from "./chess"
import { parseFen } from "./fen"
import { dests_pp } from "./kaggle9"
import { makeSan } from "./san"
import { SquareSet } from "./squareSet"
import { Color, Move, Role, Square } from "./types"
import { opposite } from "./util"


export function find_san10(fen: string, rules: string) {

    let root = make_root(fen, rules)

    let i = root
    while (true) {
        if (i.children.length === 0) {
            break
        }
        i = i.children[i.children.length - 1]
    }


    let m = i.m[i.m.length - 1]

    return print_m(m)
}


function match_root(l: Line, g: PositionGroup, lowers_turn: Color) {

    let gg = g
    let igg: PositionGroup
    let rgg: PositionGroup

    if (l.rule === '**') {
        gg = g.flatMap(play_out_pos).flatMap(play_out_pos)
        igg = gg
        rgg = gg
    } else if (l.rule === '*') {
        gg = g.flatMap(play_out_pos)
        igg = gg
        rgg = gg
    } else {
        [igg, rgg] = match_rule_comma(l.rule, gg, lowers_turn)
    }

    l.m = igg

    for (let child of l.children) {
        igg = match_root(child, igg, lowers_turn)
        if (igg.length === 0) {
            break
        }
    }

    return rgg
}

export function make_root(fen: string, rules: string) {

    let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()

    let root = parse_rules(rules)

    if (root.children.length === 0) {
        return root
    }

    let g: PositionGroup = [{ pos, ctx: {} }]

    match_root(root, g, pos.turn)

    return root
}

function ctx_play_move(a: Context, move: Move) {
    let res: Context = {}

    for (let key of Object.keys(a)) {
        if (a[key] === move.to) {
        } else {
            res[key] = a[key]
        }
    }

    return res
}

function play_out_pos(g: PositionWithContext): PositionGroup {
    return dests_pp(g.pos)
    .map(([move, pos]) => ({
        parent: [g, move],
        pos,
        ctx: ctx_play_move(g.ctx, move)
    }))
}

type Line = {
    depth: number,
    rule: string,
    children: Line[],
    m: M[]
}

type M = PositionWithContext

function parse_rules(str: string): Line {
    let ss = str.trim().split('\n')

    let root = { depth: -1, rule: '*', children: [], m: [], n: [] }
    const stack: Line[] = [root]

    for (let i = 0; i < ss.length; i++) {
        let line = ss[i]
        const rule = line.trim()
        if (!rule) continue

        const depth = line.search(/\S/)

        let node: Line  = { depth, rule, children: [], m: [] }

        while (stack.length > depth + 1) {
            stack.pop()
        }

        stack[stack.length - 1].children.push(node)
        stack.push(node)
    }
    return root
}

function print_m(m: M) {
    let sans = []

    let i: M = m
    while (true) {

        if (!i.parent) {
            break
        }

        let san = makeSan(i.parent[0].pos, i.parent[1])

        sans.unshift(san)

        i = i.parent[0]
    }
    
    return sans.join(' ')// + m.ctx['h7']
}

export function print_rules(l: Line): string {

    let res = ''
    let ind = " ".repeat(l.depth + 1)

    let ms = l.m.slice(0, 1).map(print_m).join(', ')

    if (l.m.length > 1) {
        ms += '..' + l.m.length
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
        res += print_rules(c)
    }).join('')

    return res
}




type Var = string

type Context = Record<Var, Square>

type PositionWithContext = {
    parent?: [PositionWithContext, Move]
    pos: Position,
    ctx: Context
}

type PositionGroup = PositionWithContext[]

function ctx_equals_one_way(a: Context, b: Context) {
    for (let key of Object.keys(a)) {
        if (a[key] !== b[key]) {
            return false
        }
    }
    return true
}



function ctx_move(a: Context, b: Move) {
    let res: Context = {}
    for (let key of Object.keys(a)) {
        if (a[key] === b.from) {
            res[key] = b.to
        } else {
            res[key] = a[key]
        }
    }
    return res
}


function merge_ctx(a: Context, b: Context) {
    let res: Context = {}
    for (let key of Object.keys(a)) {
        if (!b[key]) {
            res[key] = a[key]
        } else {
            if (a[key] !== b[key]) {
                return undefined
            }
            res[key] = a[key]
        }
    }
    for (let key of Object.keys(b)) {
        if (!a[key]) {
            res[key] = b[key]
        } else {
            if (a[key] !== b[key]) {
                return undefined
            }
            res[key] = b[key]
        }
    }
    
    for (let key of Object.keys(res)) {
        for (let key2 of Object.keys(res)) {
            if (key !== key2) {
                if (key[0] === key2[0]) {
                    if (res[key] === res[key2]) {
                        return undefined
                    }
                }
            }
        }
    }

    return res
}



function q_to_roles(q: string): Role[] {
    switch (q[0]) {
        case 'Q': case 'q': return ['queen']
        case 'R': case 'r': return ['rook']
        case 'B': case 'b': return ['bishop']
        case 'N': case 'n': return ['knight']
        case 'K': case 'k': return ['king']
        case 'P': case 'p': return ['pawn']
        case 'M': case 'm': return ['knight', 'bishop']
        case 'J': case 'j': return ['rook', 'queen']
        case 'U': case 'u': return ['knight', 'bishop', 'rook', 'queen']
        case 'L': case 'l': return ['queen', 'rook', 'bishop', 'knight', 'king']
        case 'G': case 'g': return ['queen', 'rook', 'bishop', 'knight', 'pawn']
        case 'A': case 'a': return ['pawn', 'king', 'queen', 'rook', 'bishop', 'knight']
        default: return []
    }
}

function q_is_lower(q: string) {
   return q.toLowerCase() === q
}



function pos_equals(a: Position, b: Position) {
    return boardEquals(a.board, b.board) 
}


function match_var_on_context(q: Var, pc: PositionWithContext) {
    if (pc.ctx[q]) {
        return SquareSet.fromSquare(pc.ctx[q])
    }
}

function match_role_on_context(q: Var, lowers_turn: Color, pc: PositionWithContext) {
    let from_ctx = match_var_on_context(q, pc)
    if (from_ctx) {
        return from_ctx
    }
    let turn = q_is_lower(q) ? lowers_turn : opposite(lowers_turn)
    let roles = q_to_roles(q)
    return match_roles_for_turn(pc.pos, turn, roles)
}


function match_roles_for_turn(p: Position, turn: Color, roles: Role[]) {
    return roles
    .reduce<SquareSet>((acc, role) => acc.union(p.board[role]), SquareSet.empty())
    .intersect(p.board[turn])
}

function match_attacks(p: Position, square: Square) {
    let piece = p.board.get(square)
    
    if (!piece) {
        return SquareSet.empty()
    }

    return attacks(piece, square, p.board.occupied)
}




function match_rule_comma(rule: string, p: PositionGroup, lowers_turn: Color): [PositionGroup, PositionGroup] {
    return rule.split(',')
    .reduce<[PositionGroup, PositionGroup]>((acc, rule) => 
        match_rule(rule.trim(), acc[0], lowers_turn), [p, []])
}


function match_rule(rule: string, g: PositionGroup, lowers_turn: Color): [PositionGroup, PositionGroup] {

    if (rule === '.') {
        return [g, []]
    }

    if (rule[0] === '!') {
        let all = g
        let [a, b] = match_rule(rule.slice(1), g, lowers_turn)
        return [b, a]
    }

    let [from, ...tos] = rule.split(' ')

    let aa: PositionGroup = [],
     bb: PositionGroup = []
    for (let pc of g) {

        let rr = match_str_pc_from(from, pc, lowers_turn)

        if (!rr) {
            bb.push(pc)
            continue
        }

        let pushed = false
        for (let [from, r] of rr) {
            let a = tos.reduce((acc, to) =>
                acc.flatMap(_ => match_str_pc_to(to, _, from, lowers_turn) ?? []), [r])
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

function match_str_pc_from(str: string, pc: PositionWithContext, lowers_turn: Color): [Var, PositionWithContext][] | undefined {

    let q = str.match(/^([pqrnbkPQRNBKmjuaglMJUAGL]'?)/)?.[0]

    if (!q) {
        return undefined
    }

    let res: [Var, PositionWithContext][] = []

    let froms = match_role_on_context(q, lowers_turn, pc.parent![0])

    for (let from of froms) {
        let ctx = merge_ctx(pc.ctx, { [q]: from })
        if (!ctx) {
            continue
        }
        res.push([q, { pos: pc.pos, ctx, parent: pc.parent }])
    }

    return res
}

function match_str_pc_to(str: string, pc: PositionWithContext, from: Var, lowers_turn: Color): PositionWithContext[] | undefined {
    let eh7 = str.match(/\=([a-h][1-8])$/)
    let eb = str.match(/\=([pqrnbkPQRNBKmjuaglMJUAGL]'?)$/)
    let oc1 = str.match(/\+([a-h][1-8])$/)
    let ocR = str.match(/\+([pqrnbkPQRNBKmjuaglMJUAGL]'?)$/)
    let _ = str.match(/_/)?.[0];

    if (str.match(/#/)) {
        if (!pc.pos.isCheckmate()) {
            return undefined
        }
    }

    let res = []

    if (_) {
        let q = from
        let turn = q_is_lower(q) ? lowers_turn : opposite(lowers_turn)
        let roles = q_to_roles(q)

        let pos = pc.pos

        if (pc.parent![1].from === pc.ctx[q]) {
            pos = pc.parent![0].pos
        }

        let froms = match_roles_for_turn(pos, turn, roles)

        for (let f_sq of froms) {
            let f_piece = pos.board.get(f_sq)

            if (!f_piece) {
                continue
            }

            let ctx = merge_ctx(pc.ctx, { [from]: f_sq })

            if (!ctx) {
                continue
            }
            res.push({ pos: pc.pos, ctx, parent: pc.parent })
        }

    }

    if (eb) {

        let [_, b] = eb
        
        let to = pc.parent![1].to
        let to_piece = pc.parent![0].pos.board.get(to)

        if (!to_piece) {
            return undefined
        }

        if (!q_to_roles(b).includes(to_piece.role)) {
            return undefined
        }

        let ctx = merge_ctx(pc.ctx, { [from]: pc.parent![1].from, [b]: to })

        if (!ctx) {
            return undefined
        }

        res.push({ pos: pc.pos, ctx, parent: pc.parent })
    }


    if (eh7) {
        let [_, h7] = eh7

        let to = pc.parent![1].to 
        let ctx = merge_ctx(pc.ctx, { [from]: pc.parent![1].from, [h7]: to })

        if (!ctx) {
            return undefined
        }

        res.push({ pos: pc.pos, ctx, parent: pc.parent })
    }

    if (oc1) {
        let [_, c1] = oc1

        for (let c_sq of match_attacks(pc.pos, pc.ctx[from])) {
            let ctx = merge_ctx(pc.ctx, { [c1]: c_sq })
            if (!ctx) {
                continue
            }
            res.push({ pos: pc.pos, ctx, parent: pc.parent })
        }
    }

    if (ocR) {
        let [_, R] = ocR

        let roleS = match_role_on_context(R, lowers_turn, pc)

        for (let c_sq of match_attacks(pc.pos, pc.ctx[from]).intersect(roleS)) {
            let ctx = merge_ctx(pc.ctx, { [R]: c_sq })
            if (!ctx) {
                continue
            }

            res.push({ pos: pc.pos, ctx, parent: pc.parent })
        }
    }

    return res
}


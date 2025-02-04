import { ResolveOptions } from "dns";
import { Chess, Position } from "./chess";
import { Color, Move, Role, Square } from "./types";
import { opposite } from "./util";
import { SquareSet } from "./squareSet";
import { attacks } from "./attacks";
import { square } from "./debug";
import { boardEquals } from "./board";
import { makeSan } from "./san";
import { makeFen, parseFen } from "./fen";
import { format } from "path";

function match_root(l: Line, g: PositionGroup, lowers_turn: Color) {
    let gg = match_line_comma(l.rule, g, lowers_turn)

    let gss = g.map(g => print_m(g))
    let igg = gg.map<[PositionWithContext, string]>(g => [g, print_m(g)])
    for (let child of l.children) {
        let rr = match_root(child, igg.map(_ => _[0]), lowers_turn)
        let rrm = rr.map(r => [print_m(r), print_m(r.parent![0]), r.parent![0].parent ? print_m(r.parent![0].parent![0]) : ''])

        igg = igg.filter(ig => {
            return !rrm.find(rm => ig[1] === rm[0] || ig[1] === rm[1] || ig[1] === rm[2])
        })

    }

    let agg = l.children.length === 0 ? gg : gg.filter(g => !igg.find(_ => _[0] === g))
    l.m = agg
    return igg.map(_ => _[0])
}

export function make_root(fen: string, rules: string) {

    let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()

    let root = parse_rules(rules)

    if (root.children.length === 0) {
        return root
    }

    let g = [{ pos, ctx: {} }]

    match_root(root, g, pos.turn)

    return root
}

export function find_san9(fen: string, rules: string) {

    let root = make_root(fen, rules)

    let m = root.children[root.children.length - 1].m[0]

    if (!m || !m.parent) {
        return undefined
    }

    let pos = m.parent[0].pos
    let move = m.parent[1]
    return makeSan(pos, move)

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

    let root = { depth: -1, rule: '.', children: [], m: [], n: [] }
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

function equals(a: Position, b: Position) {
    return boardEquals(a.board, b.board) 
}

function negate(set: SquareSet) {
    return set.complement()
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


function match_dests(p: Position, square: Square) {
    return p.dests(square)
}

export function dests_pp(pos: Position) {
    return [...SquareSet.full()]
        .flatMap(from => [...match_dests(pos, from)]
            .flatMap(to => {
                let res = []

                if (to < 8 || to >= 56) {
                    if (pos.board.get(from)?.role === 'pawn') {
                        res.push({ from, to, promotion: 'queen' })
                        res.push({ from, to, promotion: 'knight' })
                        return res
                    }
                }
                let move = { from, to }
                res.push(move)
                return res
            })
    ).map(move => {
        let p2 = pos.clone()
        p2.play(move)
        return [move, p2] as [Move, Position]
    })
}


type Var = string

type Context = Record<Var, Square>

type PositionWithContext = {
    parent?: [PositionWithContext, Move]
    pos: Position,
    ctx: Context
}

type PositionGroup = PositionWithContext[]

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

function match_line_comma(line: string, p: PositionGroup, lowers_turn: Color): PositionGroup {
    return line.split(',')
    .reduce((acc, line) => match_line(line.trim(), acc, lowers_turn), p)
}

function match_line(line: string, g: PositionGroup, lowers_turn: Color): PositionGroup {

    if (line === '.') {
        return g
    }
    if (line === '*') {
        return g.flatMap(_ =>
            dests_pp(_.pos)
                .map(([move, p2]) => {
                    let ctx = ctx_move(_.ctx, move)
                    return { parent: [_, move], ctx: ctx, pos: p2 }
                }))
    }

    if (line[0] === '*') {
        return match_line(line.slice(1), 
            g.flatMap(_ =>
                dests_pp(_.pos)
                    .map(([move, p2]) => 
                        ({ parent: [_, move], ctx: ctx_move(_.ctx, move), pos: p2 }))), lowers_turn)

    }
    if (line[0] === '!') {
        let all = match_line(line.includes('=') ? '*': '.', g, lowers_turn)
        let exclude = match_line(line.slice(1), g, lowers_turn)
        return all.filter(_ => !exclude.find(e => equals(_.pos, e.pos) && ctx_equals_one_way(_.ctx, e.ctx)))
    }

    return g.flatMap(_ => {
        let rr = match_str_pc_from(line, _, lowers_turn)

        let res = rr?.flatMap(([from, r]) =>
            match_str_pc_to(line, r, from, lowers_turn) ?? []
        ) ?? []

        return res
    })
}

function match_str_pc_from(str: string, pc: PositionWithContext, lowers_turn: Color): [Var, PositionWithContext][] | undefined {

    let qeR = str.match(/^([pqrnbkPQRNBKmjuaglMJUAGL]'?) =([pqrnbkPQRNBKmjuaglMJUAGL]'?)/)
    let qec1 = str.match(/^([pqrnbkPQRNBKmjuaglMJUAGL]'?) =([a-h][1-8])/)
    let qe_ = str.match(/^([pqrnbkPQRNBKmjuaglMJUAGL]'?) =_/)

    let qO = str.match(/^([pqrnbkPQRNBKmjuaglMJUAGL]'?)/)

    if (str.includes('#')) {
        //console.log(str)
    }

    let res: [Var, PositionWithContext][] = []
    if (qeR) {
        let [_, q, R] = qeR

        let froms = match_role_on_context(q, lowers_turn, pc)
        if (pc.ctx['Q'] === 20) {
            //console.log('here')
        }
        for (let from of froms) {
            for (let to_sq of match_attacks(pc.pos, from)) {

                let ctx = merge_ctx(pc.ctx, { [R]: to_sq })
                if (!ctx) {
                    continue
                }
                ctx[q] = to_sq
                let move = { from, to: to_sq }
                let pos = pc.pos.clone()
                pos.play(move)
                let parent: [PositionWithContext, Move] = [pc, move]
                res.push([q, { pos, ctx, parent }])
            }
        }
    } else if (qec1) {
        let [_, q, c1] = qec1


        let froms = match_role_on_context(q, lowers_turn, pc)

        for (let from of froms) {
            for (let to_sq of match_attacks(pc.pos, from)) {
                let ctx = merge_ctx(pc.ctx, { [c1]: to_sq })
                if (!ctx) {
                    continue
                }
                ctx[q] = to_sq
                let move = { from, to: to_sq }
                let pos = pc.pos.clone()

                //if (to_sq === 55)
                    //console.log(makeFen(pos.toSetup()), pos.isCheckmate())
                pos.play(move)
                let parent: [PositionWithContext, Move] = [pc, move]
                res.push([q, { pos, ctx, parent }])
            }
        }
    } else if (qe_) {
        let [_, q] = qe_

        let froms = match_role_on_context(q, lowers_turn, pc)

        for (let from of froms) {
            for (let to_sq of match_attacks(pc.pos, from)) {
                let ctx = merge_ctx(pc.ctx, {})
                if (!ctx) {
                    continue
                }
                ctx[q] = to_sq
                let move = { from, to: to_sq }
                let pos = pc.pos.clone()
                pos.play(move)
                let parent: [PositionWithContext, Move] = [pc, move]
                res.push([q, { pos, ctx, parent }])
            }
        }
    } else if (qO) {
        let [_, q] = qO


        let froms = match_role_on_context(q, lowers_turn, pc)

        for (let from of froms) {
                let ctx = merge_ctx(pc.ctx, { [q]: from })
                if (!ctx) {
                    return undefined
                }
                res.push([q, { pos: pc.pos, ctx, parent: pc.parent }])
            }
        }

    return res
}

function match_str_pc_to(str: string, pc: PositionWithContext, from: Var, lowers_turn: Color): PositionWithContext[] | undefined {
    let oc1 = str.match(/\+([a-h][1-8])/)
    let ocR = str.match(/\+([pqrnbkPQRNBKmjuaglMJUAGL]'?)/)

    if (str.match(/#/)) {
        if (!pc.pos.isCheckmate()) {
            return undefined
        }
    }

    let res = []
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

    if (!oc1 && !ocR) {
        res.push(pc)
    }

    return res
}

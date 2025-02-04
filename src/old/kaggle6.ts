import { attacks } from "./attacks";
import { Hopefox, move_to_san2 } from "./hopefox_helper";
import { makeSan, parseSan } from "./san";
import { Color, Move, Role, Square } from "./types";
import { opposite } from "./util";


const cartesianProduct = <T>(arrays: T[][]) => {
  return arrays.reduce((acc: T[][], array: T[]) =>
    acc.flatMap(a => array.map(b => [...a, b])),
    [[]] // Start with an empty array inside an array
  );
};



function merge_contexts(a: Context, b: Context): Context | undefined {

    for (let ax of Object.keys(a)) {
        if (b[ax]) {
            if (b[ax] !== a[ax]) {
                return undefined
            }
        }

    }

    for (let bx of Object.keys(b)) {
        if (a[bx]) {
            if (a[bx] !== b[bx]) {
                return undefined
            }
        }
    }


    let res = {...a, ...b}

    for (let rx of Object.keys(res)) {

        if (rx.includes('\'')) {
            let ra = rx.slice(0, -1)

            if (res[ra] === res[rx]) {
                return undefined
            }
        }
    }


    return res

}

function merge_cc(cc: Context[][]) {
    let ccx = cartesianProduct(cc)

    let res = ccx.map(_ => 
        _.reduce((acc: Context | undefined, b: Context) =>
             acc ? merge_contexts(acc, b): undefined, {}))
    .filter(Boolean) as Context[]

    const ures: Context[] = Array.from(
        new Set(res.map(obj => JSON.stringify(obj)))
    ).map(str => JSON.parse(str));

    ures.sort((a, b) => Object.keys(a).length - Object.keys(b).length)

    return ures
}


export type Context = Record<string, Square>

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
        case 'R': case 'r': return ['king', 'queen', 'rook', 'bishop', 'knight']
        case 'A': case 'a': return ['pawn', 'king', 'queen', 'rook', 'bishop', 'knight']
        default: return []
    }
}

function q_is_lower(q: string) {
   return q.toLowerCase() === q
}


type Rule = string

type Rules = {
    rules: Rule[],
    move: Rule,
    covers: CoverRule[]
}

class CoverRule {
    constructor(
        readonly line: string, 
        readonly is_star: boolean, 
        readonly neg?: Rule, 
        readonly refute?: Rule) {}
}


function parse_rules(str: string): Rules {
    let i_depth = 0
    let rules = []
    let move = ''
    let covers = []
    let lines = str.split('\n')
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i]

        const depth = line.search(/\S/)

        if (depth === 0) {
            rules.push(line)
        }
        if (depth === 1) {

            if (!move) {
                move = rules[rules.length-1]
            }

            let neg, refute
            let is_star = line.trim()[0] === '*'

            let next_line = lines[i + 1]
            if (next_line) {
                const depth = next_line.search(/\S/)

                if (depth === 2) {

                    if (next_line.trim()[0] === '^') {
                        neg = next_line.trim()
                    } else {
                        refute = next_line.trim()
                    }
                    i++
                }
            }

            covers.push(new CoverRule(is_star ? line.trim().slice(1) : line.trim(), is_star, neg, refute))
        }
    }
    return {
        rules,
        move,
        covers
    }
}




export function find_san6(fen: string, rules: string) {

    let h = Hopefox.from_fen(fen)
    let rr = parse_rules(rules)

    let res = []

    let collect: Context[] = [{}]
    for (let r of rr.rules) {
        let cc = find_contexts(r, h, h.turn, collect)
        if (cc === undefined) {
            return undefined
        }
        collect = cc
    }

    let res_sans: string[] = []
    let { from, to } = find_from_to(rr.move)!

    res = collect

    for (let ctx of res) {

        let move = { from: ctx[from], to: ctx[to] }
        //console.log(res_sans)

        let ha = h.apply_move(move)
        let all_sans = ha.dests.map(_ => makeSan(ha.pos, _))

        collect = [{...ctx, [from]: ctx[to] }]
        let sans: string[] = []
        for (let cover of rr.covers) {
            let cc: Context[] = []
            let c_sans: string[] = []

            if (cover.is_star) {

                if (cover.line === 'b =R') {
                    //console.log('here')
                }
                let ha_dests = ha.h_dests

                for (let [ha, ha2, da2] of ha_dests) {

                    let a = move_to_san2([ha, ha2, da2])

                    if (a === 'Rxc7') {
                        //console.log('yes')
                    }

                    let ccc = collect.map(_ => {
                        for (let key of Object.keys(_)) {
                            if (_[key] === da2.from) {
                                return { ..._, [key]: da2.to}
                            }
                        }
                        return _
                    })

                    let c = find_contexts(cover.line, ha2, h.turn, ccc)

                    if (!c) {
                        continue
                    }

                    // restore old
                    c = c.map(_ => {
                        for (let key of Object.keys(_)) {
                            if (_[key] === da2.to) {
                                return { ..._, [key]: da2.from}
                            }
                        }
                        return _
                    })



                    let san = move_to_san2([ha, ha2, da2])

                    if (all_sans.includes(san) && !sans.includes(san)) {
                        c_sans.push(san)
                    }
                    cc = c
                }

            } else {
                let c = find_contexts(cover.line, ha, h.turn, collect)

                if (!c) {
                    continue
                }
                cc = c

                cc.forEach(ctx => {
                    let { from, to } = find_from_to(cover.line)!

                    let move = { from: ctx[from], to: ctx[to] }
                    let san = makeSan(ha.pos, move)

                    if (all_sans.includes(san) && !sans.includes(san)) {
                        c_sans.push(san)
                    }
                })
            }

            if (cover.neg) {

                let { from, to } = find_from_to(cover.line)!
                let cc_sans = []
                let cc_ctx = []
                for (let san of c_sans) {
                    let ha2 = ha.apply_move(parseSan(ha.pos, san)!)
                    
                    let cs = []
                    for (let ctx of cc) {
                        let move = { from: ctx[from], to: ctx[to]}

                        let ha3 = ha2.apply_move(move)


                        let c = find_contexts(cover.neg, ha3, h.turn, [ctx])

                        if (c === undefined) {
                            continue
                        }
                        cs.push(ctx)
                    }

                    if (cs.length === 0) {
                        continue
                    }
                    cc_sans.push(san)
                    cc_ctx.push(...cs)
                }

                c_sans = cc_sans
                cc = cc_ctx
            }

            if (cover.refute) {

            }
 
            sans.push(...c_sans)
            collect = cc
        }
        //console.log(sans.length, all_sans.length, sans, all_sans)
        if (sans.length !== all_sans.length) {
            continue
        }

        res_sans.push(makeSan(h.pos, move))
    }


    //console.log(res_sans)
    return res_sans[0]

}

function find_from_to(str: string) {

    let qeR = str.match(/^([pqrnbkmPQRNBKM]'?) =([pqrnbkmPQRNBKM]'?)/)

    if (qeR) {
        let [_, q, R] = qeR

        return { from: q, to: R }
    }


    let qec1 = str.match(/^([pqrnbkmPQRNBKM]'?) =([a-h][1-8])/)

    if (qec1) {
        let [_, q, c1] = qec1

        return { from: q, to: c1 }
    }
}

let R_qec1 = /^([pqrnbkmPQRNBKM]'?) =([a-h][1-8])$/
let R_qeR = /^([pqrnbkmPQRNBKM]'?) =([pqrnbkmPQRNBKM]'?)$/
let R_Rec1beq = /^([pqrnbkmPQRNBKM]'?) =([a-h][1-8]) \/([a-h][1-8])\+([pqrnbkmPQRNBKM]'?)$/
let R_Neq = /^\^ =([pqrnbkmPQRNBKM]'?)$/

function find_contexts(rule: string, h: Hopefox, lowers_turn: Color, res: Context[] = [{}]) {

    let Neq = rule.match(R_Neq)
    if (Neq) {

        let [_, q] = Neq

        let to_roles = q_to_roles(q)

        let turn = q_is_lower(q) ? h.turn : opposite(h.turn)

        let collect = []
        for (let from_sq of h.pos.board[turn]) {
            let f_piece = h.pos.board.get(from_sq)!

            for (let to_sq of attacks(f_piece, from_sq, h.pos.board.occupied)) {

                let to_piece = h.pos.board.get(to_sq)

                if (!to_piece) {
                    continue
                }

                if (to_piece.color === turn) {
                    continue
                }

                if (!to_roles.includes(to_piece.role)) {
                    continue
                }

                collect.push(...merge_cc([res, [{ [q]: from_sq }]]))
            }
        }
        if (collect.length === 0) {
            return undefined
        }
        return collect
    }

    let qec1 = rule.match(R_qec1)

    if (qec1) {

        let [_, q, c1] = qec1

        let f_roles = q_to_roles(q)
        let turn = q_is_lower(q) ? lowers_turn : opposite(lowers_turn)

        let collect = []
        for (let sq_set_fs of f_roles.map(role => h.pos.board[role].intersect(h.pos.board[turn]))) {
            for (let from_sq of sq_set_fs) {

                let f_piece = h.pos.board.get(from_sq)!


                for (let to_sq of attacks(f_piece, from_sq, h.pos.board.occupied)) {

                    let to_piece = h.pos.board.get(to_sq)

                    if (to_piece) {
                        //continue
                    }

                    collect.push(...merge_cc([res, [{ [q]: from_sq, [c1]: to_sq }]]))
                }
            }
        }

        if (collect.length === 0) {
            return undefined
        }
        return collect
    }



    let Rec1beq = rule.match(R_Rec1beq)

    if (Rec1beq) {

        let [_, R, c1] = Rec1beq

        let f_roles = q_to_roles(R)
        let turn = q_is_lower(R) ? lowers_turn : opposite(lowers_turn)

        let collect = []
        for (let sq_set_fs of f_roles.map(role => h.pos.board[role].intersect(h.pos.board[turn]))) {
            for (let from_sq of sq_set_fs) {

                let f_piece = h.pos.board.get(from_sq)!

                for (let to_sq of attacks(f_piece, from_sq, h.pos.board.occupied)) {

                    let to_piece = h.pos.board.get(to_sq)

                    if (to_piece) {
                        //continue
                    }

                    collect.push(...merge_cc([res, [{ [R]: from_sq, [c1]: to_sq }]]))
                }
            }
        }
        if (collect.length === 0) {
            return undefined
        }
        return collect
    }

    let qeR = rule.match(R_qeR)

    if (qeR) {

        let [_, q, R] = qeR

        let f_roles = q_to_roles(q)
        let to_roles = q_to_roles(R)

        let turn = q_is_lower(q) ? h.turn : opposite(h.turn)

        let collect = []
        for (let sq_set_fs of f_roles.map(role => h.pos.board[role].intersect(h.pos.board[turn]))) {

            for (let from_sq of sq_set_fs) {
                let f_piece = h.pos.board.get(from_sq)!

                for (let to_sq of attacks(f_piece, from_sq, h.pos.board.occupied)) {

                    let to_piece = h.pos.board.get(to_sq)

                    if (!to_piece) {
                        continue
                    }

                    if (!to_roles.includes(to_piece.role)) {
                        continue
                    }

                    collect.push(...merge_cc([res, [{ [q]: from_sq, [R]: to_sq }]]))
                }
            }
        }
        if (collect.length === 0) {
            return undefined
        }
        return collect
    }
}
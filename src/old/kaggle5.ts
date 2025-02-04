import { attacks } from "./attacks";
import { Hopefox, move_to_san2 } from "./hopefox_helper";
import { makeSan } from "./san";
import { Color, Move, Role, Square } from "./types";
import { opposite } from "./util";



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
                move = rules.pop()!
            } else {
                rules.push(move)
            }

            let neg, refute
            let is_star = line.trim()[0] === '*'

            let next_line = lines[i + 1]
            if (next_line) {
                const depth = next_line.search(/\S/)

                if (depth === 2) {

                    if (next_line.trim()[0] === '^') {
                        neg = next_line.trim().slice(1)
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


export function find_san5(fen: string, rules: string) {

    let h = Hopefox.from_fen(fen)

    let rr = parse_rules(rules.trim())

    let collect: Context[] = [{}]
    for (let rule of rr.rules) {
        let c = find_contexts(h, collect, h.turn)(rule)

        if (!c) {
            return undefined
        }

        collect = c.res
    }

    let cmove = find_contexts(h, collect, h.turn)(rr.move)!

    let collect_out = []
    for (let ctx of collect) {

        let move = { from: ctx[cmove.q], to: ctx[cmove.R] }

        ctx = { ...ctx, [cmove.q]: ctx[cmove.R] }

        let ha = h.apply_move(move)
        let ha_dests = ha.h_dests
        let ha_sans = ha_dests.map(move_to_san2)

        let cover_sans = []
        let cover_collect_out = []
        for (let cover of rr.covers) {

            let cover_collect = []
            if (cover.is_star) {

                for (let [h2, ha2, da2] of ha_dests) {

                    let a = move_to_san2([h2, ha2, da2])
                    if (cover.line === 'b =d4' && a === 'Rxg8') {
                        console.log(a)
                    }

                    let rcs = find_contexts(ha2, [ctx], h.turn)(cover.line)

                    if (!rcs || rcs.res.length === 0) {
                        continue
                    }

                    cover_sans.push(a)
                    cover_collect.push(...rcs.res)
                }
            } else {

                let rcs = find_contexts(ha, [ctx], h.turn)(cover.line)

                if (!rcs || rcs.res.length === 0) {
                    continue
                }

                let sans = rcs.res.map(_ => {
                    let m = { from: _[rcs.q], to: _[rcs.R] }
                    return makeSan(ha.pos, m)
                }).filter(_ => ha_sans.includes(_))
                cover_sans.push(...sans)
                cover_collect.push(...rcs.res)
            }

            if (cover.neg) {

            }
            if (cover.refute) {

            }
            cover_collect_out.push(...cover_collect)
        }

        cover_sans = [...new Set(cover_sans)]
        if (cover_sans.length !== ha_dests.length) {
            return undefined
        }

        collect_out.push(...cover_collect_out)
    }

    return collect_out
}

let R_qec1 = /^([pqrnbkmPQRNBKM]'?) =([a-h][1-8])$/
let R_qeR = /^([pqrnbkmPQRNBKM]'?) =([pqrnbkmPQRNBKM]'?)$/
let R_Rec1beq = /^([pqrnbkmPQRNBKM]'?) =([a-h][1-8]) \/([a-h][1-8])\+([pqrnbkmPQRNBKM]'?)$/


export function find_contexts(h: Hopefox, ctxs: Context[], lowers_turn: Color) {
    return matcher

    function matcher(rule: string) {

        let qec1 = rule.match(R_qec1)

        if (qec1) {

            let [_, q, c1] = qec1

            let f_roles = q_to_roles(q)
            let turn = q_is_lower(q) ? lowers_turn : opposite(lowers_turn)

            let res = []


            for (let sq_set_fs of f_roles.map(role => h.pos.board[role].intersect(h.pos.board[turn]))) {
                for (let from_sq of sq_set_fs) {

                    let collect = []
                    for (let ctx of ctxs) {
                        if (ctx[q] !== undefined) {
                            if (ctx[q] !== from_sq) {
                                continue
                            }
                            collect.push(ctx)
                        } else {
                            collect.push({...ctx, [q]: from_sq})
                        }
                    }

                    if (collect.length === 0) {
                        continue
                    }

                    let f_piece = h.pos.board.get(from_sq)!


                    let ctxs_filter_to = collect

                    for (let to_sq of attacks(f_piece, from_sq, h.pos.board.occupied)) {

                        let to_piece = h.pos.board.get(to_sq)

                        if (to_piece) {
                            //continue
                        }

                        let collect = []
                        for (let ctx of ctxs_filter_to) {
                            if (ctx[c1] !== undefined) {
                                if (ctx[c1] !== to_sq) {
                                    continue
                                }
                                collect.push(ctx)
                            } else {
                                collect.push({ ...ctx, [c1]: to_sq })
                            }
                        }

                        if (collect.length === 0) {
                            continue
                        }

                        res.push(...collect)
                    }
                }
            }

            return { res, q: q, R: c1 }
        }



        let Rec1beq = rule.match(R_Rec1beq)

        if (Rec1beq) {

            let [_, R, c1] = Rec1beq

            let f_roles = q_to_roles(R)
            let turn = q_is_lower(R) ? lowers_turn : opposite(lowers_turn)

            let res = []


            for (let sq_set_fs of f_roles.map(role => h.pos.board[role].intersect(h.pos.board[turn]))) {
                for (let from_sq of sq_set_fs) {

                    let collect = []
                    for (let ctx of ctxs) {
                        if (ctx[R] !== undefined) {
                            if (ctx[R] !== from_sq) {
                                continue
                            }
                            collect.push(ctx)
                        } else {
                            collect.push({...ctx, [R]: from_sq})
                        }
                    }

                    if (collect.length === 0) {
                        continue
                    }

                    let f_piece = h.pos.board.get(from_sq)!


                    let ctxs_filter_to = collect

                    for (let to_sq of attacks(f_piece, from_sq, h.pos.board.occupied)) {

                        let to_piece = h.pos.board.get(to_sq)

                        if (to_piece) {
                            //continue
                        }

                        let collect = []
                        for (let ctx of ctxs_filter_to) {
                            if (ctx[c1] !== undefined) {
                                if (ctx[c1] !== to_sq) {
                                    continue
                                }
                                collect.push(ctx)
                            } else {
                                collect.push({ ...ctx, [c1]: to_sq })
                            }
                        }

                        if (collect.length === 0) {
                            continue
                        }

                        res.push(...collect)
                    }
                }
            }

            return { res, q: R, R: c1 }
        }

        let qeR = rule.match(R_qeR)
        
        if (qeR) {

            let [_, q, R] = qeR

            let f_roles = q_to_roles(q)
            let to_roles = q_to_roles(R)

            let turn = q_is_lower(q) ? h.turn : opposite(h.turn)

            let res = []
            for (let sq_set_fs of f_roles.map(role => h.pos.board[role].intersect(h.pos.board[turn]))) {
                
                for (let from_sq of sq_set_fs) {

                    let collect = []
                    for (let ctx of ctxs) {
                        if (ctx[q] !== undefined) {
                            if (ctx[q] !== from_sq) {
                                continue
                            }
                            collect.push(ctx)
                        } else {
                            collect.push({...ctx, [q]: from_sq})
                        }
                    }

                    if (collect.length === 0) {
                        continue
                    }

                    let f_piece = h.pos.board.get(from_sq)!

                    let ctxs_filter_to = collect

                    for (let to_sq of attacks(f_piece, from_sq, h.pos.board.occupied)) {

                        let to_piece = h.pos.board.get(to_sq)

                        if (!to_piece) {
                            continue
                        }

                        if (!to_roles.includes(to_piece.role)) {
                            continue
                        }

                        let collect = []
                        for (let ctx of ctxs_filter_to) {
                            if (ctx[R] !== undefined) {
                                if (ctx[R] !== to_sq) {
                                    continue
                                }
                                collect.push(ctx)
                            } else {
                                collect.push({ ...ctx, [R]: to_sq })
                            }
                        }

                        if (collect.length === 0) {
                            continue
                        }

                        res.push(...collect)
                    }
                }
                return {res, q, R}
            }

        }
    }

}
import { hasSubscribers } from "diagnostics_channel";
import { attacks } from "./attacks";
import { Hopefox, move_to_san2 } from "./hopefox_helper";
import { makeSan } from "./san";
import { Color, Move, Role, Square } from "./types";
import { opposite } from "./util";

const cartesianProduct = <T>(arrays: T[][]) => {
  return arrays.reduce((acc: T[][], array: T[]) =>
    acc.flatMap(a => array.map(b => [...a, b])),
    [[]] // Start with an empty array inside an array
  );
};

type Context = Record<string, Square[]>

function merge_contexts(a: Context, b: Context): Context | undefined {

    function append_if_valid(a: Square[], b: Square[]) {

        if (a.length === 1 && b.length === 1) {
            if (a[0] !== b[0]) {
                return undefined
            }
            return a
        }
        if (a.length === 2 && b.length === 1) {
            if (a[a.length - 1] !== b[0]) {
                return undefined
            }
            return a
        }
        if (a.length === 2 && b.length === 2) {
            if (a[a.length - 1] !== b[b.length - 2]) {
                return undefined
            }
            return [a[0], a[1], b[1]]
        }
        if (a.length > 2 && b.length === 2) {
            if (a[a.length - 1] !== b[b.length - 2]) {
                return undefined
            }
            return [...a, b[1]]
        }
        if (a.length > 2 && b.length === 1) {

            if (a[a.length - 1] !== b[0]) {
                return undefined
            }
            return a
        }
        throw `Append Invalid ${a.length} | ${b.length}`
    }

    let res: Context = {}

    for (let ai of Object.keys(a)) {
        if (b[ai] !== undefined) {
            let ar = append_if_valid(a[ai], b[ai])
            if (!ar) {
                return undefined
            }
            res[ai] = ar
        } else {
            res[ai] = a[ai]
        }
    }

    for (let bi of Object.keys(b)) {
        if (a[bi] === undefined) {
            res[bi] = b[bi]
        }
    }

    let R_piece = /([pqrnbkPQRNBKmjuarMJUAR]'?)/
    for (let a of Object.keys(res)) {
        for (let b of Object.keys(res)) {

            if (a !== b) {
                if (a.match(R_piece) && b.match(R_piece))
                if (res[a][res[a].length - 1] === res[b][res[b].length - 1]) {
                    //return undefined
                }
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

function parse_rules(str: string): Line {
    let ss = str.trim().split('\n')

    let root = { depth: -1, rule: '.', children: [], m: [], n: [] }
    const stack: Line[] = [root]

    for (let i = 0; i < ss.length; i++) {
        let line = ss[i]
        const rule = line.trim()
        if (!rule) continue

        const depth = line.search(/\S/)

        let node: Line  = { depth, rule, children: [], m: [], n: [] }

        while (stack.length > depth + 1) {
            stack.pop()
        }

        stack[stack.length - 1].children.push(node)
        stack.push(node)
    }
    return root
}


export function print_rules(l: Line): string {

    let res = ''
    let ind = " ".repeat(l.depth + 1)

    let ms = l.m.slice(0, 2).map(_ => {
        let res =  ''

        let moves = _.h_to_ha.slice(0, 3)
        .reduce<[Hopefox, string]>(([h, acc], da) => 
            [h.apply_move(da), acc + ' ' + makeSan(h.pos, da)], [_.h, ''])[1].trim()
        
        //res += _.h.fen
        res += moves

        if (_.h_to_ha.length > 3) {
            res += " .." + (_.h_to_ha.length - 2)
        }

        return res
    }).join(', ')


    if (l.m.length > 3) {
        ms += '..' + l.m.length
    }


    let ns = ''
    /*
    let nn = l.n.slice(0, 3).map(move_to_san2)

    if (nn.length > 0) {

        ns += ` {${nn.join(', ')}`

        if (l.n.length > 3) {
            ns += `..${l.n.length - 3}`
        }
        ns += '}'
    }
        */



    res += " " + l.rule + " <" + (ms ?? "?") + ">" + ns + "\n"

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

export function find_san8(fen: string, rules: string) {

    let root = make_root(fen, rules)

    let m = root.children[root.children.length - 1].m[0]

    if (!m) {
        return undefined
    }

    let res


    let h = m.h
    for (let da of m.h_to_ha) {
        res = makeSan(h.pos, da)
        h.apply_move(da)
    }

    return res

}


type Line = {
    depth: number,
    rule: string,
    children: Line[],
    m: HMove[],
    n: HDest[] 
}

type HMove = {
    c: Context,
    h: Hopefox,
    ha: Hopefox,
    h_to_ha: Move[]
}

type BareHMove = {
    c: Context,
    da: Move
}


export function make_root(fen: string, rules: string) {
    let h = Hopefox.from_fen(fen)
    let root = parse_rules(rules)

    if (root.children.length === 0) {
        return root
    }

    let h_dests = h.h_dests

    for (let child of root.children) {
        let hms = bare_hmoves(h_dests, child.rule, {}, h.turn)
        if (!hms || hms.length === 0){
            return root
        }
    }
    match_hmoves(h_dests, root.children[root.children.length - 1], {}, h.turn)

    return root
}

type HDest = [Hopefox, Hopefox, Move]

/*
b =e3 +Q
 *p =g6
  *q =h7 #
  *p =f7 +K
  *a =Q
*/
function match_stars(h_dests: HDest[], l: Line, ctx: Context, lowers_turn: Color) {
    let res: HMove[] = []
    let h_res: HDest[] = []

    for (let [h, ha, da] of h_dests) {

        // Qxa1
        let a = makeSan(h.pos, da)

        if (a === 'Qb1') {
            //console.log(h.fen)
        }

        let a_ctx = { ...ctx }

        for (let key of Object.keys(ctx)) {
            if (a_ctx[key][a_ctx[key].length - 1] === da.from) {
                a_ctx[key] = [...a_ctx[key], da.to]
            }
        }

        let h_moves = bare_hmoves(ha.h_dests, l.rule.slice(1), a_ctx, lowers_turn)

        if (h_moves === undefined || h_moves.length === 0) {
            h_res.push([h, ha, da])
            continue
        }

        let add_missing = true
        for (let h_move of h_moves) {
            let ctx = h_move.c
            
            // hxg6
            let san = makeSan(ha.pos, h_move.da) 
            let ha2 = ha.apply_move(h_move.da)
            let h_dests = ha2.h_dests

            if (l.children.length > 0) {
                for (let child of l.children) {
                    h_dests = match_hmoves(h_dests, child, ctx, lowers_turn)
                    if (h_dests.length === 0) {
                        break
                    }
                }
            }

            if (l.children.length === 0 || h_dests.length === 0) {
                res.push({
                    c: ctx,
                    h,
                    ha: ha2,
                    h_to_ha: [da, h_move.da]
                })
                add_missing = false
                continue
            }

        }

        if (add_missing) {
            h_res.push([h, ha, da])
        }
    }

    l.m.push(...res)

    return h_res
}


function match_eq(h_dests: HDest[], l: Line, ctx: Context, lowers_turn: Color): HDest[] {

    let res: HDest[] = []

    h_dests: for (let [h, ha, da] of h_dests) {

        let q = l.rule[1]

        let f_roles = q_to_roles(q)
        let turn = q_is_lower(q) ? lowers_turn : opposite(lowers_turn)

        let collect = []
        for (let sq_set_fs of f_roles.map(role => ha.pos.board[role].intersect(ha.pos.board[turn]))) {
            for (let from_sq of sq_set_fs) {
                if (!ctx[q] || ctx[q][ctx[q].length - 1] === from_sq) {
                    continue h_dests
                }
            }
        }

        res.push([h, ha, da])
    }
    return res
}

function match_neg(h_dests: HDest[], l: Line, ctx: Context, lowers_turn: Color): HDest[] {

    let h_moves = bare_hmoves(h_dests, l.rule.slice(1), ctx, lowers_turn)

    let h = h_dests[0][0]

    let unmatched_dests: HDest[] = []

    h_moves?.forEach(_ => unmatched_dests.push([h, h.apply_move(_.da), _.da]))

    h_moves = h_dests
    .filter(_ => !h_moves?.find(h_move => h_move.da.from === _[2].from && h_move.da.to === _[2].to))
    .map(_ => ({
        c: ctx,
        da: _[2]
    }))


    if (h_moves === undefined) {
        return h_dests
    }


    if (l.children.length === 0) {
        h_moves.forEach(_ => {
            l.m.push({
                c: _.c,
                h,
                ha: h.apply_move(_.da),
                h_to_ha: [_.da]
            })
        })
        return h_dests.filter(([_h, _ha, da]) => !h_moves.find(_ => _.da.from === da.from && _.da.to === da.to))
    }

    let or = h.turn !== lowers_turn

    for (let h_move of h_moves) {
        let ha = h.apply_move(h_move.da)
        let ha_dests = ha.h_dests
        let a = makeSan(h.pos, h_move.da)

        for (let child of l.children) {
            ha_dests = match_hmoves(ha_dests, child, h_move.c, lowers_turn)

            if (ha_dests.length === 0) {
                break
            }
        }
        if ((or && ha_dests.length < ha.h_dests.length) || ha_dests.length === 0) {
            l.m.push({
                c: h_move.c,
                h,
                ha,
                h_to_ha: [h_move.da]
            })
        } else {
            unmatched_dests.push([h, ha, h_move.da])
        }
    }

    return unmatched_dests


}

function match_hmoves(h_dests: HDest[], l: Line, ctx: Context, lowers_turn: Color): HDest[] {

    let rule = l.rule

    if (rule[0] === '=') {
        return match_eq(h_dests, l, ctx, lowers_turn)
    }

    if (rule[0] === '^') {
        return match_neg(h_dests, l, ctx, lowers_turn)
    }

    if (rule[0] === '*') {
        return match_stars(h_dests, l, ctx, lowers_turn)
    }

    if (rule[0] === 'R' && h_dests.length > 2) {
        console.log(h_dests.length)
    }

    let h = h_dests[0][0]
    if (ctx['h7']?.[0] === 55 && l.rule === 'q =h7') {
        console.log('here')
    }



    let h_moves = bare_hmoves(h_dests, l.rule, ctx, lowers_turn)


    if (h_moves === undefined) {
        return h_dests
    }

    if (l.children.length === 0) {
        h_moves.forEach(_ => {
            l.m.push({
                c: _.c,
                h,
                ha: h.apply_move(_.da),
                h_to_ha: [_.da]
            })
        })
        return h_dests.filter(([_h, _ha, da]) => !h_moves.find(_ => _.da.from === da.from && _.da.to === da.to))
    }

    let unmatched_dests: HDest[] = []
    for (let h_move of h_moves) {
        let ha = h.apply_move(h_move.da)
        let ha_dests = ha.h_dests
        let a = makeSan(h.pos, h_move.da)

        for (let child of l.children) {
            ha_dests = match_hmoves(ha_dests, child, h_move.c, lowers_turn)

            if (ha_dests.length === 0) {
                break
            }
        }
        if (ha_dests.length === 0) {
            l.m.push({
                c: h_move.c,
                h,
                ha,
                h_to_ha: [h_move.da]
            })
        } else {
            unmatched_dests.push([h, ha, h_move.da])
        }
    }

    return unmatched_dests
}

type Rule = string

function bare_hmoves(h_dests: HDest[], rule: Rule, ctx: Context, lowers_turn: Color) {

    if (rule === '.') {
        let res: BareHMove[] = []
        h_dests.forEach(hd => {
            res.push({
                c: ctx,
                da: hd[2]
            })
        })
        return res
    }

    if (h_dests.length === 0) {
        return undefined
    }

    let h = h_dests[0][0]

        
    let qeR = rule.match(/^([pqrnbkPQRNBKmjuarMJUAR]'?) =([pqrnbkPQRNBKmjuarMJUAR]'?)/)
    let qec1 = rule.match(/^([pqrnbkPQRNBKmjuarMJUAR]'?) =([a-h][1-8])/)
    let qe_ = rule.match(/^([pqrnbkPQRNBKmjuarMJUAR]'?) =_/)

    let cKcR = rule.match(/\+([pqrnbkPQRNBKmjuarMJUAR]'?) \+([pqrnbkPQRNBKmjuarMJUAR]'?)/)
    let cK = rule.match(/\+([pqrnbkPQRNBKmjuarMJUAR]'?)$/)

    let cc1 = rule.match(/\+([a-h][1-8])$/)


    let qe = rule.match(/^([pqrnbkPQRNBKmjuarMJUAR]'?)=$/)

    let mate = rule.includes('#')

    if (mate) {
        let moves = h_dests.filter(([h,ha, _]) => ha.is_checkmate)
        if (moves.length === 0) {
            return undefined
        }

        return moves.map(da => ({ c: ctx, da: da[2] }))
    }

    let mm: BareHMove[] = []
    let res = [ctx]
    if (qec1) {

        let [_, q, c1] = qec1

        let f_roles = q_to_roles(q)
        let turn = q_is_lower(q) ? lowers_turn : opposite(lowers_turn)

        let collect = []
        for (let sq_set_fs of f_roles.map(role => h.pos.board[role].intersect(h.pos.board[turn]))) {
            for (let from_sq of sq_set_fs) {

                let f_piece = h.pos.board.get(from_sq)!


                loop_to_sq: for (let to_sq of attacks(f_piece, from_sq, h.pos.board.occupied)) {

                    let to_piece = h.pos.board.get(to_sq)

                    if (to_piece) {
                        //continue
                    }

                    if (cc1) {
                        let [_, ce1] = cc1

                        let checks = []
                        for (let c_sq of attacks(f_piece, to_sq, h.pos.board.occupied.without(from_sq).with(to_sq))) {

                            let c_piece = h.pos.board.get(c_sq)

                            if (!c_piece) {
                               // continue
                            }

                            checks.push(c_sq)
                        }


                            for (let c_sq of checks) {
                                collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [c1]: [to_sq], [ce1]: [c_sq] }]]))
                            }
                        continue
                    }

                    if (cKcR) {
                        let [_, cK, cR] = cKcR

                        let cK_roles = q_to_roles(cK)
                        let cR_roles = q_to_roles(cR)

                        let cK_color = q_is_lower(cK) ? lowers_turn : opposite(lowers_turn)
                        let cR_color = q_is_lower(cR) ? lowers_turn : opposite(lowers_turn)

                        let checks = []
                        for (let c_sq of attacks(f_piece, to_sq, h.pos.board.occupied.without(from_sq).with(to_sq))) {

                            let c_piece = h.pos.board.get(c_sq)

                            if (!c_piece) {
                                continue
                            }

                            if (cK_color !== c_piece.color) {
                                continue
                            }

                            if (cR_color !== c_piece.color) {
                                continue
                            }

                            let k_check, r_check
                            if (cK_roles.includes(c_piece.role)) {
                                k_check = true
                            }
                            if (cR_roles.includes(c_piece.role)) {
                                r_check = true
                            }

                            if (k_check && r_check) {
                                checks.push([c_sq, c_sq])
                            } else if (k_check) {
                                checks.push([c_sq, undefined])
                            } else if (r_check) {
                                checks.push([undefined, c_sq])
                            }
                        }


                        if (checks.length === 3) {
                            if (checks[0][0] !== undefined && checks[1][1] !== undefined)
                                collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [c1]: [to_sq], [cK]: [checks[0][0]], [cR]: [checks[1][1]] }]]))
                            if (checks[0][1] !== undefined && checks[1][0] !== undefined)
                            collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [c1]: [to_sq], [cK]: [checks[1][0]!], [cR]: [checks[0][1]!] }]]))
                            if (checks[0][0] !== undefined && checks[2][1] !== undefined)
                                collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [c1]: [to_sq], [cK]: [checks[0][0]], [cR]: [checks[2][1]] }]]))
                            if (checks[0][1] !== undefined && checks[2][0] !== undefined)
                            collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [c1]: [to_sq], [cK]: [checks[1][0]!], [cR]: [checks[0][1]!] }]]))
                            if (checks[1][0] !== undefined && checks[2][1] !== undefined)
                                collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [c1]: [to_sq], [cK]: [checks[1][0]], [cR]: [checks[2][1]] }]]))
                            if (checks[1][1] !== undefined && checks[2][0] !== undefined)
                            collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [c1]: [to_sq], [cK]: [checks[1][0]!], [cR]: [checks[0][1]!] }]]))


                        }
                        if (checks.length === 2) {
                            if (checks[0][0] !== undefined && checks[1][1] !== undefined)
                                collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [c1]: [to_sq], [cK]: [checks[0][0]], [cR]: [checks[1][1]] }]]))
                            if (checks[0][1] !== undefined && checks[1][0] !== undefined)
                            collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [c1]: [to_sq], [cK]: [checks[1][0]!], [cR]: [checks[0][1]!] }]]))
                        }
                        continue
                    } else {

                        if (cK) {
                            let [_, K] = cK

                            let cK_roles = q_to_roles(K)

                            let cK_color = q_is_lower(K) ? lowers_turn : opposite(lowers_turn)

                            let checks = []
                            for (let c_sq of attacks(f_piece, to_sq, h.pos.board.occupied.without(from_sq).with(to_sq))) {

                                let c_piece = h.pos.board.get(c_sq)

                                if (!c_piece) {
                                    continue
                                }

                                if (cK_color !== c_piece.color) {
                                    continue
                                }

                                if (cK_roles.includes(c_piece.role)) {
                                    checks.push(c_sq)
                                }
                            }

                            for (let c_sq of checks) {
                                collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [c1]: [to_sq], [K]: [c_sq] }]]))
                            }
                            continue
                        }


                    }

                    collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [c1]: [to_sq] }]]))
                }
            }
        }

        if (collect.length === 0) {
            return undefined
        }

        for (let ctx of collect) {

            let moves = h_dests.filter(([h,ha, _]) =>
                ctx[q][ctx[q].length - 2] === _.from && ctx[c1][ctx[c1].length - 1] === _.to
            )

            if (moves.length === 0) {
                continue
            }

            mm.push(...moves.map(da => ({ c: ctx, da: da[2] })))
        }
    } else if (qeR) {

        let [_, q, R] = qeR


        let f_roles = q_to_roles(q)
        let to_roles = q_to_roles(R)

        let turn = q_is_lower(q) ? lowers_turn : opposite(lowers_turn)

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



                    if (cKcR) {
                        let [_, cK, cR] = cKcR

                        let cK_roles = q_to_roles(cK)
                        let cR_roles = q_to_roles(cR)

                        let cK_color = q_is_lower(cK) ? lowers_turn : opposite(lowers_turn)
                        let cR_color = q_is_lower(cR) ? lowers_turn : opposite(lowers_turn)

                        let checks = []
                        for (let c_sq of attacks(f_piece, to_sq, h.pos.board.occupied.without(from_sq).with(to_sq))) {

                            let c_piece = h.pos.board.get(c_sq)

                            if (!c_piece) {
                                continue
                            }

                            if (cK_color !== c_piece.color) {
                                continue
                            }

                            if (cR_color !== c_piece.color) {
                                continue
                            }

                            let k_check, r_check
                            if (cK_roles.includes(c_piece.role)) {
                                k_check = true
                            }
                            if (cR_roles.includes(c_piece.role)) {
                                r_check = true
                            }

                            if (k_check && r_check) {
                                checks.push([c_sq, c_sq])
                            } else if (k_check) {
                                checks.push([c_sq, undefined])
                            } else if (r_check) {
                                checks.push([undefined, c_sq])
                            }
                        }


                        if (checks.length === 3) {
                            if (checks[0][0] !== undefined && checks[1][1] !== undefined)
                                collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [R]: [to_sq], [cK]: [checks[0][0]], [cR]: [checks[1][1]] }]]))
                            if (checks[0][1] !== undefined && checks[1][0] !== undefined)
                            collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [R]: [to_sq], [cK]: [checks[1][0]!], [cR]: [checks[0][1]!] }]]))
                            if (checks[0][0] !== undefined && checks[2][1] !== undefined)
                                collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [R]: [to_sq], [cK]: [checks[0][0]], [cR]: [checks[2][1]] }]]))
                            if (checks[0][1] !== undefined && checks[2][0] !== undefined)
                            collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [R]: [to_sq], [cK]: [checks[1][0]!], [cR]: [checks[0][1]!] }]]))
                            if (checks[1][0] !== undefined && checks[2][1] !== undefined)
                                collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [R]: [to_sq], [cK]: [checks[1][0]], [cR]: [checks[2][1]] }]]))
                            if (checks[1][1] !== undefined && checks[2][0] !== undefined)
                            collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [R]: [to_sq], [cK]: [checks[1][0]!], [cR]: [checks[0][1]!] }]]))


                        }
                        if (checks.length === 2) {
                            if (checks[0][0] !== undefined && checks[1][1] !== undefined)
                                collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [R]: [to_sq], [cK]: [checks[0][0]], [cR]: [checks[1][1]] }]]))
                            if (checks[0][1] !== undefined && checks[1][0] !== undefined)
                            collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [R]: [to_sq], [cK]: [checks[1][0]!], [cR]: [checks[0][1]!] }]]))
                        }
                        continue
                    } else {

                        if (cK) {
                            let [_, K] = cK

                            let cK_roles = q_to_roles(K)

                            let cK_color = q_is_lower(K) ? lowers_turn : opposite(lowers_turn)

                            let checks = []
                            for (let c_sq of attacks(f_piece, to_sq, h.pos.board.occupied.without(from_sq).with(to_sq))) {

                                let c_piece = h.pos.board.get(c_sq)

                                if (!c_piece) {
                                    continue
                                }

                                if (cK_color !== c_piece.color) {
                                    continue
                                }

                                if (cK_roles.includes(c_piece.role)) {
                                    checks.push(c_sq)
                                }
                            }

                            for (let c_sq of checks) {
                                collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [R]: [to_sq], [K]: [c_sq] }]]))
                            }
                            continue
                        }
                    }

                    collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [R]: [to_sq] }]]))
                }
            }
        }

        if (collect.length === 0) {
            return undefined
        }

        for (let ctx of collect) {

            let moves = h_dests.filter(([h, ha, _]) =>
                ctx[q][ctx[q].length - 2] === _.from && ctx[R][ctx[R].length - 1] === _.to
            )

            if (moves.length === 0) {
                continue
            }


            mm.push(...moves.map(da => ({ c: ctx, da: da[2] })))
        }


    }

    if (qe) {
        let [_, q] = qe

        let f_roles = q_to_roles(q)
        let turn = q_is_lower(q) ? lowers_turn : opposite(lowers_turn)

        let collect = []
        for (let sq_set_fs of f_roles.map(role => h.pos.board[role].intersect(h.pos.board[turn]))) {
            for (let from_sq of sq_set_fs) {

                let f_piece = h.pos.board.get(from_sq)!

                collect.push(...merge_cc([res, [{ [q]: [from_sq] }]]))
            }
        }

    }

    if (qe_) {
        let [_, q] = qe_

        let f_roles = q_to_roles(q)
        let turn = q_is_lower(q) ? lowers_turn : opposite(lowers_turn)

        let collect = []
        for (let sq_set_fs of f_roles.map(role => h.pos.board[role].intersect(h.pos.board[turn]))) {
            for (let from_sq of sq_set_fs) {

                let f_piece = h.pos.board.get(from_sq)!


                loop_to_sq: for (let to_sq of attacks(f_piece, from_sq, h.pos.board.occupied)) {

                    let to_piece = h.pos.board.get(to_sq)

                    if (to_piece) {
                        //continue
                    }

                    if (cc1) {
                        let [_, ce1] = cc1

                        let checks = []
                        for (let c_sq of attacks(f_piece, to_sq, h.pos.board.occupied.without(from_sq).with(to_sq))) {

                            let c_piece = h.pos.board.get(c_sq)

                            if (!c_piece) {
                               // continue
                            }

                            checks.push(c_sq)
                        }


                            for (let c_sq of checks) {
                                collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [ce1]: [c_sq] }]]))
                            }
                        continue
                    }


                    if (cKcR) {
                        let [_, cK, cR] = cKcR

                        let cK_roles = q_to_roles(cK)
                        let cR_roles = q_to_roles(cR)

                        let cK_color = q_is_lower(cK) ? lowers_turn : opposite(lowers_turn)
                        let cR_color = q_is_lower(cR) ? lowers_turn : opposite(lowers_turn)

                        let checks = []
                        for (let c_sq of attacks(f_piece, to_sq, h.pos.board.occupied.without(from_sq).with(to_sq))) {

                            let c_piece = h.pos.board.get(c_sq)

                            if (!c_piece) {
                                continue
                            }

                            if (cK_color !== c_piece.color) {
                                continue
                            }

                            if (cR_color !== c_piece.color) {
                                continue
                            }

                            let k_check, r_check
                            if (cK_roles.includes(c_piece.role)) {
                                k_check = true
                            }
                            if (cR_roles.includes(c_piece.role)) {
                                r_check = true
                            }

                            if (k_check && r_check) {
                                checks.push([c_sq, c_sq])
                            } else if (k_check) {
                                checks.push([c_sq, undefined])
                            } else if (r_check) {
                                checks.push([undefined, c_sq])
                            }
                        }


                        if (checks.length === 3) {
                            if (checks[0][0] !== undefined && checks[1][1] !== undefined)
                                collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [cR]: [checks[1][1]] }]]))
                            if (checks[0][1] !== undefined && checks[1][0] !== undefined)
                            collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [cR]: [checks[0][1]!] }]]))
                            if (checks[0][0] !== undefined && checks[2][1] !== undefined)
                                collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [cR]: [checks[2][1]] }]]))
                            if (checks[0][1] !== undefined && checks[2][0] !== undefined)
                            collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [cR]: [checks[0][1]!] }]]))
                            if (checks[1][0] !== undefined && checks[2][1] !== undefined)
                                collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [cR]: [checks[2][1]] }]]))
                            if (checks[1][1] !== undefined && checks[2][0] !== undefined)
                            collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [cR]: [checks[0][1]!] }]]))


                        }
                        if (checks.length === 2) {
                            if (checks[0][0] !== undefined && checks[1][1] !== undefined)
                                collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [cR]: [checks[1][1]] }]]))
                            if (checks[0][1] !== undefined && checks[1][0] !== undefined)
                            collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [cR]: [checks[0][1]!] }]]))
                        }
                        continue
                    } else {

                        if (cK) {
                            let [_, K] = cK

                            let cK_roles = q_to_roles(K)

                            let cK_color = q_is_lower(K) ? lowers_turn : opposite(lowers_turn)

                            let checks = []
                            for (let c_sq of attacks(f_piece, to_sq, h.pos.board.occupied.without(from_sq).with(to_sq))) {

                                let c_piece = h.pos.board.get(c_sq)

                                if (!c_piece) {
                                    continue
                                }

                                if (cK_color !== c_piece.color) {
                                    continue
                                }

                                if (cK_roles.includes(c_piece.role)) {
                                    checks.push(c_sq)
                                }
                            }

                            for (let c_sq of checks) {
                                collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [K]: [c_sq] }]]))
                            }
                            continue
                        }


                    }

                    collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq] }]]))
                }
            }
        }

        if (collect.length === 0) {
            return undefined
        }

        for (let ctx of collect) {

            let moves = h_dests.filter(([h,ha, _]) =>
                ctx[q][ctx[q].length - 2] === _.from && 
                ctx[q][ctx[q].length - 1] === _.to
            )

            if (moves.length === 0) {
                continue
            }

            mm.push(...moves.map(da => ({ c: ctx, da: da[2] })))
        }
    }

    return mm
}
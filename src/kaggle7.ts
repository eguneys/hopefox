import { listeners } from "process"
import { Hopefox } from "./hopefox_helper"
import { Color, Move, Role, Square } from "./types"
import { opposite } from "./util"
import { attacks } from "./attacks"
import { makeSan } from "./san"


const cartesianProduct = <T>(arrays: T[][]) => {
  return arrays.reduce((acc: T[][], array: T[]) =>
    acc.flatMap(a => array.map(b => [...a, b])),
    [[]] // Start with an empty array inside an array
  );
};



function merge_contexts(a: Context, b: Context): Context | undefined {

    function append_if_valid(a: Square[], b: Square[]) {

        if (a.length === 2 && b.length === 1) {
            if (a[a.length - 1] !== b[0]) {
                return undefined
            }
            return a
        }
        throw [a, b]
    }

    let res: Context = {}

    for (let ai of Object.keys(a)) {
        if (b[ai]) {
            let ar = append_if_valid(a[ai], b[ai])
            if (!ar) {
                return undefined
            }
            res[ai] = ar
        }
    }

    for (let bi of Object.keys(b)) {
        if (!a[bi]) {
            res[bi] = b[bi]
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

    let root = { depth: -1, rule: '.', children: [] }
    const stack: Line[] = [root]

    for (let i = 0; i < ss.length; i++) {
        let line = ss[i]
        const rule = line.trim()
        if (!rule) continue

        const depth = line.search(/\S/)

        let node: Line  = { depth, rule, children: [] }

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

    res += " " + l.rule + " <" + (l.m?.map(_ => {
        let res =  ''
        
        //res += _.h.fen + ' '
        res += _.moves.slice(0, 3).map(m => makeSan(_.h.pos, m)).join(' ')

        if (_.moves.length > 3) {
            res += " .." + (_.moves.length - 3)
        }
        return res
    }).join(',') ?? "?") + ">\n"

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

function find_hmoves(rule: string, h: Hopefox, ctx: Context, lowers_turn: Color) {

    let mm: HMoves[] = []


    let res = [ctx]

    if (rule === '.') {
        mm.push({
            c: ctx,
            h,
            moves: h.dests
        })
    } else if (rule[0] === '*') {
        mm.push({
            c: ctx,
            h,
            moves: h.dests
        })
    }


    let qeR = rule.match(/^([pqrnbkmPQRNBKM]'?) =([pqrnbkmPQRNBKM]'?)/)
    let qec1 = rule.match(/^([pqrnbkmPQRNBKM]'?) =([a-h][1-8])/)

    let cKcR = rule.match(/\+([pqrnbkmPQRNBKM]'?) \+([pqrnbkmPQRNBKM]'?)/)

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


                    if (cKcR) {
                        let [_, cK, cR] = cKcR

                        let cK_roles = q_to_roles(cK)
                        let cR_roles = q_to_roles(cR)

                        let k_check = false, r_check = false
                        for (let c_sq of attacks(f_piece, to_sq, h.pos.board.occupied.without(from_sq).with(to_sq))) {

                            let c_piece = h.pos.board.get(c_sq)

                            if (!c_piece) {
                                continue
                            }

                            if (cK_roles.includes(c_piece.role)) {
                                k_check = true
                            }

                            if (cR_roles.includes(c_piece.role)) {
                                r_check = true
                            }

                        }

                        if (k_check && r_check) {
                            collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [c1]: [to_sq] }]]))
                        }
                        continue
                    }

                    collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [c1]: [to_sq] }]]))
                }
            }
        }

        if (collect.length === 0) {
            return undefined
        }

        for (let ctx of collect) {

            let moves = h.dests.filter(_ =>
                ctx[q][ctx[q].length - 2] === _.from && ctx[c1][ctx[c1].length - 1] === _.to
            )

            if (moves.length === 0) {
                continue
            }

            mm.push({
                c: ctx,
                h,
                moves
            })
        }
    }

    if (qeR) {

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

                    collect.push(...merge_cc([res, [{ [q]: [from_sq, to_sq], [R]: [to_sq] }]]))
                }
            }
        }

        if (collect.length === 0) {
            return undefined
        }

        for (let ctx of collect) {

            let moves = h.dests.filter(_ =>
                ctx[q][ctx[q].length - 2] === _.from && ctx[R][ctx[R].length - 1] === _.to
            )

            if (moves.length === 0) {
                continue
            }

            mm.push({
                c: ctx,
                h,
                moves
            })
        }
    }

    return mm
}

type Line = {
    depth: number,
    rule: string,
    children: Line[],
    m?: HMoves[],
}

type HMoves = {
    c: Context,
    h: Hopefox,
    moves: Move[]
}

type Context = Record<string, Square[]>


function h_moves_recurse(node: Line, h: Hopefox, ctx: Context, lowers_turn: Color) {

    let h_moves = find_hmoves(node.rule, h, ctx, lowers_turn)

    if (!h_moves) {
        return false
    }

    let res: HMoves[] = []

    hmoves: for (let h_move of h_moves) {
        let ctx = h_move.c

        if (h_move.moves.length === 1) {
            let move = h_move.moves[0]
            let ha = h.apply_move(move)

            if (node.children.length === 0) {
            } else {
                for (let child of node.children) {
                    let matched = h_moves_recurse(child, ha, ctx, lowers_turn)
                    if (!matched) {
                        continue hmoves
                    }
                }
            }
        }
        res.push(h_move)
    }

    if (res.length === 0) {
        return false
    }
    if (!node.m) {
        node.m = res
    } else {
        node.m.push(...res)
    }
    return true
}

/*

id_08OfC

r =P
K =P
Q =B
b =B +K
 *b =R +K
 Q =b
  r =P
   *r =h1 #
   K =r
    n =R +K +Q
   Q =n
    n' =Q
     K =r
      n' =R
*/

export function find_san7(fen: string, rules: string) {
    let root = make_root(fen, rules)

    let m = root.children[root.children.length - 1].m
    if (!m) {
        return undefined
    }
    return makeSan(m[0].h.pos, m[0].moves[0])
}

export function make_root(fen: string, rules: string) {

    let h = Hopefox.from_fen(fen)
    let root = parse_rules(rules)


    for (let child of root.children) {
        h_moves_recurse(child, h, {}, h.turn)
    }

    return root
}
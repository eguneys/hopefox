import { BlockList } from "net";
import { attacks } from "./attacks";
import { SquareSet } from "./squareSet";
import { Color, Move, Piece, Square } from "./types";
import { board, squareSet } from "./debug";
import { Hopefox, move_to_san2 } from "./kaggle";
import { copy_ctx, role_to_char } from "./kaggle2";
import { makeSquare, opposite } from "./util";

export function blocks(piece: Piece, square: Square, occupied: SquareSet) {

    let res: SquareSet[] = []

    while (true) {
        let aa = attacks(piece, square, occupied)

        let blocks = occupied.intersect(aa)

        if (blocks.isEmpty()) {
            break
        }

        occupied = occupied.diff(blocks)

        res.push(blocks)
    }

    return res
}

export type Context = Record<string, Square>

export function parse_rule_plus(rule: string) {
    let [a, b, c] = rule.split('&')

    if (!b) {
        return parse_rule(a)
    }


    let aa = parse_rule(a)
    let bb = parse_rule(b)

    if (!c) {
        return (h: Hopefox) => {
            return bb(h, aa(h))
        }
    }

    let cc = parse_rule(c)

    return (h: Hopefox) => {
        return cc(h, bb(h, aa(h)))
    }
}


export function parse_rule(rule: string) {

    let [from, to] = rule.trim().split(' ')

    let eQ = to.match(/^=([pqrnbkPQRNBK]'?)$/)?.[1]
    let cK = to.match(/^\+([pqrnbkPQRNBK]'?)$/)?.[1]
    let ec1cQcK = to.match(/^=([a-h][1-8])\+([pqrnbkPQRNBK]'?)\.([pqrnbkPQRNBK]'?)$/)

    let ec1 = to.match(/^=([a-h][1-8])$/)?.[1]
    let cc1 = to.match(/^\+([a-h][1-8])$/)?.[1]
    let eb2cK = to.match(/^=([a-h][1-8])\+([pqrnbkPQRNBK]'?)$/)
    let eb2cc1 = to.match(/^=([a-h][1-8])\+([a-h][1-8])$/)

    let ec1cc1cK = to.match(/^=([a-h][1-8])\+([a-h][1-8])=\+([pqrnbkPQRNBK]'?)$/)

    let eQdN = to.match(/^=([pqrnbkPQRNBK]'?)\.([pqrnbkPQRNBK]'?)$/)

    return (h: Hopefox, res: Context[] = []): Context[] => {

        let h_dests = h.h_dests

        let good = false
        let mark: Context[] = []
        for (let [h, ha, da] of h_dests) {

            let from_piece = h.piece(da.from)!

            if (role_to_char(from_piece.role) === from[0].toLowerCase()) {

                let f_color = from.toLowerCase() === from ? h.turn : ha.turn

                if (f_color !== from_piece.color) {
                    continue
                }


                let ctx: Context = {}

                let collect = []
                for (let c of res) {
                    if (c[from] !== undefined) {
                        if (c[from] !== da.from) {
                            let ctx = copy_ctx(c)
                            ctx[from] = da.from
                            collect.push(ctx)
                        } else {
                            collect.push(c)
                        }
                    } else {
                        let ctx = copy_ctx(c)
                        ctx[from] = da.from
                        collect.push(ctx)
                    }
                }
                res = collect

                if (!res.find(_ => _[from] !== undefined)) {
                    let ctx = {[from]: da.from}
                    res.push(ctx)
                }

                if (move_to_san2([h, ha, da]) === 'Qa1') {
                    //console.log('here')
                }
                let lower_color = h.turn
                let to_contexts = find_to_context(h, ha, da, res, lower_color)

                if (to_contexts.length === 0) {
                    continue
                }

                //console.log('YES')
                //console.log(mark, to_contexts, move_to_san2([h, ha, da]))
                mark.push(...to_contexts)
                good = true
            }
        }

        if (!good) {
            return []
        }
        //console.log(mark)
        return mark
    }

    function find_to_context(h: Hopefox, ha: Hopefox, da: Move, res: Context[], lower_color: Color): Context[] {

        if (eQ) {
            let Q = h.piece(da.to)

            let q_color = eQ.toLowerCase() === eQ ? lower_color : opposite(lower_color)

            if (!Q) {
                return []
            }
            if (role_to_char(Q.role) !== eQ[0].toLowerCase()) {
                return []
            }
            if (Q.color !== q_color) {
                return []
            }


            let collect = []
            for (let c of res) {
                if (c[eQ] !== undefined) {
                    if (c[eQ] !== da.to) {
                        continue
                    }
                    collect.push(c)
                } else {
                    let ctx = copy_ctx(c)
                    ctx[eQ] = da.to
                    collect.push(ctx)
                }
            }
            return collect
        }

        if (cK) {

            for (let toK of attacks(h.piece(da.from)!, da.to, h.pos.board.occupied)) {

                let K = h.piece(toK)

                let k_color = cK.toLowerCase() === cK ? lower_color : opposite(lower_color)

                if (!K) {
                    continue
                }

                if (role_to_char(K.role) !== cK[0].toLowerCase()) {
                    continue
                }

                if (K.color !== k_color) {
                    continue
                }


                let collect = []
                for (let c of res) {
                    if (c[cK] !== undefined) {
                        if (c[cK] !== toK) {
                            continue
                        }
                        collect.push(c)
                    } else {
                        let ctx = copy_ctx(c)
                        ctx[cK] = toK
                        ctx[`+${cK}`] = da.to
                        collect.push(ctx)
                    }
                }

                return collect
            }
        }


        if (ec1cQcK) {
            let [_, ec1, cQ, cK] = ec1cQcK

            let c1 = h.piece(da.to)

            if (c1) {
                return []
            }


            let collect = []
            for (let c of res) {
                if (c[ec1] !== undefined) {
                    if (c[ec1] !== da.to) {
                        continue
                    }
                    collect.push(c)
                } else {
                    let ctx = copy_ctx(c)
                    ctx[ec1] = da.to
                    collect.push(ctx)
                }
            }
            res = collect

            let bbb = blocks(h.piece(da.from)!, da.to, ha.pos.board.occupied)

            let bQ = bbb[0]
            let bK = bbb[1]

            if (!bK) {
                return []
            }

            let good = false
            for (let toq of bQ) {
                let q = h.piece(toq)!

                let q_color = cQ.toLowerCase() === cQ ? lower_color : opposite(lower_color)

                if (role_to_char(q.role) !== cQ[0].toLowerCase()) {
                    continue
                }

                if (q.color !== q_color) {
                    continue
                }

                let collect = []
                for (let c of res) {
                    if (c[cQ] !== undefined) {
                        if (c[cQ] !== toq) {
                            continue
                        }
                        collect.push(c)
                    } else {
                        let ctx = copy_ctx(c)
                        ctx[cQ] = toq
                        collect.push(ctx)
                    }
                }
                res = collect
                good = true
            }
            if (!good) {
                return []
            }

            good = false
            for (let tok of bK) {
                let k = h.piece(tok)!

                let k_color = cK.toLowerCase() === cK ? lower_color : opposite(lower_color)

                if (role_to_char(k.role) !== cK[0].toLowerCase()) {
                    continue
                }

                if (k.color !== k_color) {
                    continue
                }

                let collect = []
                for (let c of res) {
                    if (c[cK] !== undefined) {
                        if (c[cK] !== tok) {
                            continue
                        }
                        collect.push(c)
                    } else {
                        let ctx = copy_ctx(c)
                        ctx[cK] = tok
                        collect.push(ctx)
                    }
                }
                res = collect
                good = true
            }
            if (!good) {
                return []
            }
            return res
        }

        if (ec1) {

            let c1 = h.piece(da.to)

            if (c1) {
                //return []
            }


            let collect = []
            for (let c of res) {
                if (c[ec1] !== undefined) {
                    if (c[ec1] !== da.to) {
                        continue
                    }
                    collect.push(c)
                } else {
                    let ctx = copy_ctx(c)
                    ctx[ec1] = da.to
                    collect.push(ctx)
                }
            }
            res = collect

            return res
        }


        if (cc1) {

            let mark: Context[] = []
            for (let toc1 of attacks(h.piece(da.from)!, da.to, h.pos.board.occupied)) {

                let c1 = h.piece(toc1)

                if (c1) {
                    continue
                }

                let collect = []
                for (let c of res) {
                    if (c[cc1] !== undefined) {
                        if (c[cc1] !== toc1) {
                            continue
                        }
                        let ctx = copy_ctx(c)
                        ctx[`+${cc1}`] = da.to
                        collect.push(ctx)
                    } else {
                        let ctx = copy_ctx(c)
                        ctx[cc1] = toc1
                        ctx[`+${cc1}`] = da.to
                        collect.push(ctx)
                    }
                }

                mark.push(...collect)
            }
            return mark
        }

        if (eb2cK) {
            let [_, eb2, cK] = eb2cK

            let b2 = h.piece(da.to)

            if (b2) {
                return []
            }


            let collect = []
            for (let c of res) {
                if (c[eb2] !== undefined) {
                    if (c[eb2] !== da.to) {
                        continue
                    }
                    collect.push(c)
                } else {
                    let ctx = copy_ctx(c)
                    ctx[eb2] = da.to
                    collect.push(ctx)
                }
            }
            res = collect

            let bbb = blocks(h.piece(da.from)!, da.to, ha.pos.board.occupied)

            let bK = bbb[0]

            if (!bK) {
                return []
            }

            let good = false
            for (let tok of bK) {
                let k = h.piece(tok)!

                let k_color = cK.toLowerCase() === cK ? lower_color : opposite(lower_color)

                if (role_to_char(k.role) !== cK[0].toLowerCase()) {
                    continue
                }

                if (k.color !== k_color) {
                    continue
                }


                let collect = []
                for (let c of res) {
                    if (c[cK] !== undefined) {
                        if (c[cK] !== tok) {
                            continue
                        }
                        collect.push(c)
                    } else {
                        let ctx = copy_ctx(c)
                        ctx[cK] = tok
                        collect.push(ctx)
                    }
                }
                res = collect
                good = true
            }
            if (!good) {
                return []
            }
            return res
        }
        
        if (eb2cc1) {
            let [_, eb2, cc1] = eb2cc1

            let b2 = h.piece(da.to)

            if (b2) {
                return []
            }


            let collect = []
            for (let c of res) {
                if (c[eb2] !== undefined) {
                    if (c[eb2] !== da.to) {
                        continue
                    }
                    collect.push(c)
                } else {
                    let ctx = copy_ctx(c)
                    ctx[eb2] = da.to
                    collect.push(ctx)
                }
            }
            res = collect


            let mark: Context[] = []
            for (let toc1 of attacks(h.piece(da.from)!, da.to, h.pos.board.occupied)) {

                let c1 = h.piece(toc1)

                if (c1) {
                    continue
                }

                let collect = []
                for (let c of res) {
                    if (c[cc1] !== undefined) {
                        if (c[cc1] !== toc1) {
                            continue
                        }
                        let ctx = copy_ctx(c)
                        ctx[`+${cc1}`] = da.to
                        collect.push(ctx)
                    } else {
                        let ctx = copy_ctx(c)
                        ctx[cc1] = toc1
                        ctx[`+${cc1}`] = da.to
                        collect.push(ctx)
                    }
                }

                mark.push(...collect)
            }
            return mark
        }

        if (eQdN) {
            let [_, eQ, dN] = eQdN

            let bbb = blocks(h.piece(da.from)!, da.from, h.pos.board.occupied)

            let bQ = bbb[0]
            let bN = bbb[1]


            if (!bQ) {
                return []
            }

            let good = false
            for (let toq of bQ) {
                let q = h.piece(toq)!

                let q_color = eQ.toLowerCase() === eQ ? lower_color : opposite(lower_color)

                if (role_to_char(q.role) !== eQ[0].toLowerCase()) {
                    continue
                }

                if (q.color !== q_color) {
                    continue
                }


                let collect = []
                for (let c of res) {
                    if (c[eQ] !== undefined) {
                        if (c[eQ] !== toq) {
                            continue
                        }
                        collect.push(c)
                    } else {
                        let ctx = copy_ctx(c)
                        ctx[eQ] = toq
                        collect.push(ctx)
                    }
                }
                res = collect
                good = true
            }
            if (!good) {
                return []
            }

 
            if (!bN) {
                return []
            }

            good = false
            for (let ton of bN) {
                let n = h.piece(ton)!

                let n_color = dN.toLowerCase() === dN ? lower_color : opposite(lower_color)

                if (role_to_char(n.role) !== dN[0].toLowerCase()) {
                    continue
                }

                if (n.color !== n_color) {
                    continue
                }


                let collect = []
                for (let c of res) {
                    if (c[dN] !== undefined) {
                        if (c[dN] !== ton) {
                            continue
                        }
                        collect.push(c)
                    } else {
                        let ctx = copy_ctx(c)
                        ctx[dN] = ton
                        collect.push(ctx)
                    }
                }
                res = collect
                good = true
            }
            if (!good) {
                return []
            }

            return res
        }

        if (ec1cc1cK) {

            let [_, ec1, cc1, cK] = ec1cc1cK

            let c1 = h.piece(da.to)

            if (c1) {
                return []
            }


            let collect = []
            for (let c of res) {
                if (c[ec1] !== undefined) {
                    if (c[ec1] !== da.to) {
                        continue
                    }
                    collect.push(c)
                } else {
                    let ctx = copy_ctx(c)
                    ctx[ec1] = da.to
                    collect.push(ctx)
                }
            }
            res = collect

            let mark: Context[] = []
            for (let toc1 of attacks(h.piece(da.from)!, da.to, h.pos.board.occupied)) {

                let c1 = h.piece(toc1)

                if (c1) {
                    //continue
                }

                let collect = []
                for (let c of res) {
                    if (c[cc1] !== undefined) {
                        if (c[cc1] !== toc1) {
                            continue
                        }
                        let ctx = copy_ctx(c)
                        ctx[`+${cc1}`] = da.to
                        collect.push(ctx)
                    } else {
                        let ctx = copy_ctx(c)
                        ctx[cc1] = toc1
                        ctx[`+${cc1}`] = da.to
                        collect.push(ctx)
                    }
                }

                mark.push(...collect)
            }
            res = mark

            let c1froms = res.map(_ => _[`${cc1}`])
            mark = []
            for (let c1from of c1froms) {

                let bbb = blocks(h.piece(da.from)!, c1from, h.pos.board.occupied)

                let bK = bbb[0]

                if (!bK) {
                    continue
                }

                let good = false
                for (let tok of bK) {
                    let k = h.piece(tok)!

                    let k_color = cK.toLowerCase() === cK ? lower_color : opposite(lower_color)

                    if (role_to_char(k.role) !== cK[0].toLowerCase()) {
                        continue
                    }

                    if (k.color !== k_color) {
                        continue
                    }


                    let collect = []
                    for (let c of res) {
                        if (c[cK] !== undefined) {
                            if (c[cK] !== tok) {
                                continue
                            }
                            collect.push(c)
                        } else {
                            let ctx = copy_ctx(c)
                            ctx[cK] = tok
                            collect.push(ctx)
                        }
                    }
                    res = collect
                    good = true
                }
                if (!good) {
                    continue
                }
                mark.push(...res)
            }

            return mark
        }

        return []
    }
}


export function context2uci(uci: string, ctx: Context) {
    let [a, b] = uci.split(' ')
    let from = ctx[a]
    let to = ctx[b]

    if (from !== undefined && to !== undefined) {
        return `${makeSquare(from)}${makeSquare(to)}`
    }
}

export function find_san(fen: string, rules: string) {
    let [rule, path] = rules.split("\"").map(_ => _.trim())

    if (!rule || !path) {
        return undefined
    }

    let h = Hopefox.from_fen(fen)

    let a = parse_rule_plus(rule)(h)

    if (!a[0]) {
        return undefined
    }

    return context2uci(path, a[0])
}
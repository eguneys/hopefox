import { BlockList } from "net";
import { attacks } from "./attacks";
import { SquareSet } from "./squareSet";
import { Move, Piece, Square } from "./types";
import { board, squareSet } from "./debug";
import { Hopefox, move_to_san2 } from "./kaggle";
import { copy_ctx, role_to_char } from "./kaggle2";
import { makeSquare } from "./util";

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
    let [a, b] = rule.split('&')

    if (!b) {
        return parse_rule(a)
    }

    let aa = parse_rule(a)
    let bb = parse_rule(b)

    return (h: Hopefox) => {
        return bb(h, aa(h))
    }
}


export function parse_rule(rule: string) {

    let [from, to] = rule.trim().split(' ')


    let eQ = to.match(/^=([pqrnbkPQRNBK]2?)/)?.[1]
    let cK = to.match(/^\+([pqrnbkPQRNBK]2?)/)?.[1]
    let ec1cQcK = to.match(/^=([a-h][1|3-8])\+([pqrnbkPQRNBK]2?)\.([pqrnbkPQRNBK]2?)/)

    let ec1 = to.match(/^=([a-h][1|3-8])/)?.[1]
    let cc1 = to.match(/^\+([a-h][1|3-8])/)?.[1]

    return (h: Hopefox, res: Context[] = []): Context[] => {

        let h_dests = h.h_dests

        let good = false
        let mark: Context[] = []
        for (let [h, ha, da] of h_dests) {

            let from_piece = h.piece(da.from)!

            if (role_to_char(from_piece.role) === from[0]) {
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

                if (move_to_san2([h, ha, da]) === 'Rc1') {
                    //console.log('here')
                }
                let to_contexts = find_to_context(h, ha, da, res)

                //console.log(mark, to_contexts, move_to_san2([h, ha, da]))
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

    function find_to_context(h: Hopefox, ha: Hopefox, da: Move, res: Context[]): Context[] {

        if (eQ) {
            let Q = h.piece(da.to)

            if (!Q) {
                return []
            }
            if (role_to_char(Q.role) !== eQ[0].toLowerCase()) {
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

                if (!K) {
                    continue
                }

                if (role_to_char(K.role) !== cK[0].toLowerCase()) {
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

                if (role_to_char(q.role) !== cQ[0].toLowerCase()) {
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

                if (role_to_char(k.role) !== cK[0].toLowerCase()) {
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
                        collect.push(c)
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
import { attacks } from "./attacks";
import { Hopefox } from "./kaggle";
import { role_to_char } from "./kaggle2";
import { parse_rule } from "./kaggle3";
import { makeSan } from "./san";
import { Move, Square } from "./types";

export type Context = Record<string, Square>

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

    return {...a, ...b}
}

function merge_cc(cc: Context[][]) {
    let ccx = cartesianProduct(cc)

    let res = ccx.map(_ => 
        _.reduce((acc: Context | undefined, b: Context) =>
             acc ? merge_contexts(acc, b): undefined, {}))
    .filter(Boolean) as Context[]

    return res
}

export function find_san4(fen: string, rules: string) {

    let rr = rules.split('\n')
    .map(_ => _.trim())
    .filter(_ => _ !== '')

    let h = Hopefox.from_fen(fen)

    let ccc = rr.map(_ => find_contexts(_)(h))


    let res = merge_cc(ccc)

    const ures = Array.from(
        new Set(res.map(obj => JSON.stringify(obj))) // Convert objects to strings
    ).map(str => JSON.parse(str)); // Convert strings back to objects

    ures.sort((a, b) => Object.keys(a).length - Object.keys(b).length)

    let a = ures[0]


    if (a) {

        let [q, h5] = Object.keys(ccc[0]?.[0] ?? {})


        if (!q) {
            return undefined
        }

        let move = { from: a[h5], to: a[q] }

        return makeSan(h.pos, move)
    }
}

const cartesianProduct = <T>(arrays: T[][]) => {
  return arrays.reduce((acc: T[][], array: T[]) =>
    acc.flatMap(a => array.map(b => [...a, b])),
    [[]] // Start with an empty array inside an array
  );
};

function find_contexts(rule: string) {

    let [from, to, fi] = rule.trim().split(' ')

    let ec1 = to.match(/^=([a-h][1-8])$/)?.[1]

    let cc1 = fi?.match(/^\+([a-h][1-8])$/)?.[1]
    let cK = fi?.match(/^\+([pqrnbkPQRNBK]'?)$/)?.[1]
    let cc1cK = fi?.match(/^\+([a-h][1-8])\.([pqrnbkPQRNBK]'?)$/)

    return (h: Hopefox) => {
        let h_dests = h.h_dests

        let res: Context[] = []

        for (let [h, ha, da] of h_dests) {
            
            let from_piece = h.piece(da.from)!
            
            if (role_to_char(from_piece.role) !== from[0].toLowerCase()) {
                continue
            }
            let f_color = from.toLowerCase() === from ? h.turn : ha.turn

            if (f_color !== from_piece.color) {
                continue
            }


            let ctx: Context = {}

            ctx[from] = da.from

            let to_contexts = match_tos(h, ha, da)

            let aa = to_contexts.flatMap(_ => { 
                let res = merge_contexts(_, ctx)
                if (res) {
                    return [res]
                }
                return []
            })

            res.push(...aa)
        }

        return res
    }

    function match_tos(h: Hopefox, ha: Hopefox, da: Move) {
        let res: Context[] = [{}]


        if (cK) {

            let cc: Context[] = []
            for (let tocK of attacks(h.piece(da.from)!, da.to, h.pos.board.occupied)) {

                let K = h.piece(tocK)

                if (!K) {
                    continue
                }

                if (role_to_char(K.role) !== cK[0].toLowerCase()) {
                    continue
                }
                let f_color = cK.toLowerCase() === cK ? h.turn : ha.turn

                if (f_color !== K.color) {
                    continue
                }




                let ctx = {[cK]: tocK}

                cc.push(ctx)
            }
           
            res = merge_cc([res, cc])
        }




        if (ec1) {
            
            let c1 = h.piece(da.to)

            if (c1) {
                //return []
            }

            let ctx = {[ec1]: da.to}

            res = merge_cc([res, [ctx]])
        }


        if (cc1) {

            let cc: Context[] = []
            for (let toc1 of attacks(h.piece(da.from)!, da.to, h.pos.board.occupied)) {

                let c1 = h.piece(toc1)

                if (c1) {
                    //continue
                }

                let ctx = { [cc1]: toc1 }

                res.push(ctx)
            }

            res = merge_cc([res, cc])
        }



        if (cc1cK) {

            let [_, cc1, cK] = cc1cK

            let cc: Context[] = []

            for (let toc1 of attacks(h.piece(da.from)!, da.to, h.pos.board.occupied)) {

                let c1 = h.piece(toc1)

                if (c1) {
                    //continue
                }


                for (let toK of attacks(h.piece(da.from)!, toc1, ha.pos.board.occupied)) {

                    let K = h.piece(toK)

                    if (!K) {
                        continue
                    }

                    if (role_to_char(K.role) !== cK[0].toLowerCase()) {
                        continue
                    }

                    let f_color = cK.toLowerCase() === cK ? h.turn : ha.turn

                    if (f_color !== K.color) {
                        continue
                    }

                    let ctx = { [cc1]: toc1, [cK]: toK }

                    cc.push(ctx)
                }
            }

            res = merge_cc([res, cc])
        }

        return res
    }


}
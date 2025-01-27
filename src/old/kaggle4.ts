import { rmSync } from "fs";
import { attacks } from "./attacks";
import { Hopefox, move_to_san2 } from "./kaggle";
import { parse_rule } from "./kaggle3";
import { makeSan } from "./san";
import { Color, Move, Role, Square } from "./types";

export type Context = Record<string, Square>

const role_to_char = (role: Role) => {
    let a = role === 'knight' ? 'n' : role[0]

    return role === 'pawn' ? [a] : [a, 'm']
}

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

const str_hash = (str: string) => {
    var hash = 0, i = 0, len = str.length;
    while (i < len) {
        hash = ((hash << 5) - hash + str.charCodeAt(i++)) << 0;
    }
    return hash + 2147483647 + 1;
}


function cc_cache_function<T>(fn: (_: string) => T) {
    let cache: any = {}
    return (_: string) => {
        let key = _
        let v = cache[key]

        if (v) {
            return v
        }

        v = fn(_)

        cache[key] = v

        return v
    }
}

export function find_san4(fen: string, rules: string) {

    let rr = rules.split('\n')
    .filter(_ => _ !== '')

    let rr2 = rr
        .filter(_ => _.startsWith(' '))
        .map(_ => _.trim())

    rr = rr.filter(_ => _.trim() === _)

    let cff = rr.map(_ => find_contexts(_))

    let h = Hopefox.from_fen(fen)

    let ccc = cff.map(f => f(fen))

    let ures = merge_cc(ccc)

    let a = ures[0]

    let [q, h5] = Object.keys(ccc[0]?.[0] ?? {})


    if (!q) {
        return undefined
    }

    let sans = ures.map(a => {
        let move = { from: a[h5], to: a[q] }
        return makeSan(h.pos, move)
    })

    if (rr2.length === 0) {
        return sans[0]
    }

    ures.forEach(_ => _[h5] = _[q])

    let r2s = rr2.map(_ => find_contexts2(_))

    let res = []
    for (let _ of h.h_dests) {
        let a = move_to_san2(_)

        if (!sans.includes(a)) {
            continue
        }
        if (a === 'Qb3+') {
            //console.log(a)
        }

        let ha = _[1]
        let ha_dests = ha.h_and_h2_dests

        let covered = [...new Set(r2s.flatMap(_ => _(ha_dests, ures)))]

        //console.log(a, covered, covered.length, ha.dests.length)
        
        if (covered.length < ha.dests.length) {
            continue
        }


        res.push(a)
    }

    return res[0]
}



function find_contexts(rule: string) {

    let [from, to, fi] = rule.trim().split(' ')

    let ec1 = to.match(/^=([a-h][1-8])$/)?.[1]

    let cc1 = fi?.match(/^\+([a-h][1-8])$/)?.[1]
    let cK = fi?.match(/^\+([pqrnbkmPQRNBKM]'?)$/)?.[1]
    let cc1cK = fi?.match(/^\+([a-h][1-8])\.([pqrnbkmPQRNBKM]'?)$/)

    return (fen: string) => {
        let h: Hopefox = Hopefox.from_fen(fen)
        let h_dests = h.h_dests

        let res: Context[] = []

        for (let [h, ha, da] of h_dests) {
            
            //let a = move_to_san2([h, ha, da])
            //if (a === 'Qd1') {
             //   console.log(a)
           // }
            let from_piece = h.piece(da.from)!
            
            if (!role_to_char(from_piece.role).includes(from[0].toLowerCase())) {
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

                if (!role_to_char(K.role).includes(cK[0].toLowerCase())) {
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

                    if (!role_to_char(K.role).includes(cK[0].toLowerCase())) {
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

function find_contexts2(rule: string) {

    let [from, to, fi] = rule.trim().split(' ')

    let ec1 = to.match(/^=([a-h][1-8])$/)?.[1]
    let eK = to.match(/^=([pqrnbkmPQRNBKM]'?)$/)?.[1]

    let cc1 = fi?.match(/^\+([a-h][1-8])$/)?.[1]
    let cK = fi?.match(/^\+([pqrnbkmPQRNBKM]'?)$/)?.[1]
    let cc1cK = fi?.match(/^\+([a-h][1-8])\.([pqrnbkmPQRNBKM]'?)$/)

    return (h_and_h2_dests: [[Hopefox, Hopefox, Move], [Hopefox, Hopefox, Move][]][], ures: Context[]) => {


        let res: string[] = []
        for (let [[h, ha, da], h2s] of h_and_h2_dests) {
            let a = move_to_san2([h, ha, da])
            let found = false
                if (a === 'Bxb3') {

                    //console.log(a)
                }

            
            let ares = ures.map(_ => {
                let res = {..._}

                for (let k of Object.keys(res)) {
                    if (res[k] === da.from) {
                        res[k] = da.to
                    }
                }

                return res
            })


            for (let [h2, ha2, da2] of h2s) {

                if (false) {
                    let x2 = move_to_san2([h2, ha2, da2])

                    if (x2.includes('x')) {
                        console.log(x2)
                    }
                }

                let from_piece = h.piece(da2.from)!

                if (!role_to_char(from_piece.role).includes(from[0].toLowerCase())) {
                    continue
                }
                let f_color = from.toLowerCase() === from ? h2.turn : ha2.turn

                if (f_color !== from_piece.color) {
                    continue
                }



                let ctx: Context = {}

                ctx[from] = da2.from

                let to_contexts = match_tos(h2, ha2, da2)

                let aa = to_contexts.flatMap(_ => {
                    let res = merge_contexts(_, ctx)
                    if (res) {
                        return [res]
                    }
                    return []
                })

                if (aa.length === 0) {
                    continue
                }


                aa = merge_cc([ares, aa])

                if (aa.length === 0) {
                    continue
                }

                found = true
                break
            }
            if (found) {
                res.push(a)
            }
        }

        return res
    }

    function match_tos(h: Hopefox, ha: Hopefox, da: Move) {
        let res: Context[] = [{}]


        if (eK) {
            
            let K = h.piece(da.to)

            if (!K) {
                return []
            }

            if (!role_to_char(K.role).includes(eK[0].toLowerCase())) {
                return []
            }
            let f_color = eK.toLowerCase() === eK ? h.turn : ha.turn

            if (f_color !== K.color) {
                return []
            }



            let ctx = {[eK]: da.to}

            res = merge_cc([res, [ctx]])
        }

        if (cK) {

            let cc: Context[] = []
            for (let tocK of attacks(h.piece(da.from)!, da.to, h.pos.board.occupied)) {

                let K = h.piece(tocK)

                if (!K) {
                    continue
                }

                if (!role_to_char(K.role).includes(cK[0].toLowerCase())) {
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

                    if (!role_to_char(K.role).includes(cK[0].toLowerCase())) {
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

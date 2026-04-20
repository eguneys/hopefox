import { Context } from "./types";
import * as binding_set from './binding_set'
import { merge_binding } from "./binding_util";
import { make_move_from_to, make_move_from_to_promotion, move_c_to_Move, PositionC, PositionManager, role_to_c } from "../distill/hopefox_c";
import { PositionMaterializer, WorldId } from "../pos_materializer";
import { Role } from "../distill/types";

type BindingName = keyof typeof binding_set

function fields_to_bindings(ctx: Context, name: BindingName, fields: string[]): Map<string, number>[] {
    if (binding_set[name] === undefined) {
        throw new Error(`Unknown binding: ${name}`)
    }
    let res: Map<string, number>[] = binding_set[name](ctx).apply(null, fields as any)
    return res
}

`
    if blocks_check(knight, rook, king) then
       if captures_with_check(rook, knight) then
          if captures(pawn, rook) then
             if checks(queen, queen_to, king) then
                if captures(queen, queen_to) then
                   if has_fork(bishop, bishop_to, queen_to, king) then
                      if captures(queen_to, bishop_to) then
                         material_gain
 

`
function if_then(name: BindingName, fields: string[]) {
    return (ctx: Context, bindings: Map<string, number>[]) => {
        let new_bindings = []
        let bindings2 = fields_to_bindings(ctx, name, fields)
        for (let add_binding of bindings2) {
            for (let old_binding of bindings) {
                let new_binding = merge_binding(old_binding, add_binding)
                if (new_binding) {
                    new_bindings.push(new_binding)
                }
            }
        }
        return new_bindings
    }
}

export function match_rules_all(m: PositionManager, pos: PositionC, rules: string) {
    let res = []
    for (let rule of rules.trim().split('\n\n')) {
        let r = match_rules(m, pos, rule.trim())
        res.push(...r)
    }
    return res
}

export function match_rules(m: PositionManager, pos: PositionC, rule_a: string) {

    let rules = rule_a.trim().split('\n').map(_ => _.trim())

    let ctx = { mz: new PositionMaterializer(m, pos)}

    let res = one_rule(rules[0], rules.slice(1), [new Map()])

    let sans = []

    for (let a of res) {
        let mm = []
        for (let rule of rules) {
            let [_, name, fields] = rule.match(/^if (.*)\((.*)\) then$/)!

            let [from, to] = fields.split(', ').slice(0, 2)

            if (to === 'null') {
                continue
            }


                let move = make_move_from_to(a.get(from)!, a.get(to)!)
                if (name.includes('promote')) {
                    let promotion = role_to_c(to.split('_')[to.split('_').length - 1] as Role)
                    move = make_move_from_to_promotion(a.get(from)!, a.get(to)!, promotion)
                }


            mm.push(move)
        }

        let ww: WorldId[] = []
        for (let m of mm) {
            ww.push(ctx.mz.inc_add_move(m))
            ctx.mz.inc_make_world(ww[ww.length - 1])
        }
        sans.push(ctx.mz.inc_sans())
        for (let i = ww.length - 1; i >= 0; i--) {
            ctx.mz.inc_unmake_world(ww[i])
        }
    }
    return sans

    function one_rule(rule: string, rest: string[], bindings: Map<string, number>[]): Map<string, number>[] {
        let [_, name, fields] = rule.match(/^if (.*)\((.*)\) then$/)!
        //let res = if_then('has_fork', 'bishop, bishop_to, rook, king'.split(', '))
        let res = if_then(name as BindingName, fields.split(', '))
        let aa = res(ctx, bindings)

        let kk = []

        let from = fields.split(', ')[0]
        let to = fields.split(', ')[1]

        if (rest.length === 0) {
            for (let a of aa) {
                if (to === 'null') {
                    kk.push(a)
                    continue
                }

                let move = make_move_from_to(a.get(from)!, a.get(to)!)
                if (name.includes('promote')) {
                    let promotion = role_to_c(to.split('_')[to.split('_').length - 1] as Role)
                    move = make_move_from_to_promotion(a.get(from)!, a.get(to)!, promotion)
                }


                if (!ctx.mz.inc_generate_legal_moves().includes(move)) {
                    continue
                }

                kk.push(a)

            }
            return kk
        }



        for (let a of aa) {

            let move = make_move_from_to(a.get(from)!, a.get(to)!)
            if (name.includes('promote')) {
                let promotion = role_to_c(to.split('_')[to.split('_').length - 1] as Role)
                move = make_move_from_to_promotion(a.get(from)!, a.get(to)!, promotion)
            }



            if (!ctx.mz.inc_generate_legal_moves().includes(move)) {
                continue
            }

            let w0 = ctx.mz.inc_add_move(move)
            ctx.mz.inc_make_world(w0)

            let k = one_rule(rest[0], rest.slice(1), [a])
            kk.push(...k)

            ctx.mz.inc_unmake_world(w0)
        }
        return kk
    }
}
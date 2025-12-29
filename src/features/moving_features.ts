import { fen_pos, pos_moves } from "../hopefox";
import { FEN } from "../mor3_hope1";
import { Role, FileName, FILE_NAMES } from "../types";
import { squareFile, squareFromCoords, squareRank } from "../util";
import { PositionWithFeatures, apply_features, build_features, find_more_features } from "./more_features";
import { ActionApplication, ActionRestriction, apply_action, File_Ctx, FileRestriction, HitsRestriction, is_file2_restriction, is_file_restriction, is_hits_restriction, is_on_restriction, is_rank_restriction, is_role_restriction, is_to_restriction, RestrictionParameter, ruleset_split, Split } from "./split_ruleset";

export function moving_features(fen: FEN, text: string) {

    let ruleset = ruleset_split(text).map(_ => apply_action(_, []))

    let pos = fen_pos(fen)
    let moves = pos_moves(pos)
    let features = moves.map(move => build_features(pos, [], move))

    let depth = -1

    while (depth++ < 8 && features.length > 0) {

        let new_features: PositionWithFeatures[] = []
        for (let feature of features) {

            let next_ruleset: ActionApplication[] = []
            for (let { action: rule, ctx } of ruleset) {
                let file_ctx = satisfy_restrictions(feature, ctx, rule.restrictions)
                if (!file_ctx) {
                    continue
                }

                for (let transition of rule.transitions) {
                    let to_rule = ruleset.find(_ => _.action.definition.name === transition.name)!.action
                    let t_ctx = map_args_to_ctx(transition.args, file_ctx)

                    if (t_ctx === undefined) {
                        continue
                    }
                    next_ruleset.push(apply_action(to_rule, t_ctx))
                }
            }
            ruleset = next_ruleset

            new_features.push(...apply_features(pos, feature))
        }
    }
}

const left_of_a = (a: FileName) => FILE_NAMES[FILE_NAMES.indexOf(a) - 1]
const right_of_a = (a: FileName) => FILE_NAMES[FILE_NAMES.indexOf(a) + 1]

const in_between_ctx = (ctx: File_Ctx[], a: FileName, for_rank = false) => {

    let left_most!: FileName, right_most!: FileName

    let left_a = left_of_a(a)
    let right_a = right_of_a(a)
    for (let i = 0; i < 8; i++) {
        if (ctx.find(_ => _.a === left_a)) {
            left_most = left_a
            break
        }
        left_a = left_of_a(left_a)
    }

    for (let i = 0; i < 8; i++) {
        if (ctx.find(_ => _.a === right_a)) {
            right_most = right_a
            break
        }
        right_a = right_of_a(right_a)
    }

    let res: File_Ctx[] = []

    let sq = ctx.find(_ => _.a === left_most)!.sq
    let rank = squareRank(sq)
    let file = squareFile(sq)
    for (let i = right_of_a(left_most); i !== undefined; i = right_of_a(i)) {
        if (for_rank) {
            rank++
        } else {
            file++
        }
        let new_sq = squareFromCoords(file, rank)
        if (new_sq === undefined) {
            break
        }
        res.push({
            a,
            sq: new_sq
        })
    }

    return res
}




function map_args_to_ctx(args: RestrictionParameter[], ctx: File_Ctx[]) {

    return args.flatMap(param => {

        if (is_file2_restriction(param)) {

            let a = ctx.filter(_ => _.a === param.a) ?? in_between_ctx(ctx, param.a)

            let h = a.filter(_ => _.a === param.h) ?? in_between_ctx(a, param.h)

            return h
        }
        if (is_rank_restriction(param)) {
            return ctx.filter(_ => _.a === param.a) ?? in_between_ctx(ctx, param.a, true)
        }
        if (is_file_restriction(param)) {
            return ctx.filter(_ => _.a === param.a) ?? in_between_ctx(ctx, param.a)
        }
        throw 'Unreachable'
    })
}

function satisfy_restrictions(pf: PositionWithFeatures, ctx: File_Ctx[], restrictions: ActionRestriction[]): File_Ctx[] | undefined {
    let res: File_Ctx[] = []

    const sq_file_restriction = ({a}: FileRestriction) => (ctx.filter(_ => _.a === a) ?? in_between_ctx(ctx, a)).map(_ => _.sq)

    for (let restriction of restrictions) {
        if (is_role_restriction(restriction)) { 
            if (sq_file_restriction(restriction.on).find(_ => _ === pf.features.turn_king) !== undefined) {
                res.push({
                    a: restriction.on.a,
                    sq: pf.features.turn_king
                })
            }
        }

        if (is_to_restriction(restriction)) { 
            if (sq_file_restriction(restriction.to).find(_ => _ === pf.move_ctx.move.to) !== undefined) {
                res.push({
                    a: restriction.to.a,
                    sq: pf.move_ctx.move.to
                })
            }
        }

        if (is_hits_restriction(restriction)) { 
        }

        if (is_on_restriction(restriction)) { 
        }

    }

    return res
}

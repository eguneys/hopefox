import { fen_pos, pos_moves } from "../hopefox";
import { FEN } from "../mor3_hope1";
import { SquareSet } from "../squareSet";
import { Role, FileName, FILE_NAMES, Square, Move } from "../types";
import { squareFile, squareFromCoords, squareRank } from "../util";
import { play_and_sans } from "./features";
import { Position, PositionWithFeatures, apply_features, init_features, find_more_features, move_san, move_sans, MoveContext } from "./more_features";
import { Min_max_sort } from "./node_tree";
import { ActionRestriction, FileRestriction, HitsRestriction, is_file2_restriction, is_file_restriction, is_hits_restriction, is_on_restriction, is_rank_restriction, is_role_restriction, is_to_restriction, RestrictionParameter, ruleset_split, Split } from "./split_ruleset";

const initial_context_a_h: File_Ctx[] = []

for (let sq of SquareSet.full()) {
    initial_context_a_h.push({
        a: "a",
        sq
    })
    initial_context_a_h.push({
        a: "h",
        sq
    })
}


export type File_Ctx = {
    a: FileName
    sq: Square
}

export type SplitWithFeatureAndContext = {
    split: Split
    ctx: File_Ctx[]
    feature: PositionWithFeatures
}

let i = 0
function split_features(pos: Position, ruleset: Split[], app: SplitWithFeatureAndContext) {
    let file_ctx = satisfy_restrictions(app.feature, app.ctx, app.split.restrictions)

    if (!file_ctx) {
        return []
    }

    let next_features = apply_features(pos, app.feature)
    let res: SplitWithFeatureAndContext[] = []
    for (let transition of app.split.transitions) {
        let split = ruleset.find(_ => _.definition.name === transition.name)!
        let ctx = map_args_to_ctx(transition.args, file_ctx)

        res.push(...next_features.map(feature => ({ split, ctx, feature })))
    }
    return res
}

export function moving_features(fen: FEN, text: string) {

    let ruleset = ruleset_split(text)

    let pos = fen_pos(fen)
    let moves = pos_moves(pos)
    let features = moves.map(move => init_features(pos, move))

    let depth = -1

    let apps: SplitWithFeatureAndContext[] = []


    for (let feature of features) {
        for (let split of ruleset) {
            apps.push({ feature, split, ctx: initial_context_a_h })
        }
    }

    let dead_apps = []

    while (depth++ < 8 && apps.length > 0) {
        let new_apps = []
        for (let app of apps) {
            let apps = split_features(pos, ruleset, app)
            if (apps.length === 0) {
                dead_apps.push(app)
            }
            new_apps.push(...apps)
        }
        apps = new_apps
    }

    let res = dead_apps.map(_ => move_ctx_moves(_.feature.move_ctx))

    return Min_max_sort(pos, res).map(_ => play_and_sans(pos,  _))
}

function move_ctx_moves(move_ctx: MoveContext): Move[] {
    return [...move_ctx.history, move_ctx.move]
}

const left_of_a = (a: FileName) => FILE_NAMES[FILE_NAMES.indexOf(a) - 1]
const right_of_a = (a: FileName) => FILE_NAMES[FILE_NAMES.indexOf(a) + 1]

const in_between_ctx = (ctx: File_Ctx[], a: FileName, for_rank = false) => {

    let exists = ctx.filter(_ => _.a === a)
    if (exists.length > 0) {
        return exists
    }

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

            let h = ctx.filter(_ => _.a === param.h) ?? in_between_ctx(ctx, param.h)

            return [...a, ...h]
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

    const sq_file_restriction = ({a}: FileRestriction) => in_between_ctx(ctx, a).map(_ => _.sq)

    let is_after_move = false
    for (let restriction of restrictions) {
        if (is_role_restriction(restriction)) { 
            if (sq_file_restriction(restriction.on).find(_ => _ === pf.features.turn_king) !== undefined) {
                res.push({
                    a: restriction.on.a,
                    sq: pf.features.turn_king
                })
            } else {
                return undefined
            }
        } else if (is_to_restriction(restriction)) { 
            if (sq_file_restriction(restriction.to).find(_ => _ === pf.move_ctx.move.to) !== undefined) {
                res.push({
                    a: restriction.to.a,
                    sq: pf.move_ctx.move.to
                })
            } else {
                return undefined
            }

            is_after_move = true
        } else if (is_hits_restriction(restriction)) { 
        } else if (is_on_restriction(restriction)) { 
            let sq = sq_file_restriction(restriction.on).find(_ => pf.features.opposite_pieces.has(_))

            if (sq !== undefined) {
                res.push({
                    a: restriction.on.a,
                    sq
                })
            } else {
                return undefined
            }
        }

    }

    return res
}

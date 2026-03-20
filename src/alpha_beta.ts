import { alphaBeta, GameState} from './deep_alpha'
import { Chess } from './distill/chess';
import { BISHOP, make_move_from_to, move_c_to_Move, MoveC, piece_c_color_of, piece_c_type_of, PieceTypeC, PositionC, PositionManager } from "./distill/hopefox_c";
import { Square } from './distill/types';
import { PositionMaterializer, WorldId } from './pos_materializer';

export type AlphaStateContext = {
    bishop_forks?: { from: Square, to: Square, w: WorldId }[] 
}

export type AlphaStateHooks = {
    evaluate(ctx: AlphaStateContext, mz: PositionMaterializer): number
    is_terminal(ctx: AlphaStateContext, mz: PositionMaterializer): boolean
    list_moves(ctx: AlphaStateContext, mz: PositionMaterializer): WorldId[]
    summarize(ctx: AlphaStateContext, mz: PositionMaterializer): any
}



export class ChessAlphaState implements GameState<WorldId> {

    static alpha_beta = (m: PositionManager, pos: PositionC, depth: number, hooks: AlphaStateHooks, ctx: AlphaStateContext) => {
        let state = new ChessAlphaState(m, pos, hooks, ctx)
        alphaBeta(state, depth, -Infinity, Infinity, true)
        return state.summary()
    }

    mz: PositionMaterializer
    constructor(readonly m: PositionManager, readonly pos: PositionC, readonly hooks: AlphaStateHooks, readonly ctx: AlphaStateContext) {
        this.mz = new PositionMaterializer(m, pos)
    }

    makeMove(world_id: WorldId): void {
        this.mz.inc_make_world(world_id)
    }
    unmakeMove(world_id: WorldId): void {
        this.mz.inc_unmake_world(world_id)
    }
    evaluate(): number {
        return this.hooks.evaluate(this.ctx, this.mz)
    }
    isGameOver(): boolean {
        return this.hooks.is_terminal(this.ctx, this.mz)
    }
    getPossibleMoves(): WorldId[] {
        return this.hooks.list_moves(this.ctx, this.mz)
    }

    summary() {
        return this.hooks.summarize(this.ctx, this.mz)
    }
}

export function solve(m: PositionManager, pos: PositionC) {
    let { hooks, ctx } = get_hooks()
    return ChessAlphaState.alpha_beta(m, pos, 2, hooks, ctx)
}


export function get_hooks() {

    let hooks: AlphaStateHooks = {
        list_moves: function (ctx: AlphaStateContext, mz: PositionMaterializer): WorldId[] {
            let mz_vv = mz_views(mz)
            let mz_ff = mz_forks(mz_vv)


            let legals = mz.inc_generate_legal_moves()
            let res = []

            let { bishop_fork } = mz_ff

            for (let b_f of bishop_fork) {
                let move = make_move_from_to(b_f.from, b_f.to)

                if (!legals.includes(move)) {
                    continue
                }

                res.push(mz.inc_add_move(move))
                if (!ctx.bishop_forks) {
                    ctx.bishop_forks = [{ from: b_f.from, to: b_f.to, w: mz.incremented_to_world }]
                } else {
                    ctx.bishop_forks.push({ from: b_f.from, to: b_f.to, w: mz.incremented_to_world })
                }
            }

            return res
        },
        evaluate: (ctx: AlphaStateContext, mz: PositionMaterializer) => {
            return 0;
        },
        is_terminal: function (ctx: AlphaStateContext, mz: PositionMaterializer): boolean {
            return false
        },
        summarize(ctx: AlphaStateContext, mz: PositionMaterializer) {
            if (ctx.bishop_forks) {
                let move = make_move_from_to(ctx.bishop_forks[0].from, ctx.bishop_forks[0].to)

                let w2 = mz.add_move(ctx.bishop_forks[0].w, move)

                return [mz.sans(w2)]
            }
            return []
        }
    }

    return { ctx: {}, hooks }
}

type MZ_Forks = {
    bishop_fork: { from: Square, to: Square }[]
}

type AttackSee2 = { from: Square, to: Square, to2: Square }

function mz_forks(mz_views: MZ_Views): MZ_Forks {

    let bishop_fork: { from: Square, to: Square, fork_a: Square, fork_b: Square }[] = []

    let bishop_attacks = new Map<Square, AttackSee2[]>()
    for (let b of mz_views.turn) {
        if (b.role !== BISHOP) continue

        for (let a of mz_views.attack_see2) {
            if (a.from === b.from) {
                let move = make_move_from_to(a.from, a.to)
                if (!bishop_attacks.has(move)) {
                    bishop_attacks.set(move, [a])
                } else {
                    bishop_attacks.get(move)!.push(a)
                }
            }
        }
    }

    for (let [move, a2s] of bishop_attacks) {
        if (a2s.length === 2) {
            if (a2s[0].to2 === a2s[1].to2) {
                continue
            }
            let { from } = move_c_to_Move(move)
            bishop_fork.push({ from, to: a2s[0].to, fork_a: a2s[0].to2, fork_b: a2s[1].to2 })
        }
    }

    return {
        bishop_fork
    }
}


type MZ_Views = {
    turn: { from: Square, role: PieceTypeC }[]
    opponent: { from: Square, role: PieceTypeC }[]
    vacant_see: { from: Square, to: Square }[]
    defend_see: { from: Square, to: Square }[]
    attack_see: { from: Square, to: Square }[]
    vacant_see2: { from: Square, to: Square, to2: Square }[]
    defend_see2: { from: Square, to: Square, to2: Square }[]
    attack_see2: { from: Square, to: Square, to2: Square }[]
}

function mz_views(mz: PositionMaterializer): MZ_Views {

    let vacant_see2: { from: Square, to: Square, to2: Square }[] = []
    let defend_see2: { from: Square, to: Square, to2: Square }[] = []
    let attack_see2: { from: Square, to: Square, to2: Square }[] = []

    let vacant_see: { from: Square, to: Square }[] = []
    let defend_see: { from: Square, to: Square }[] = []
    let attack_see: { from: Square, to: Square }[] = []

    let turn: { from: Square, role: PieceTypeC }[] = []
    let opponent: { from: Square, role: PieceTypeC }[] = []

    let occupied = mz.m.pos_occupied(mz.pos)
    let turn_color = mz.m.pos_turn(mz.pos)

    for (let sq of occupied) {
        let piece = mz.m.get_at(mz.pos, sq)!
        let piece_color = piece_c_color_of(piece)
        let is_turn = piece_color === turn_color
        if (is_turn) {
            turn.push({ from: sq, role: piece_c_type_of(piece) })
        } else {
            opponent.push({ from: sq, role: piece_c_type_of(piece) })
        }


        let aa_occupied = occupied.without(sq)
        let aa = mz.m.pos_attacks(mz.pos, sq)

        for (let a of aa) {
            let piece2 = mz.m.get_at(mz.pos, a)

            let is_vacant = !piece2

            let is_defend = piece2 && piece_c_color_of(piece2) === piece_color

            if (is_vacant) {
                vacant_see.push({ from: sq, to: a })
            } else if (is_defend) {
                defend_see.push({ from: sq, to: a })
            } else {
                attack_see.push({ from: sq, to: a })
            }


            let aa2 = mz.m.attacks(piece, a, aa_occupied)

            for (let a2 of aa2) {
                let piece3 = mz.m.get_at(mz.pos, a2)

                let is_vacant = !piece3

                let is_defend = piece3 && piece_c_color_of(piece3) === piece_color

                if (is_vacant) {
                    vacant_see2.push({ from: sq, to: a, to2: a2 })
                } else if (is_defend) {
                    defend_see2.push({ from: sq, to: a, to2: a2 })
                } else {
                    attack_see2.push({ from: sq, to: a, to2: a2 })
                }



            }
        }

    }

    return {
        turn,
        opponent,
        vacant_see,
        defend_see,
        attack_see,
        vacant_see2,
        defend_see2,
        attack_see2
    }
}
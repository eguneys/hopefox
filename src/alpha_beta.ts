import { alphaBeta, GameState} from './deep_alpha'
import { Chess } from './distill/chess';
import { BISHOP, KING, KNIGHT, make_move_from_to, move_c_to_Move, MoveC, piece_c_color_of, piece_c_type_of, PieceTypeC, PositionC, PositionManager, QUEEN, ROOK } from "./distill/hopefox_c";
import { SquareSet } from './distill/squareSet';
import { Square } from './distill/types';
import { PositionMaterializer, WorldId } from './pos_materializer';

export type AlphaStateContext = {
    bishop_forks_king_and_rook?: { from: Square, to: Square, w: WorldId }[] 
    queen_bishop_mate?: { from: Square, to: Square, w: WorldId }[]
    bishop_fork_king_captures?: { from: Square, to: Square, w: WorldId }[]
    queen_attacks_hanging_knight?: { from: Square, to: Square, w: WorldId }[]
}

export type AlphaStateHooks = {
    evaluate(ctx: AlphaStateContext, mz: PositionMaterializer): number
    is_terminal(ctx: AlphaStateContext, mz: PositionMaterializer): boolean
    list_moves(isMaximizing: boolean, ctx: AlphaStateContext, mz: PositionMaterializer): WorldId[]
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
    getPossibleMoves(isMaximizing: boolean): WorldId[] {
        return this.hooks.list_moves(isMaximizing, this.ctx, this.mz)
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
        list_moves: function (isMaximizing: boolean, ctx: AlphaStateContext, mz: PositionMaterializer): WorldId[] {
            let mz_vv = mz_views(mz)
            let mz_ff = mz_forks(mz_vv)
            let mzt = mz_typed_forks(mz_vv, mz_ff)


            let legals = mz.inc_generate_legal_moves()
            let res = []

            if (ctx.bishop_forks_king_and_rook) {
                for (let b_f of ctx.bishop_forks_king_and_rook) {
                    let to = b_f.to


                    for (let kc of mz_ff.turn_king_capturable) {
                        if (kc.to !== to) {
                            continue
                        }

                        let move = make_move_from_to(kc.from, kc.to)

                        if (!legals.includes(move)) {
                            continue
                        }

                        res.push(mz.inc_add_move(move))
                        if (!ctx.bishop_fork_king_captures) {
                            ctx.bishop_fork_king_captures = [{ from: kc.from, to: kc.to, w: mz.incremented_to_world }]
                        } else {
                            ctx.bishop_fork_king_captures.push({ from: kc.from, to: kc.to, w: mz.incremented_to_world })
                        }


                    }

                }
            }


            let { bishop_forks_king_and_rook } = mzt

            for (let b_f of bishop_forks_king_and_rook) {
                let move = make_move_from_to(b_f.from, b_f.to)

                if (!legals.includes(move)) {
                    continue
                }

                res.push(mz.inc_add_move(move))
                if (!ctx.bishop_forks_king_and_rook) {
                    ctx.bishop_forks_king_and_rook = [{ from: b_f.from, to: b_f.to, w: mz.incremented_to_world }]
                } else {
                    ctx.bishop_forks_king_and_rook.push({ from: b_f.from, to: b_f.to, w: mz.incremented_to_world })
                }
            }

            let { queen_bishop_mate } = mzt

            for (let q_b of queen_bishop_mate) {
                let move = make_move_from_to(q_b.queen, q_b.to)

                if (!legals.includes(move)) {
                    continue
                }

                res.push(mz.inc_add_move(move))
                if (!ctx.queen_bishop_mate) {
                    ctx.queen_bishop_mate = [{ from: q_b.queen, to: q_b.to, w: mz.incremented_to_world }]
                } else {
                    ctx.queen_bishop_mate.push({ from: q_b.queen, to: q_b.to, w: mz.incremented_to_world })
                }
            }


            let { queen_attacks_hanging_knight } = mzt

            for (let q_a of queen_attacks_hanging_knight) {
                let move = make_move_from_to(q_a.from, q_a.to)

                if (!legals.includes(move)) {
                    continue
                }

                res.push(mz.inc_add_move(move))

                if (!ctx.queen_attacks_hanging_knight) {
                    ctx.queen_attacks_hanging_knight = [{ from: q_a.from, to: q_a.to, w: mz.incremented_to_world }]
                } else {
                    ctx.queen_attacks_hanging_knight.push({ from: q_a.from, to: q_a.to, w: mz.incremented_to_world })
                }
            }

            return res
        },
        evaluate: (ctx: AlphaStateContext, mz: PositionMaterializer) => {


            if (ctx.queen_bishop_mate) {
                for (let m of ctx.queen_bishop_mate) {
                    let w = mz.add_move(m.w, make_move_from_to(m.from, m.to))
                    if (w === mz.incremented_to_world) {
                        return 1000
                    }
                }
            }

            if (ctx.bishop_fork_king_captures) {
                for (let c of ctx.bishop_fork_king_captures) {
                    let w = mz.add_move(c.w, make_move_from_to(c.from, c.to))
                    if (w === mz.incremented_to_world) {
                        return -5
                    }
                }
            }

            return 0
        },
        is_terminal: function (ctx: AlphaStateContext, mz: PositionMaterializer): boolean {
            let is_mate = ctx.queen_bishop_mate !== undefined

            if (is_mate) {
                return true
            }

            return false
        },
        summarize(ctx: AlphaStateContext, mz: PositionMaterializer) {
            if (ctx.queen_bishop_mate) {
                let move = make_move_from_to(ctx.queen_bishop_mate[0].from, ctx.queen_bishop_mate[0].to)

                let w2 = mz.add_move(ctx.queen_bishop_mate[0].w, move)

                return [mz.sans(w2)]
            }
            if (ctx.bishop_fork_king_captures) {
                let move = make_move_from_to(ctx.bishop_fork_king_captures[0].from, ctx.bishop_fork_king_captures[0].to)

                let w2 = mz.add_move(ctx.bishop_fork_king_captures[0].w, move)

                return [mz.sans(w2)]
            }
            if (ctx.bishop_forks_king_and_rook) {
                let move = make_move_from_to(ctx.bishop_forks_king_and_rook[0].from, ctx.bishop_forks_king_and_rook[0].to)

                let w2 = mz.add_move(ctx.bishop_forks_king_and_rook[0].w, move)

                return [mz.sans(w2)]
            }
            return []
        }
    }

    return { ctx: {}, hooks }
}


type MZ_Typed_Forks = {
    bishop_forks_king_and_rook: { from: Square, to: Square, king: Square, rook: Square }[]
    queen_see_king_with_bishop: { queen: Square, king_to: Square, bishop: Square }[]
    queen_bishop_mate: { queen: Square, to: Square, king: Square, bishop: Square }[]
    queen_attacks_hanging_knight: { from: Square, to: Square, knight: Square }[]
}

function mz_typed_forks(mz_views: MZ_Views, mz_forks: MZ_Forks): MZ_Typed_Forks {
    
    let bishop_forks_king_and_rook: { from: Square, to: Square, king: Square, rook: Square }[] = []
    let queen_see_king_with_bishop: { queen: Square, king_to: Square, bishop: Square }[] = []

    let queen_bishop_mate: { queen: Square, to: Square, king: Square, bishop: Square }[] = []


    for (let a of mz_forks.attack_double_from_see) {
        for (let k of mz_forks.opponent_king_see) {
            if (k.to !== a.to) {
                continue
            }
            for (let q of mz_forks.turn_queens) {
                if (q.from !== a.from_a) {
                    continue
                }
                for (let b of mz_forks.turn_bishops) {
                    if (b.from !== a.from_b) {
                        continue
                    }

                    queen_see_king_with_bishop.push({ queen: q.from, king_to: a.to, bishop: b.from })
                }
            }
        }
    }


    for (let q of queen_see_king_with_bishop) {
        for (let b of mz_forks.opponent_non_king_uncapturable) {
            if (b.to !== q.king_to) {
                continue
            }

            queen_bishop_mate.push({ queen: q.queen, to: q.king_to, king: mz_forks.opponent_king.from, bishop: q.bishop })
        }
    }


    for (let f of mz_forks.fork) {
        for (let b of mz_forks.turn_bishops) {
            if (b.from !== f.from) {
                continue
            }

            let king = mz_forks.opponent_king

            if (king.from !== f.fork_a) {
                continue
            }


            for (let rook of mz_forks.opponent_rooks) {
                if (rook.from !== f.fork_b) {
                    continue
                }

                bishop_forks_king_and_rook.push({ from: f.from, to: f.to, king: king.from, rook: rook.from })
            }
        }
    }

    let turn_queen_attack_see2: { from: Square, to: Square, to2: Square }[] = []

    for (let q of mz_forks.turn_queens) {
        for (let a2 of mz_views.attack_see2) {
            if (a2.from === q.from) {
                turn_queen_attack_see2.push(a2)
            }
        }
    }

    let opponent_hanging_knight: { from: Square }[] = []

    for (let k of mz_forks.opponent_knights) {
        for (let h of mz_forks.hanging) {
            if (k.from === h.from) {
                opponent_hanging_knight.push(h)
            }
        }
    }

    let queen_attacks_hanging_knight: { from: Square, to: Square, knight: Square }[] = []

    for (let h of opponent_hanging_knight) {
        for (let q of turn_queen_attack_see2) {
            if (h.from === q.to2) {
                queen_attacks_hanging_knight.push({ from: q.from, to: q.to, knight: h.from })
            }
        }
    }


    return {
        queen_see_king_with_bishop,
        bishop_forks_king_and_rook,
        queen_bishop_mate,
        queen_attacks_hanging_knight
    }
}



type MZ_Forks = {
    turn_king: { from: Square }
    turn_queens: { from: Square }[]
    turn_bishops: { from: Square }[]
    opponent_knights: { from: Square }[]
    opponent_rooks: { from: Square }[]
    opponent_king: { from: Square }
    opponent_king_see: { to: Square }[]
    opponent_non_king_uncapturable: { to: Square }[]
    turn_king_capturable: { from: Square, to: Square }[]
    fork: { from: Square, to: Square, fork_a: Square, fork_b: Square }[]
    attack_double_from_see: { from_a: Square, from_b: Square, to: Square }[]
    hanging: { from: Square }[]
}

type AttackSee2 = { from: Square, to: Square, to2: Square }

function mz_forks(mz_views: MZ_Views): MZ_Forks {

    let turn_queens: { from: Square }[] = []
    let turn_bishops: { from: Square }[] = []

    let opponent_knights: { from: Square }[] = []
    let opponent_rooks: { from: Square }[] = []
    let opponent_king!: { from: Square }
    let opponent_king_see: { to: Square }[] = []

    let turn_king!: { from: Square }

    let attack_double_from_see: { from_a: Square, from_b: Square, to: Square }[] = []

    let opponent_non_king_uncapturable: { to: Square }[] = []

    let turn_king_capturable: { from: Square, to: Square }[] = []

    let hanging: { from: Square }[] = []

    for (let b of mz_views.turn) {
        if (b.role === BISHOP) {
            turn_bishops.push({ from: b.from })
        } else if (b.role === QUEEN) {
            turn_queens.push({ from: b.from })
        } else if (b.role === KING) {
            turn_king = { from: b.from }
        }
    }

    for (let b of mz_views.opponent) {
        if (b.role === KNIGHT) {
            opponent_knights.push({ from: b.from })
        } else if (b.role === ROOK) {
            opponent_rooks.push({ from: b.from })
        } else if (b.role === KING) {
            opponent_king = { from: b.from }
        }
    }

    for (let a of mz_views.attack_see) {
        if (a.from === opponent_king.from) {
            opponent_king_see.push({ to: a.to })
        }
    }
    for (let a of mz_views.defend_see) {
        if (a.from === opponent_king.from) {
            opponent_king_see.push({ to: a.to })
        }
    }
    for (let a of mz_views.vacant_see) {
        if (a.from === opponent_king.from) {
            opponent_king_see.push({ to: a.to })
        }
    }



    for (let a of mz_views.attack_see) {
        for (let b of mz_views.attack_see) {
            if (a.to === b.to) {
                if (a.from !== b.from) {
                    attack_double_from_see.push({ from_a: a.from, from_b: b.from, to: a.to })
                }
            }
        }
    }

    for (let o of mz_views.attack_see) {
        if (o.from !== turn_king.from) {
            continue
        }

        turn_king_capturable.push({ from: o.from, to: o.to })
    }

    let non_king_opponent_capturable = SquareSet.empty()
    for (let o of mz_views.opponent) {
        if (o.from === opponent_king.from) {
            continue
        }

        for (let a of mz_views.attack_see) {
           if (o.from === a.from) {
                non_king_opponent_capturable = non_king_opponent_capturable.set(a.to, true)
            }
        }
    }

    let non_king_opponent_uncapturable = non_king_opponent_capturable.complement()
    for (let sq of non_king_opponent_uncapturable) {
        opponent_non_king_uncapturable.push({ to: sq })
    }


    let fork: { from: Square, to: Square, fork_a: Square, fork_b: Square }[] = []

    let bishop_attacks = new Map<Square, AttackSee2[]>()
    for (let b of mz_views.turn) {
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
            fork.push({ from, to: a2s[0].to, fork_a: a2s[0].to2, fork_b: a2s[1].to2 })
            fork.push({ from, to: a2s[0].to, fork_a: a2s[1].to2, fork_b: a2s[0].to2 })
        }
    }

    let defended_set = SquareSet.empty()
    for (let a of mz_views.defend_see) {
        defended_set = defended_set.set(a.to, true)
    }
    let hanging_set = defended_set.complement()

    for (let a of hanging_set) {
        hanging.push({ from: a })
    }

    return {
        fork,
        turn_king,
        turn_queens,
        turn_bishops,
        opponent_knights,
        opponent_rooks,
        opponent_king,
        opponent_king_see,
        attack_double_from_see,
        opponent_non_king_uncapturable,
        turn_king_capturable,
        hanging
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
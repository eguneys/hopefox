import { squareSet } from '../distill/debug'
import { BLACK, piece_c_to_piece, WHITE } from '../distill/hopefox_c'
import { go_black, go_white, SquareSet } from '../distill/squareSet'
import { squareRank } from '../distill/util'
import { merge_binding } from './binding_util'
import type { Context } from './types'

export const pawn_push_attacks = (ctx: Context) => (from: string, to: string, attack: string): Map<string, number>[] => {
    let bb = pawn_push_from_to_attacks(ctx)(from, to, attack)

    return bb
}

export const pawn_push_promotes = (ctx: Context) => (from: string, to: string): Map<string, number>[] => {
    let aa = pawn_push_from_to_promotes(ctx)(from, to)

    return aa
}

export const pawn_push_blocks_check = (ctx: Context) => (from: string, to: string, check: string, check_to: string): Map<string, number>[] => {
    let aa = pawn_push_from_to(ctx)(from, to)
    let bb = pawn_push_blocks(ctx)(from, to, check, check_to)


    let res: Map<string, number>[] = []
    for (let a of aa) {
        for (let b of bb) {
            let new_binding = merge_binding(a, b)
            if (new_binding !== undefined) {
                res.push(new_binding)
            }
        }
    }
    return res
}



export const blocks_check = (ctx: Context) => (from: string, to: string, check: string, check_to: string): Map<string, number>[] => {
    let aa = from_to(ctx)(from, to)
    let bb = blocks(ctx)(from, to, check, check_to)


    let res: Map<string, number>[] = []
    for (let a of aa) {
        for (let b of bb) {
            let new_binding = merge_binding(a, b)
            if (new_binding !== undefined) {
                res.push(new_binding)
            }
        }
    }
    return res
}



export const captures_with_check = (ctx: Context) => (from: string, to: string, king: string): Map<string, number>[] => {
    let aa = captures(ctx)(from, to)
    let bb = checks(ctx)(from, to, king)


    let res: Map<string, number>[] = []
    for (let a of aa) {
        for (let b of bb) {
            let new_binding = merge_binding(a, b)
            if (new_binding !== undefined) {
                res.push(new_binding)
            }
        }
    }
    return res
}

export const checks = (ctx: Context) => (from: string, to: string, king: string): Map<string, number>[] => {
    let aa = from_to2(ctx)(from, to, king)
    return aa
}


export const captures_hanging = (ctx: Context) => (from: string, to: string, hanging_a: string): Map<string, number>[] => {
    let aa = captures(ctx)(from, to)
    let bb = hanging(ctx)(to.split('_')[0])

    let res: Map<string, number>[] = []
    for (let a of aa) {
        for (let b of bb) {
            let new_binding = merge_binding(a, b)
            if (new_binding !== undefined) {
                res.push(new_binding)
            }
        }
    }
    return res
}



export const attacks_hanging = (ctx: Context) => (from: string, to: string, hanging_a: string): Map<string, number>[] => {
    let aa = from_to2(ctx)(from, to, hanging_a)
    let bb = hanging(ctx)(hanging_a)

    let res: Map<string, number>[] = []
    for (let a of aa) {
        for (let b of bb) {
            let new_binding = merge_binding(a, b)
            if (new_binding !== undefined) {
                res.push(new_binding)
            }
        }
    }
    return res
}


export const attacks_with_capture = (ctx: Context) => (from: string, to: string, attack_to: string): Map<string, number>[] => {
    let aa = from_to2(ctx)(from, to, attack_to)
    let bb = captures(ctx)(from, to)

    let res: Map<string, number>[] = []
    for (let a of aa) {
        for (let b of bb) {
            let new_binding = merge_binding(a, b)
            if (new_binding !== undefined) {
                res.push(new_binding)
            }
        }
    }
    return res
}



export const attacks_with_discovered_check = (ctx: Context) => (knight: string, knight2: string, queen: string, rook: string, king: string): Map<string, number>[] => {

    let aa = from_to2(ctx)(knight, knight2, queen)
    let bb = discovered_check(ctx)(knight, knight2, rook, king)

    let res: Map<string, number>[] = []
    for (let a of aa) {
        for (let b of bb) {
            let new_binding = merge_binding(a, b)
            if (new_binding !== undefined) {
                res.push(new_binding)
            }
        }
    }
    return res
}

export const discovered_check = (ctx: Context) => (from: string, to: string, check: string, king: string): Map<string, number>[] => {
    let res: Map<string, number>[] = []

    let occupied = ctx.mz.m.pos_occupied(ctx.mz.pos)

    for (let sq of occupied) {
        let piece_c = ctx.mz.m.get_at(ctx.mz.pos, sq)!
        let piece = piece_c_to_piece(piece_c)

        if (!role_match(piece.role, from)) {
            continue
        }

        let aa = ctx.mz.m.attacks(piece_c, sq, occupied)


        for (let a of aa) {

            for (let sq2 of occupied) {
                let piece_c2 = ctx.mz.m.get_at(ctx.mz.pos, sq2)!
                let piece2 = piece_c_to_piece(piece_c2)

                if (!role_match(piece2.role, check)) {
                    continue
                }

                let aa0 = ctx.mz.m.attacks(piece_c2, sq2, occupied)
                let aa = ctx.mz.m.attacks(piece_c2, sq2, occupied.without(sq).with(a))

                let a_discovered = aa.diff(aa0)

                for (let ad of a_discovered) {

                    let piece_c3 = ctx.mz.m.get_at(ctx.mz.pos, ad)!
                    if (piece_c3 === undefined) {
                        continue
                    }
                    let piece3 = piece_c_to_piece(piece_c3)

                    if (!role_match(piece3.role, king)) {
                        continue
                    }



                    res.push(new Map([[from, sq], [to, a], [check, sq2], [king, ad]]))
                }
            }
        }
    }


    return res
}

export const evades = (ctx: Context) => (from: string, to: string): Map<string, number>[] => {
    return from_to(ctx)(from, to)
}

export const king_evades = (ctx: Context) => (from: string, to: string): Map<string, number>[] => {
    return from_safe_to(ctx)(from, to)
}

export const has_fork_with_capture = (ctx: Context) => (from: string, to: string, fork_a: string, fork_b: string): Map<string, number>[] => {
    let aa = has_fork(ctx)(from, to, fork_a, fork_b)
    let bb = captures(ctx)(from, to)


    let res: Map<string, number>[] = []
    for (let a of aa) {
        for (let b of bb) {
            let new_binding = merge_binding(a, b)
            if (new_binding !== undefined) {
                res.push(new_binding)
            }
        }
    }
    return res
}

export const has_fork = (ctx: Context) => (from: string, to: string, fork_a: string, fork_b: string): Map<string, number>[] => {
    let aa = from_to2(ctx)(from, to, fork_a)
    let bb = from_to2(ctx)(from, to, fork_b)

    let res: Map<string, number>[] = []
    for (let a of aa) {
        for (let b of bb) {
            let new_binding = merge_binding(a, b)
            if (new_binding !== undefined) {
                res.push(new_binding)
            }
        }
    }
    return res
}


export const captures = (ctx: Context) => (from: string, to: string): Map<string, number>[] => {
    let res: Map<string, number>[] = []

    let occupied = ctx.mz.m.pos_occupied(ctx.mz.pos)

    for (let sq of occupied) {
        let piece_c = ctx.mz.m.get_at(ctx.mz.pos, sq)!
        let piece = piece_c_to_piece(piece_c)

        if (!captures_from_match(piece.role, from)) {
            continue
        }

        let aa = ctx.mz.m.attacks(piece_c, sq, occupied)

        for (let a of aa) {
            let piece2_c = ctx.mz.m.get_at(ctx.mz.pos, a)

            if (piece2_c === undefined) {
                continue
            }

            let piece2 = piece_c_to_piece(piece2_c)

            if (!captures_to_match(piece2.role, to)) {
                continue
            }

            res.push(new Map([[from, sq], [to, a]]))
        }

    }
    return res
}

export const from_safe_to = (ctx: Context) => (from: string, to: string): Map<string, number>[] => {
    let res: Map<string, number>[] = []

    let occupied = ctx.mz.m.pos_occupied(ctx.mz.pos)


    for (let sq of occupied) {
        let piece_c = ctx.mz.m.get_at(ctx.mz.pos, sq)!
        let piece = piece_c_to_piece(piece_c)

        let a_friend = ctx.mz.m.get_pieces_color_bb(ctx.mz.pos, piece.color === 'white' ? WHITE : BLACK)

        if (!role_match(piece.role, from)) {
            continue
        }

        let unsafe = SquareSet.empty()
        for (let a of ctx.mz.m.get_pieces_color_bb(ctx.mz.pos, piece.color === 'white' ? BLACK : WHITE)) {
            let a_piece = ctx.mz.m.get_at(ctx.mz.pos, a)!
            unsafe = unsafe.union(ctx.mz.m.attacks(a_piece, a, occupied.without(sq)))
        }

        let aa = ctx.mz.m.attacks(piece_c, sq, occupied)

        let aa_safe = aa.diff(unsafe).diff(a_friend)

        let res_xx = []

        for (let a of aa_safe) {
            res_xx.push(new Map([[from, sq], [to, a]]))
        }

        if (to === 'null') {
            if (res_xx.length === 0) {
                res_xx.push(new Map([[from, sq]]))
            } else {
                continue
            }
        }

        res.push(...res_xx)
    }

    return res
}


export const pawn_push_from_to = (ctx: Context) => (from: string, to: string): Map<string, number>[] => {
    let res: Map<string, number>[] = []

    let occupied = ctx.mz.m.pos_occupied(ctx.mz.pos)

    for (let sq of occupied) {
        let piece_c = ctx.mz.m.get_at(ctx.mz.pos, sq)!
        let piece = piece_c_to_piece(piece_c)

        if (!role_match(piece.role, from)) {
            continue
        }

        let aa = ctx.mz.m.pawn_pushes(ctx.mz.pos, sq)

        let res_xx = []

        for (let a of aa) {
            res_xx.push(new Map([[from, sq], [to, a]]))
        }

        if (to === 'null') {
            if (res_xx.length === 0) {
                res_xx.push(new Map([[from, sq]]))
            } else {
                continue
            }
        }

        res.push(...res_xx)
    }

    return res
}




export const from_to = (ctx: Context) => (from: string, to: string): Map<string, number>[] => {
    let res: Map<string, number>[] = []

    let occupied = ctx.mz.m.pos_occupied(ctx.mz.pos)

    for (let sq of occupied) {
        let piece_c = ctx.mz.m.get_at(ctx.mz.pos, sq)!
        let piece = piece_c_to_piece(piece_c)

        if (!role_match(piece.role, from)) {
            continue
        }

        let aa = ctx.mz.m.attacks(piece_c, sq, occupied)

        let res_xx = []

        for (let a of aa) {
            res_xx.push(new Map([[from, sq], [to, a]]))
        }

        if (to === 'null') {
            if (res_xx.length === 0) {
                res_xx.push(new Map([[from, sq]]))
            } else {
                continue
            }
        }

        res.push(...res_xx)
    }

    return res
}

export const from_to2_through = (ctx: Context) => (from: string, to: string, to2: string, to2_through: string): Map<string, number>[] => {
    let res: Map<string, number>[] = []

    let occupied = ctx.mz.m.pos_occupied(ctx.mz.pos)

    for (let sq of occupied) {
        let piece_c = ctx.mz.m.get_at(ctx.mz.pos, sq)!
        let piece = piece_c_to_piece(piece_c)

        if (!role_match(piece.role, from)) {
            continue
        }

        let aa = ctx.mz.m.attacks(piece_c, sq, occupied)

        for (let a of aa) {
            let aa2 = ctx.mz.m.attacks(piece_c, a, occupied.without(sq))

            for (let a2 of aa2) {
                let piece2_c = ctx.mz.m.get_at(ctx.mz.pos, a2)

                if (piece2_c === undefined) {
                    continue
                }

                let piece2 = piece_c_to_piece(piece2_c)

                if (!role_match(piece2.role, to2)) {
                    continue
                }

                let aa3 = ctx.mz.m.attacks(piece_c, a, occupied.without(sq).without(a2))

                let aa2_through = aa3.diff(aa2)

                for (let a2_through of aa2_through) {
                    let piece3_c = ctx.mz.m.get_at(ctx.mz.pos, a2_through)

                    if (piece3_c === undefined) {
                        continue
                    }

                    let piece3 = piece_c_to_piece(piece3_c)

                    if (!role_match(piece3.role, to2_through)) {
                        continue
                    }



                    res.push(new Map([[from, sq], [to, a], [to2, a2], [to2_through, a2_through]]))
                }
            }
        }
    }

    return res
}



export const from_to2 = (ctx: Context) => (from: string, to: string, to2: string): Map<string, number>[] => {
    let res: Map<string, number>[] = []

    let occupied = ctx.mz.m.pos_occupied(ctx.mz.pos)

    for (let sq of occupied) {
        let piece_c = ctx.mz.m.get_at(ctx.mz.pos, sq)!
        let piece = piece_c_to_piece(piece_c)

        if (!role_match(piece.role, from)) {
            continue
        }

        let aa = ctx.mz.m.attacks(piece_c, sq, occupied)

        for (let a of aa) {
            let aa2 = ctx.mz.m.attacks(piece_c, a, occupied.without(sq))

            for (let a2 of aa2) {
                let piece2_c = ctx.mz.m.get_at(ctx.mz.pos, a2)

                if (piece2_c === undefined) {
                    continue
                }

                let piece2 = piece_c_to_piece(piece2_c)

                if (!role_match(piece2.role, to2)) {
                    continue
                }

                res.push(new Map([[from, sq], [to, a], [to2, a2]]))
            }
        }
    }

    return res
}

function captures_to_match(to: string, b: string) {
    to = to.toLowerCase()
    b = b.toLowerCase()

    let m = b.match(/([^\d]*)\d*_([^\d]*)\d*/)
    if (m) {
        return m[1] === to
    } else {
        return false
    }
}



function captures_from_match(from: string, b: string) {
    from = from.toLowerCase()
    b = b.toLowerCase()

    let m = b.match(/([^\d]*)\d*/)
    if (m) {
        return m[1] === from
    } else {
        return false
    }
}

function role_match(a: string, b: string) {
    a = a.toLowerCase()
    b = b.toLowerCase()
    if (a === b) {
        return true
    }

    let m = b.match(/([^\d]*)\d*/) 
    
    if (m) {
        return m[1] === a
    }
}

export const hanging = (ctx: Context) => (from: string): Map<string, number>[] => {
    let res: Map<string, number>[] = []


    let occupied = ctx.mz.m.pos_occupied(ctx.mz.pos)

    outer: for (let sq of occupied) {
        let piece_c = ctx.mz.m.get_at(ctx.mz.pos, sq)!
        let piece = piece_c_to_piece(piece_c)

        if (!role_match(piece.role, from)) {
            continue
        }


        let dd = ctx.mz.m.get_pieces_color_bb(ctx.mz.pos, piece.color === 'white' ? WHITE : BLACK)

        for (let d of dd) {
            if (ctx.mz.m.pos_attacks(ctx.mz.pos, d).has(sq)) {
                continue outer
            }
        }

        res.push(new Map([[from, sq]]))

    }


    return res
}

export const blocks = (ctx: Context) => (from: string, to: string, check: string, check_to: string): Map<string, number>[] => {
    let res: Map<string, number>[] = []


    let occupied = ctx.mz.m.pos_occupied(ctx.mz.pos)

    for (let sq of occupied) {
        let piece_c = ctx.mz.m.get_at(ctx.mz.pos, sq)!
        let piece = piece_c_to_piece(piece_c)

        let aa = ctx.mz.m.pos_attacks(ctx.mz.pos, sq)

        for (let a of aa) {

            for (let c_sq of occupied) {

                let piece2_c = ctx.mz.m.get_at(ctx.mz.pos, c_sq)!
                let piece2 = piece_c_to_piece(piece_c)

                let aa_check = ctx.mz.m.attacks(piece2_c, c_sq, occupied.without(sq).with(a))
                let aa_check_off = ctx.mz.m.attacks(piece2_c, c_sq, occupied)

                let aa_block = aa_check_off.diff(aa_check)

                for (let ab of aa_block) {
                    res.push(new Map([[from, sq], [to, a], [check, c_sq], [check_to, ab]]))
                }
            }

        }
    }


    return res
}


export const pawn_push_blocks = (ctx: Context) => (from: string, to: string, check: string, check_to: string): Map<string, number>[] => {
    let res: Map<string, number>[] = []


    let occupied = ctx.mz.m.pos_occupied(ctx.mz.pos)

    for (let sq of occupied) {
        let piece_c = ctx.mz.m.get_at(ctx.mz.pos, sq)!
        let piece = piece_c_to_piece(piece_c)

        let aa = ctx.mz.m.pawn_pushes(ctx.mz.pos, sq)

        for (let a of aa) {

            for (let c_sq of occupied) {

                let piece2_c = ctx.mz.m.get_at(ctx.mz.pos, c_sq)!
                let piece2 = piece_c_to_piece(piece_c)

                let aa_check = ctx.mz.m.attacks(piece2_c, c_sq, occupied.without(sq).with(a))
                let aa_check_off = ctx.mz.m.attacks(piece2_c, c_sq, occupied)

                let aa_block = aa_check_off.diff(aa_check)

                for (let ab of aa_block) {
                    res.push(new Map([[from, sq], [to, a], [check, c_sq], [check_to, ab]]))
                }
            }

        }
    }

    return res
}



export const pawn_push_from_to_promotes = (ctx: Context) => (from: string, to: string): Map<string, number>[] => {
    let res: Map<string, number>[] = []


    let occupied = ctx.mz.m.pos_occupied(ctx.mz.pos)

    for (let sq of occupied) {
        let piece_c = ctx.mz.m.get_at(ctx.mz.pos, sq)!
        let piece = piece_c_to_piece(piece_c)

        if (!role_match(piece.role, from)) {
            continue
        }

        let P_Rank = piece.color === 'white' ? 8 : 0;

        let p = piece.color === 'white' ? go_black(sq)! : go_white(sq)!


        if (squareRank(p) === P_Rank) {
            res.push(new Map([[from, sq], [to, p]]))
        }

    }
    return res
}


export const pawn_push_from_to_attacks = (ctx: Context) => (from: string, to: string, attack: string): Map<string, number>[] => {
    let res: Map<string, number>[] = []


    let occupied = ctx.mz.m.pos_occupied(ctx.mz.pos)

    for (let sq of occupied) {
        let piece_c = ctx.mz.m.get_at(ctx.mz.pos, sq)!
        let piece = piece_c_to_piece(piece_c)

        if (!role_match(piece.role, from)) {
            continue
        }

        let pp = ctx.mz.m.pawn_pushes(ctx.mz.pos, sq)

        for (let p of pp) {
            let aa = ctx.mz.m.attacks(piece_c, p, occupied)

            for (let a of aa) {
                let piece2_c = ctx.mz.m.get_at(ctx.mz.pos, a)!

                if (piece2_c === undefined) {
                    continue
                }

                let piece2 = piece_c_to_piece(piece2_c)

                if (!role_match(piece2.role, attack)) {
                    continue
                }

                res.push(new Map([[from, sq], [to, p], [attack, a]]))

            }
        }
    }
    return res
}


export const defends_hanging = (ctx: Context) => (from: string, to: string, defends: string): Map<string, number>[] => {
    let aa = from_to2(ctx)(from, to, defends)
    let bb = hanging(ctx)(defends)

    let res: Map<string, number>[] = []
    for (let a of aa) {
        for (let b of bb) {
            let new_binding = merge_binding(a, b)
            if (new_binding !== undefined) {
                res.push(new_binding)
            }
        }
    }
    return res
}


export const skewers = (ctx: Context) => (from: string, to: string, skewer_a: string, skewer_b: string): Map<string, number>[] => {
    let aa = from_to2_through(ctx)(from, to, skewer_a, skewer_b)
    return aa
}



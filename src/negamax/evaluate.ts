import { Node, Context, FeatureDelta, MoveDelta } from './types'



export function evaluate(node: Node) {
    return 0
}

export function generate_moves(node: Node, ctx: Context, side: boolean): MoveDelta[] {
    `
    if has_fork(bishop, bishop_to, rook, king) then
       if king_evades(king, king_to) then
          if captures(bishop_to, rook) then
              has_exchange_up
    `;

    `
    if has_fork_with_capture(bishop, queen, rook,  king) then
       if king_evades(king, null) then
          checkmate
    `;

    `
    if has_fork_with_capture(queen, pawn, rook, king) then
       if king_evades(king, null) then
          checkmate
    `;


    `
    if blocks_check(knight, rook, king) then
       if captures_with_check(rook, knight) then
          if captures(pawn, rook) then
             if checks(queen, queen_to, king) then
                if captures(queen, queen_to) then
                   if has_fork(bishop, bishop_to, queen_to, king) then
                      if captures(queen_to, bishop_to) then
                         material_gain
    `;
    return []
}
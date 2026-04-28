import { PositionC, PositionManager } from "../distill/hopefox_c";
import { History, Columnar } from "./gofer";
import { AtomicActionId, AtomicFilterId, PieceSymbol } from "./types";

export type AtomicHandler = (
    fields: number[],
    start_row_index: number,
    symbol_per_column: PieceSymbol[],
    m: PositionManager,
    pos: PositionC,
    history_per_row: History[],
    table: Columnar) => void


export const atomic_action_handlers: Record<AtomicActionId, AtomicHandler> = {
    [AtomicActionId.Move]: atomic_action_move,
    [AtomicActionId.Capture]: atomic_action_move,
    [AtomicActionId.Promote]: atomic_action_move,
    [AtomicActionId.Push]: atomic_action_move,

}

export const atomic_filter_handlers: Record<AtomicFilterId, AtomicHandler> = {
    [AtomicFilterId.Attack]: atomic_filter_attack,
    [AtomicFilterId.Attack_Through]: atomic_filter_attack_through,
}

function atomic_action_move(
    fields: number[],
    start_row_index: number,
    symbol_per_column: PieceSymbol[],
    m: PositionManager,
    pos: PositionC,
    history_per_row: History[],
    table: Columnar) {

}


function atomic_filter_attack(
    fields: number[],
    start_row_index: number,
    symbol_per_column: PieceSymbol[],
    m: PositionManager,
    pos: PositionC,
    history_per_row: History[],
    table: Columnar) {

}


function atomic_filter_attack_through(
    fields: number[],
    start_row_index: number,
    symbol_per_column: PieceSymbol[],
    m: PositionManager,
    pos: PositionC,
    history_per_row: History[],
    table: Columnar) {

}


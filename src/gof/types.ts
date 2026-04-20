import { PieceTypeC } from "../distill/hopefox_c";

`
if has_fork(bishop, bishop2, rook, king) then
   if pawn_push_blocks_check(pawn, pawn2, bishop2, king) then
      if captures(bishop2, rook_bishop3) then

def has_fork(From, To, ForkA, ForkB)
  move(From, To) then
  attack(To, ForkA) and
  attack(To, ForkB)

def captures(From, Captured_To)
  capture(From, To, Captured)

def pawn_push_blocks_check(From, To, AttackFrom, AttackTo)
  attack(AttackFrom, AttackTo) and
  push(From, To) then
  attack_through(AttackFrom, AttackTo, To)


def king_evades(From, To)
  move(From, To) then
  attack(null, To)
`;

export type Gof = FreeCompositeRing[]

export type FreeCompositeRing = FreeCompositeActionCall[]

type FreeCompositeActionCall = {
    id: CompositeActionId
    params: PieceSymbol[]
}

export type CompositeActionId = number

export type CompositeActionDefinition = {
    id: CompositeActionId
    params: ActionParameters
    body: (AtomicAction | CompositeAction)[]
    body_binders: ActionBinder[]
};

export type CompositeAction = {
    id: CompositeActionId
    params: ActionParameters
}

export type AtomicAction = {
    id: AtomicActionId
    params: ActionParameters
}

export type ActionParameters = PieceSymbolVariable[]

export enum AtomicActionId {
    Move,
    Push,
    Capture,
    Attack,
    Attack_Through,
};

export enum ActionBinder {
    Then,
    And,
    Or
};

type PieceSymbolVariableIdNull = 0
export const PieceSymbolVariableIdNull = 0

type PieceSymbolVariableIdUndefined = -1
export const PieceSymbolVariableIdUndefined = -1

type VariableId = number

export type PieceSymbolVariable = {
    id: VariableId
    id_to: VariableId
};

type PieceSymbolIdNull = 0
export const PieceSymbolIdNull = 0

type PieceSymbolIdUndefined = -1
export const PieceSymbolIdUndefined = -1



type SymbolId = number

export type PieceSymbol = {
    piece: PieceTypeC
    id: SymbolId
    piece_to: PieceTypeC
    id_to: SymbolId
};
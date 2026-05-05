import { Role, Square } from "../distill/types"

export type PieceSymbol = {
    piece?: Role
    square?: Square
    id: string
    global_id?: string
}


export type Piece2Symbol = {
    a: PieceSymbol
    b: PieceSymbol
}

export type PSymbol = PieceSymbol | Piece2Symbol

export function is_psymbol2(symbol: PSymbol): symbol is Piece2Symbol {
    return (symbol as Piece2Symbol).a !== undefined
}

export function symbol_equals(a: PieceSymbol, b: PieceSymbol) {
    return a.piece === b.piece && a.id === b.id && a.square === b.square && a.global_id === b.global_id
}


export type VariableSymbol = {
    id: string
}

export type Variable2Symbol = {
    id: string
    id2: string
}

export type VSymbol = VariableSymbol | Variable2Symbol

export function is_vsymbol2(symbol: VSymbol): symbol is Variable2Symbol {
    return (symbol as Variable2Symbol).id2 !== undefined
}

export function vsymbol_equals(a: VariableSymbol, b: VariableSymbol) {
    return a.id === b.id
}


export enum AtomicActionId {
    Move,
    Push,
    Capture,
    Promote,
    Safe_Move,
}

export enum AtomicFilterId {
    Attack = 80,
    Attack_Through,
    Defend,
    No_King_Evades,
    No_Captures,
    No_Blocks_Check,
    No_Push_Blocks_Check,
    No_Defense,
    No_Attack,
    About_To_Promote,
    About_To_Push,
    Same,
    Opposite,
    BackrankWall
}

export function is_atomic_action(a: AtomicCall): a is AtomicActionCall {
    return a.id in AtomicActionId
}

export type AtomicActionBodyDefinition = {
    id: AtomicActionId
    params: VSymbol[]
}

export type AtomicFilterBodyDefinition = {
    id: AtomicFilterId
    params: VSymbol[]
}

export type CompositeActionId = string

export type CompositeActionHead = {
    id: CompositeActionId
    params: VSymbol[]
}

export type CompositeActionBody = (AtomicActionBodyDefinition | AtomicFilterBodyDefinition)[]

export type CompositeActionDefinition = {
    head: CompositeActionHead
    body: CompositeActionBody
}


export type CompositeActionCall = {
    id: CompositeActionId
    params: PSymbol[]
}


export type CompositeRing = CompositeActionCall[]


export type AtomicActionCall = {
    id: AtomicActionId
    fields: number[]
}

export type AtomicFilterCall = {
    id: AtomicFilterId
    fields: number[]
}

export type AtomicCall = AtomicActionCall | AtomicFilterCall

export enum Quantification {
    IfThen,
    ForAll
}

export type CompositeActionCallWithQuantification = {
    quantification: Quantification
    call: CompositeActionCall[]
}

export type CompositeNestedGraphNode = {
    data: CompositeActionCallWithQuantification
    children: CompositeNestedGraphNode[]
}

export type CompositeNestedGraphRoot = CompositeNestedGraphNode[]



export type Visual_CompositeNestedGraphNode = {
    data: Visual_CompositeActionCallWithQuantification
    children: Visual_CompositeNestedGraphNode[]
}
export type Visual_CompositeNestedGraphRoot = Visual_CompositeNestedGraphNode[]

export type Visual_CompositeActionCallWithQuantification = {
    quantification: Quantification
    call: Visual_CompositeActionCall[]
}

export type SAN = string
export type Visual_CompositeActionCall = {
    error?: string
    line_no: number
    name: string
    params: PSymbol[]
    witness: SAN[][]
}
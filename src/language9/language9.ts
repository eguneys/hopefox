import { get } from "http"
import { PositionMaterializer } from "../language6/engine6"
import { Position } from "../distill/chess"
import { parse_program9 } from "./parser"


export type Term = 
    | Variable
    | Constant

type Variable = {
    type: 'variable'
    name: string
}

type Constant = {
    type: 'constant',
    value: string
}

export type Atom = {
    relation: string
    terms: Term[]
}

export type Rule = {
    head: Atom
    body: Atom[]
}

function collectVariables(rule: Rule): Map<string, number> {
    const map = new Map<string, number>()

    let next = 0

    function visitTerm(term: Term) {
        if (term.type === 'variable') {
            if (!map.has(term.name)) {
                map.set(term.name, next++)
            }
        }
    }

    for (const term of rule.head.terms) {
        visitTerm(term)
    }

    for (const atom of rule.body) {
        for (const term of atom.terms) {
            visitTerm(term)
        }
    }
    
    return map
}

function compileHead(
    head: Atom,
    varSlots: Map<string, number>,
    relations: Map<string, Relation>
) {
    const rel = relations.get(head.relation)!

    const headSlots: number[] = []

    for (const term of head.terms) {
        if (term.type !== 'variable') {
            throw new Error(`Head constants not supported yet`)
        }
        headSlots.push(varSlots.get(term.name)!)
    }

    return { rel, headSlots }
}

function compileBody(
    rule: Rule,
    varSlots: Map<string, number>,
    relations: Map<string, Relation>,
    externals: Map<string, ExternalRelation>
) {

    const compiledBody: CompiledAtom[] = []

    for (const atom of rule.body) {
        compiledBody.push(
            compileAtom(atom, varSlots, relations, externals)
        )
    }
    return compiledBody
}

export function Language9_Build(text: string) {
    return parse_program9(text)
}

function buildRelationRegistry(rules: Rule[]): Map<string, Relation> {

    const relations = new Map<string, Relation>()

    // Pass 1 — heads define schema
    for (const rule of rules) {

        const name = rule.head.relation

        if (!relations.has(name)) {
            relations.set(name, createRelationForHead(rule.head))
        } else {
            if (relations.get(name)!.arity !== rule.head.terms.length) {
                throw `Arity Mismatch`
            }
        }
    }

    // Pass 2 — bodies must exist
    for (const rule of rules) {
        for (const atom of rule.body) {

            if (atom.relation.startsWith('$')) continue

            if (!relations.has(atom.relation)) {
                relations.set(atom.relation, createRelationGuess(atom))
            } else {
                if (relations.get(atom.relation)!.arity !== atom.terms.length) {
                    throw `Arity Mismatch`
                }
            }
        }
    }

    return relations
}


function createRelationForHead(head: Atom): Relation {

    const name = head.relation
    const arity = head.terms.length

    if (arity === 2) {
        return new Relation2(name)
    }

    if (arity === 3) {
        return new Relation3(name)
    }

    throw new Error(`Unsupported arity ${arity} for relation ${name}`)
}

function createRelationGuess(atom: Atom): Relation {

    const name = atom.relation
    const arity = atom.terms.length

    if (arity === 2) {
        return new Relation2(name)
    }

    if (arity === 3) {
        return new Relation3(name)
    }

    throw new Error(`Unsupported arity ${arity} for relation ${name}`)
}



function compileRule(
    rule: Rule,
    relations: Map<string, Relation>,
    externals: Map<string, ExternalRelation>
): CompiledRule {
    const varSlots = collectVariables(rule)

    const { rel, headSlots } = compileHead(rule.head, varSlots, relations)

    const body = compileBody(rule, varSlots, relations, externals)

    const frame = new Frame(varSlots.size)

    return {
        headRelation: rel,
        headSlots,
        body,
        varSlots,
        frame
    }
}


const compileAtom = (
    atom: Atom, 
    varSlots: Map<string, number>,
    relations: Map<string, Relation>,
    externals: Map<string, ExternalRelation>): CompiledAtom => {
        if (!(relations.has(atom.relation) || externals.has(atom.relation))) {
            throw 'No atom relation found ' + atom.relation
        }

        let argSlots: number[] = []
        const constValues: (number|null)[] = []
        for (let term of atom.terms) {
            if (term.type === 'variable') {
                let slot = varSlots.get(term.name)!
                argSlots.push(slot)
                constValues.push(null)
            }
            if (term.type === 'constant') {
                argSlots.push(-1)
                constValues.push(decode_const(term.value))
            }
        }

        let external, relation
        if (atom.relation.startsWith('$')) {
            let external = externals.get(atom.relation)

            return {
                relation: new Relation2('$external'),
                external,
                argSlots,
                constValues,
                inputArity: 1
            }
        } else {
            let relation = relations.get(atom.relation)!
            let columnIndexes = atom.terms.map((_, i) => i)
            return {

                relation,
                argSlots,
                columnIndexes,
                constValues,
                inputArity: -1
            }
        }

    }

const decode_const = ($const: string) => {
    return 0

}

class Relation2 {
    name: string
    arity = 2

    i_nb: number = 0

    colA: number[] = []
    colB: number[] = []

    tuplesSet = new Set<number>()
    deltaRows: number[] = []

    indexA: Map<number, Set<number>> = new Map()
    indexB: Map<number, Set<number>> = new Map()

    constructor(name: string) {
        this.name = name
    }

    insert(A: number, B: number) {
        const key = (A << 20) | B

        if (this.tuplesSet.has(key)) return

        const row = this.i_nb++

        this.colA[row] = A
        this.colB[row] = B

        this.tuplesSet.add(key)
        this.deltaRows.push(row)

        if (!this.indexA.has(A)) this.indexA.set(A, new Set())
        if (!this.indexB.has(B)) this.indexB.set(B, new Set())

        this.indexA.get(A)!.add(row)
        this.indexB.get(B)!.add(row)
    }
}


class Relation3 {
    name: string
    arity = 3

    i_nb: number
    colR: number[]
    colP: number[]
    colC: number[]

    tuplesSet: Set<TupleKey>

    deltaRows: number[]

    indexR: Index
    indexP: Index
    indexC: Index

    constructor(name: string) {

        this.name = name
        this.i_nb = 0
        this.colR = []
        this.colP = []
        this.colC = []

        this.tuplesSet = new Set()
        this.deltaRows = []

        this.indexR = new Map()
        this.indexP = new Map()
        this.indexC = new Map()
    }

    insert(R: number, P: number, C: number) {
        let key = tuple_key(R, P, C)

        if (this.tuplesSet.has(key)) {
            return
        }

        this.colR[this.i_nb] = R
        this.colP[this.i_nb] = P
        this.colC[this.i_nb] = C

        let row = this.i_nb++

        this.tuplesSet.add(key)

        this.deltaRows.push(row)

        {
            this.indexR.get(R)?.add(row)
            this.indexP.get(P)?.add(row)
            this.indexC.get(C)?.add(row)

            if (!this.indexR.has(R)) {
                this.indexR.set(R, new Set([row]))
            }

            if (!this.indexP.has(P)) {
                this.indexP.set(P, new Set([row]))
            }

            if (!this.indexC.has(C)) {
                this.indexC.set(C, new Set([row]))
            }
        }
    }

    lookupPR(P: number, R: number, emit_C: (C: number) => void) {
        let candidateRows = this.indexP.get(P)!


        for (let candidateRow of candidateRows) {
            if (this.colR[candidateRow] === R) {
                emit_C(this.colC[candidateRow])
            }
        }
    }
}

type TupleKey = number

const tuple_key = (a: number, b: number, c: number) => {
    return (a << 40) | (b << 20) | c
}

type RowId = number

type Tuple = Int32Array  | number[]

type Index = Map<number, Set<RowId>>

type Relation = Relation3 | Relation2

type CompiledRule = {
    headRelation: Relation
    headSlots: number[]
    body: CompiledAtom[]

    varSlots: Map<string, number>
    frame: Frame
}

type CompiledAtom = {
    relation: Relation
    argSlots: number[]
    constValues: (number | null)[]
    external?: ExternalRelation
    columnIndexes?: number[]
    inputArity: number
}

type ExternalRelation = (mz: PositionMaterializer, frame: Frame, emit: (values: number[]) => void) => void



class Frame {
    values: Int32Array
    bound: Uint8Array

    constructor(varCount: number) {
        this.values = new Int32Array(varCount)
        this.bound = new Uint8Array(varCount)
    }

    reset() {
        this.bound.fill(0)
    }
}


/*
function run_rule_forced_reachable() {

    for (let row of forced_reachable.deltaRows) {

        let R = forced_reachable.colR[row]
        let P = forced_reachable.colW[row]

        world_edge.loopkupPR(P, R, (C) => {
            forced_reachable.insert(R, C)
        })
    }
}


*/


function bindRowIntoFrame(frame: Frame, atom: CompiledAtom, row: RowId) {

    const rel = atom.relation
    const slots = atom.argSlots

    if (rel instanceof Relation2) {
        const v0 = rel.colA[row]
        const v1 = rel.colB[row]

        bindValue(frame, slots[0], v0)
        bindValue(frame, slots[1], v1)
    } else if (rel instanceof Relation3) {
        const v0 = rel.colR[row]
        const v1 = rel.colP[row]
        const v2 = rel.colC[row]

        bindValue(frame, slots[0], v0)
        bindValue(frame, slots[1], v1)
        bindValue(frame, slots[2], v2)
    }
}

function bindValue(frame: Frame, slot: number, value: number) {
    if (frame.bound[slot] === 0) {
        frame.values[slot] = value
        frame.bound[slot] = 1
        return true
    }
    return frame.values[slot] === value
}


function executeRule(mz: PositionMaterializer, rule: CompiledRule) {

    let frame = rule.frame

    let driver = chooseDriver(rule)
    const rest = rule.body.filter(atom => atom !== driver)

    for (let row of driver.relation.deltaRows) {

        frame.reset()

        bindRowIntoFrame(frame, driver, row)

        joinRestUsing(mz, rule, rest, 0, frame)
    }
}

function joinRestUsing(
    mz: PositionMaterializer,
    rule: CompiledRule,
    rest: CompiledAtom[],
    atomIndex: number,
    frame: Frame
) {

    // Base case: all atoms satisfied
    if (atomIndex >= rest.length) {
        emitHead(rule, frame)
        return
    }

    const atom = rest[atomIndex]


    if (atom.external) {

        const snapshot = snapshotFrame(frame)
        const slotC = atom.argSlots[1]
        atom.external(mz, frame, (values) => {
            for (let i = 0; i < values.length; i++) {
                const slot = atom.argSlots[i + atom.inputArity]

                if (!bindValue(frame, slot, values[i])) return
            }

            joinRestUsing(mz, rule, rest, atomIndex + 1, frame)

            restoreFrame(frame, snapshot)
        })
        return
    }


    if (atom.relation && atom.relation.i_nb === 0) return

    const rel = atom.relation

    let candidates = getCandidateRows(atom, frame)

    // Iterate all rows (slow but correct)
    //for (let row = 0; row < rel.i_nb; row++) {
    for (let row of candidates) {

        const snapshot = snapshotFrame(frame)
        if (unifyRow(frame, atom, row)) {
            joinRestUsing(mz, rule, rest, atomIndex + 1, frame)
        }

        restoreFrame(frame, snapshot)
    }
}

const external$legal_worlds = (mz: PositionMaterializer, atom: CompiledAtom, frame: Frame, emit: (values: number[]) => void) => {
    const slotP = atom.argSlots[0]
    const slotC = atom.argSlots[1]

    const P = frame.values[slotP]

    const children = mz.generate_legal_worlds(P)

    for (const C of children) {
        emit([C])
    }
}


function chooseDriver(rule: CompiledRule): CompiledAtom {

    let best = rule.body[0]
    let bestSize = best.relation.deltaRows.length

    for (let atom of rule.body) {
        const size = atom.relation.deltaRows.length
        if (size > 0 && size < bestSize) {
            best = atom
            bestSize = size
        }
    }

    return best
}

function emitHead(rule: CompiledRule, frame: Frame) {
    const rel = rule.headRelation
    const slots = rule.headSlots

    if (rel instanceof Relation2) {
        rel.insert(frame.values[slots[0]],
            frame.values[slots[1]]
        )
    } else if (rel instanceof Relation3) {
        rel.insert(
            frame.values[slots[0]],
            frame.values[slots[1]],
            frame.values[slots[2]],
        )

    }
}

function getCandidateRows(atom: CompiledAtom, frame: Frame): Iterable<number> {

    const rel = atom.relation
    const slots = atom.argSlots

    // Example for Relation3

    if (rel instanceof Relation3) {
        const slotR = slots[0]
        const slotP = slots[1]
        const slotC = slots[2]

        const boundR = frame.bound[slotR]
        const boundP = frame.bound[slotP]

        // Prefer P index if available and bound
        if (boundP) {
            return rel.indexP.get(frame.values[slotP]) ?? []
        }

        if (boundR) {
            return rel.indexR.get(frame.values[slotR]) ?? []
        }
    }

    // fallback
    return range(0, rel.i_nb)
}

const range = (a: number, b: number)  => {
    return [...new Array(b).keys()]
}


function unifyRow(frame: Frame, atom: CompiledAtom, row: RowId) {
    const rel = atom.relation
    const slots = atom.argSlots

    if (rel instanceof Relation2) {
        if (!bindValue(frame, slots[0], rel.colA[row])) return false
        if (!bindValue(frame, slots[1], rel.colB[row])) return false
        return true
    } else {
        if (!bindValue(frame, slots[0], rel.colR[row])) return false
        if (!bindValue(frame, slots[1], rel.colP[row])) return false
        if (!bindValue(frame, slots[2], rel.colC[row])) return false
        return true
    }
}

function snapshotFrame(frame: Frame) {
    return {
        values: frame.values.slice(),
        bound: frame.bound.slice()
    }
}

function restoreFrame(frame: Frame, snap: any) {
    frame.values.set(snap.values)
    frame.bound.set(snap.bound)
}

function lookupUsingIndexes(atom: CompiledAtom, frame: Frame) {

}

class Language9 {

    relations: (Relation2 | Relation3)[]
    stratums: CompiledRule[][]

    constructor(private mz: PositionMaterializer) {}

    loop() {

        for (const stratum of this.stratums) {

            // Initial delta already exists from seeds

            let anyChange: boolean

            do {
                anyChange = false

                // Run all rules in this stratum
                for (const rule of stratum) {
                    const changed = this.executeRule(rule)
                    if (changed) anyChange = true
                }

                // After rules, merge deltas into base
                const merged = this.mergeAllDeltas()

                if (merged) anyChange = true

            } while (anyChange)
        }
    }


    executeRule(rule: CompiledRule) {

        const target = rule.headRelation
        let before = target.deltaRows.length
        executeRule(this.mz, rule)

        let after = target.deltaRows.length
        return after > before
    }

    mergeAllDeltas(): boolean {

        let any = false

        for (const rel of this.relations) {
            if (rel.deltaRows.length > 0) {
                any = true
                rel.deltaRows = []
            }
        }

        return any
    }

}
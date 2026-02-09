import { get } from "http"

type Term = 
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

class Relation2 {
    name: string
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

    loopkupPR(P: number, R: number, emit_C: (C: number) => void) {
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
}


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


function executeRule(rule: CompiledRule) {

    let frame = rule.frame

    //let driver = rule.body[0]
    let driver = chooseDriver(rule)
    const rest = rule.body.filter(atom => atom !== driver)

    for (let row of driver.relation.deltaRows) {

        frame.reset()

        bindRowIntoFrame(frame, driver, row)

        joinRestUsing(rule, rest, 0, frame)
    }
}

function joinRestUsing(
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
    const rel = atom.relation

    let candidates = getCandidateRows(atom, frame)

    // Iterate all rows (slow but correct)
    //for (let row = 0; row < rel.i_nb; row++) {
    for (let row of candidates) {

        const snapshot = snapshotFrame(frame)

        if (unifyRow(frame, atom, row)) {
            joinRestUsing(rule, rest, atomIndex + 1, frame)
        }

        restoreFrame(frame, snapshot)
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
        executeRule(rule)

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

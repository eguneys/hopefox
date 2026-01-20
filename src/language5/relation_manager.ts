import { ColorC, PieceTypeC } from "../distill/hopefox_c"
import { Square } from "../distill/types"

type WorldId = number
export type RowId = number

export type Field = string
export type Row = Map<Field, number>
export type Relation = { rows: Row[] }



export class RelationManager {

    private base: Relation
    private index_start_world: Map<WorldId, RowId[]>

    private key_index: Map<number, RowId>

    constructor() {
        this.base = { rows: [] }
        this.index_start_world = new Map()
        this.key_index = new Map()
    }

    compute_key(row: Row) {
        let res = 1

        for (let value of row.values()) {
            res += (value + 1)
            res *= (value + 1)
            res += (Math.sin(value) + 1 + Math.sin(value + 1))
        }
        res = Math.floor(res)
        return res
    }

    add_rows(world_id: WorldId, rows: Row[]) {
        for (const row of rows) {
            const key = this.compute_key(row)

            if (this.key_index.has(key)) {
                continue
            }

            const row_id = this.base.rows.length
            this.base.rows.push(row)

            this.key_index.set(key, row_id)

            if (!this.index_start_world.has(world_id)) {
                this.index_start_world.set(world_id, [])
            }
            this.index_start_world.get(world_id)!.push(row_id)
        }
    }

    add_row(row: Row) {

        const key = this.compute_key(row)

        if (this.key_index.has(key)) {
            return
        }


        let row_id = this.base.rows.length
        this.base.rows.push(row)

        this.key_index.set(key, row_id)

        const w = row.get('start_world_id')
        if (w !== undefined) {
            let list = this.index_start_world.get(w)
            if (!list) {
                this.index_start_world.set(w, [row_id])
            } else {
                list.push(row_id)
            }
        }
    }

    get_relation_starting_at_world_id(world_id: WorldId): Relation {
        return { rows: this.get_row_ids_starting_at_world_id(world_id).map(row_id => this.base.rows[row_id]) }
    }

    get_row_ids_starting_at_world_id(world_id: WorldId): RowId[] {
        return this.index_start_world.get(world_id) ?? []
    }
    get_row(row_id: RowId) {
        return this.base.rows[row_id]
    }

    lookupRows(
        world_id: WorldId,
        constraints: { field: Field; value: number, is_different?: boolean }[]
    ): RowId[] {
        let candidates = this.get_row_ids_starting_at_world_id(world_id)

        for (const { field, value, is_different } of constraints) {
            candidates = candidates.filter(row_id => {
                if (is_different) {
                    return this.base.rows[row_id].get(field) !== value
                }
                return this.base.rows[row_id].get(field) === value
            })
        }

        return candidates
    }

}





export function select(
  rel: Relation,
  predicate: (r: Row) => boolean
): Relation {
  return {
    rows: rel.rows.filter(predicate)
  }
}


export function project(
  rel: Relation,
  fn: (r: Row) => Row
): Relation {
  return {
    rows: rel.rows.map(fn)
  }
}

export function mergeRows(a: Row, b: Row): Row | null {
  const out = {...a}

  for (const [k, v] of b.entries()) {
    if (out.get(k) !== undefined && out.get(k) !== v) return null
    out.set(k, v)
  }

  return out
}

export function join(
  a: Relation,
  b: Relation,
  on?: (a: Row, b: Row) => Row | null
): Relation {
  const rows: Row[] = []

  for (const ra of a.rows) {
    for (const rb of b.rows) {
      const merged = on
        ? on(ra, rb)
        : mergeRows(ra, rb)

      if (merged) rows.push(merged)
    }
  }

  return { rows }
}

export function semiJoin(
  a: Relation,
  b: Relation,
  predicate: (a: Row, b: Row) => boolean
): Relation {
  return {
    rows: a.rows.filter(ra =>
      b.rows.some(rb => predicate(ra, rb))
    )
  }
}

export function extend(
  rel: Relation,
  fn: (r: Row) => Row
): Relation {
  return {
    rows: rel.rows.map(r => mergeRows(r, fn(r))!)
  }
}


export function flatExtend(
  rel: Relation,
  fn: (r: Row) => Row[]
): Relation {
  const rows = []

  for (const r of rel.rows) {
    for (const ext of fn(r)) {
      const merged = mergeRows(r, ext)
      if (merged) rows.push(merged)
    }
  }

  return { rows }
}

export function concat(a: Relation, b: Relation): Relation {
  return {
    rows: [...a.rows, ...b.rows]
  }
}



export function anti_join(a: Relation, b: Relation, predicate: (a: Row, b: Row) => boolean): Relation {
    return {
        rows: a.rows.filter(ra =>
            b.rows.every(rb => !predicate(ra, rb))
        )
    }
}


export function intersect_from_to(a: Relation, b: Relation) {
    return {
        rows: semiJoin(a, b, (a, b) => a.get('from') === b.get('from') && a.get('to') === b.get('to')).rows
    }
}

export function intersect_all_from_to(bs: Relation[]) {
    return bs.reduce((a, b) => intersect_from_to(a, b))
}


export function intersect_from_to_and_beyond(a: Relation, b: Relation) {
    const beyond = (a: number | undefined, b: number | undefined) => (a !== undefined && b !== undefined) ? a === b : true

    return {
        rows: semiJoin(a, b, (a, b) => a.get('from') === b.get('from') && a.get('to') === b.get('to') && beyond(a.get('to2'), b.get('to2'))).rows
    }
}


export function intersect_all_from_to_and_beyond(bs: Relation[]) {
    return bs.reduce((a, b) => intersect_from_to_and_beyond(a, b))
}
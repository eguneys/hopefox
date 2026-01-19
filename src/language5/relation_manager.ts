import { ColorC, PieceTypeC } from "../distill/hopefox_c"
import { Square } from "../distill/types"

type WorldId = number
export type RowId = number


export type BaseRow = {
    start_world_id: WorldId
    end_world_id: WorldId
}

export type Relation<R extends BaseRow> = { rows: R[] }



export class RelationManager<R extends BaseRow> {

    private base: Relation<R>
    private index_start_world: Map<WorldId, RowId[]>

    private key_index: Map<number, RowId>

    constructor() {
        this.base = { rows: [] }
        this.index_start_world = new Map()
        this.key_index = new Map()
    }

    compute_key(row: R) {
        let res = 1

        for (let value of Object.values(row)) {
            res += (value + 1)
            res *= (value + 1)
            res += (Math.sin(value) + 1 + Math.sin(value + 1))
        }
        res = Math.floor(res)
        return res
    }

    add_rows(world_id: WorldId, rows: R[]) {
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

    add_row(row: R) {

        const key = this.compute_key(row)

        if (this.key_index.has(key)) {
            return
        }


        let row_id = this.base.rows.length
        this.base.rows.push(row)

        this.key_index.set(key, row_id)

        const w = row['start_world_id']
        if (w !== undefined) {
            let list = this.index_start_world.get(w)
            if (!list) {
                this.index_start_world.set(w, [row_id])
            } else {
                list.push(row_id)
            }
        }
    }

    get_relation_starting_at_world_id(world_id: WorldId): Relation<R> {
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
        constraints: { column: keyof R; value: number, is_different?: boolean }[]
    ): RowId[] {
        let candidates = this.get_row_ids_starting_at_world_id(world_id)

        for (const { column, value, is_different } of constraints) {
            candidates = candidates.filter(row_id => {
                if (is_different) {
                    return this.base.rows[row_id][column] !== value
                }
                return this.base.rows[row_id][column] === value
            })
        }

        return candidates
    }

}





export function select<T extends BaseRow>(
  rel: Relation<T>,
  predicate: (r: T) => boolean
): Relation<T> {
  return {
    rows: rel.rows.filter(predicate)
  }
}


export function project<T extends BaseRow>(
  rel: Relation<T>,
  fn: (r: T) => T
): Relation<T> {
  return {
    rows: rel.rows.map(fn)
  }
}

export function mergeRows<Row extends BaseRow, RowB extends BaseRow, RowC extends Row | RowB>(a: Row, b: RowB): RowC | null {
  const out: RowC = {...a} as RowC

  for (const k of Object.keys(b)) {
    let v = b[k as keyof RowB]
    if (out[k as keyof RowC] !== undefined && out[k as keyof RowC] !== v) return null
    out[k as keyof RowC] = v as RowC[keyof RowC]
  }

  return out
}

export function join<RowA extends BaseRow, RowB extends BaseRow, RowC extends BaseRow>(
  a: Relation<RowA>,
  b: Relation<RowB>,
  on?: (a: RowA, b: RowB) => RowC | null
): Relation<RowC> {
  const rows: RowC[] = []

  for (const ra of a.rows) {
    for (const rb of b.rows) {
      const merged = on
        ? on(ra, rb)
        : mergeRows(ra, rb) as (RowC | null)

      if (merged) rows.push(merged)
    }
  }

  return { rows }
}

export function semiJoin<RowA extends BaseRow, RowB extends BaseRow>(
  a: Relation<RowA>,
  b: Relation<RowB>,
  predicate: (a: RowA, b: RowB) => boolean
): Relation<RowA> {
  return {
    rows: a.rows.filter(ra =>
      b.rows.some(rb => predicate(ra, rb))
    )
  }
}

export function extend<RowA extends BaseRow, RowB extends BaseRow>(
  rel: Relation<RowA>,
  fn: (r: RowA) => RowB
): Relation<RowB> {
  return {
    rows: rel.rows.map(r => mergeRows(r, fn(r))!)
  }
}


export function flatExtend<RowA extends BaseRow, RowB extends BaseRow>(
  rel: Relation<RowA>,
  fn: (r: RowA) => RowB[]
): Relation<RowA | RowB> {
  const rows: (RowA | RowB)[] = []

  for (const r of rel.rows) {
    for (const ext of fn(r)) {
      const merged = mergeRows(r, ext)
      if (merged) rows.push(merged)
    }
  }

  return { rows }
}

export function concat<Row extends BaseRow>(a: Relation<Row>, b: Relation<Row>): Relation<Row> {
  return {
    rows: [...a.rows, ...b.rows]
  }
}
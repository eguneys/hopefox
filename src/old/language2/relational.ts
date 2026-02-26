type Column = string
type Value = number

export type Row = Map<Column, Value>

export type Relation = {
  rows: Row[]
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
  const out = new Map(a)

  for (const [k, v] of b) {
    if (out.has(k) && out.get(k) !== v) return null
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
  const rows: Row[] = []

  for (const r of rel.rows) {
    for (const ext of fn(r)) {
      const merged = mergeRows(r, ext)
      if (merged) rows.push(merged)
    }
  }

  return { rows }
}
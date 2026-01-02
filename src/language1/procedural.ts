type Column = string
type Value = number

type Row = Record<Column, Value>

type Coll = Row[]

export function one(coll: Coll, fn: (_: Row) => boolean) {
    return coll.find(fn)
}

export function all(coll: Coll, fn: (_: Row) => boolean) {
    return coll.filter(fn)
}

type JoinResult = Row | null

export function join(
  a: Coll,
  b: Coll,
  on: (a: Row, b: Row) => JoinResult
): Coll {
  const out: Coll = []

  for (const ra of a) {
    for (const rb of b) {
      const merged = on(ra, rb)
      if (merged) out.push(merged)
    }
  }

  return out
}

export function semi_join(
  a: Coll,
  b: Coll,
  predicate: (a: Row, b: Row) => boolean
): Coll {
  return a.filter(ra =>
    b.some(rb => predicate(ra, rb))
  )
}

function unify(a: Row, b: Row): Row | null {
  const out: Row = { ...a }

  for (const k in b) {
    if (k in out && out[k] !== b[k]) return null
    out[k] = b[k]
  }

  return out
}


export function project(coll: Coll, fn: (_: Row) => Row) {
    return coll.map(fn)
}
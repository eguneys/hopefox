import { BLACK, KING, make_move_from_to, move_c_to_Move, piece_c_color_of, piece_c_type_of, PositionC, PositionManager, WHITE } from "../hopefox_c"
import { FEN } from "../mor3_hope1"

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


let m = await PositionManager.make()
export function join_position2(fen: FEN) {

  let pos = m.create_position(fen)

  let res = join_position(pos).checks

  let moves = res.rows.map(_ => [make_move_from_to(_.get('move.from')!, _.get('move.to')!)])

  moves = moves.flatMap(move => {
    m.make_move(pos, move[0])

    let res2 = join_position(pos).blocks
    console.log(res2)

    let moves = res2.rows.map(_ => [make_move_from_to(_.get('move.from')!, _.get('move.to')!)])

    m.unmake_move(pos, move[0])

    return moves.map(_ => [...move, ..._])
  })

  m.delete_position(pos)

  return moves
}

export function join_position(pos: PositionC) {

  let moves = move_coll(m, pos)
  let turn = turn_coll(m, pos)
  let occupy = occupy_coll(m, pos)
  let attacks2 = attacks2_coll(m, pos)
  let attacks = attacks_coll(m, pos)

  const Kings = select(occupy, r =>
    r.get('occupy.role') === KING
  )

  const enemyKing = semiJoin(Kings, turn, (k, t) => {
    return k.get('occupy.color') === t.get('opposite.color')
  })

  const checkingAttacks =
    join(attacks2, enemyKing, (a, k) =>
      a.get('attack2.to2') === k.get('occupy.on')
        ? mergeRows(a, k)
        : null)
    
  const checkingMoves =
    join(moves, checkingAttacks, (m, a) =>
      m.get('move.from') === a.get('attack2.from') &&
        m.get('move.to') === a.get('attack2.to')
        ? mergeRows(m, a)
        : null
    )

  const checks =
    extend(checkingMoves, r => {
      const out = new Map<Column, Value>()
      out.set("check", 1)
      return out
    })


  let blockingAttacks = semiJoin(attacks, attacks, (a, b) => {
    if (
      b.get('attack.from')! < a.get('attack.to')! &&
      a.get('attack.to')! < b.get('attack.to')!) {
        return true
    }
    return false
  })

  const blockingMoves =
    join(moves, blockingAttacks, (m, a) =>
      m.get('move.from') === a.get('attack.from') &&
        m.get('move.to') === a.get('attack.to')
        ? mergeRows(m, a)
        : null
    )

  const blocks =
    extend(blockingMoves, r => {
      const out = new Map<Column, Value>()
      out.set("block", 1)
      return out
    })



  return {
    checks,
    blocks
  }
}


function move_coll(m: PositionManager, pos: PositionC): Relation {
  let res: Row[] = []

  let row

  let l = m.get_legal_moves(pos)

  for (let m of l) {

    row = new Map()
    let { from, to } = move_c_to_Move(m)

    row.set('move.from', from)
    row.set('move.to', to)

    res.push(row)
  }
  return { rows: res }
}


function turn_coll(m: PositionManager, pos: PositionC): Relation {
  let res: Row[] = []

  let color = m.pos_turn(pos)
  let row = new Map()
  row.set('turn.color', color)
  row.set('opposite.color', color === WHITE ? BLACK : WHITE)

  res.push(row)

  return { rows: res }
}


function occupy_coll(m: PositionManager, pos: PositionC): Relation {
  let res: Row[] = []

  let color = m.pos_turn(pos)
  let occupied = m.pos_occupied(pos)
  for (let color of [WHITE, BLACK]) {
    let pieces = m.get_pieces_color_bb(pos, color)

    for (let on of pieces) {

      let piece = m.get_at(pos, on)!

      let role = piece_c_type_of(piece)

      let occupy = new Map()
      occupy.set('occupy.color', color)
      occupy.set('occupy.role', role)
      occupy.set('occupy.on', on)
      res.push(occupy)
    }
  }

  return { rows: res }
}


function attacks2_coll(m: PositionManager, pos: PositionC): Relation {
  let res: Row[] = []

  let occupied = m.pos_occupied(pos)
  for (let color of [WHITE, BLACK]) {
    let pieces = m.get_pieces_color_bb(pos, color)

    for (let on of pieces) {

      let piece = m.get_at(pos, on)!


      let aa = m.attacks(piece, on, occupied)

      for (let a of aa) {

        let aa2 = m.attacks(piece, a, occupied.without(on))

        for (let a2 of aa2) {
          let attack2 = new Map()
          attack2.set('attack2.from', on)
          attack2.set('attack2.to', a)
          attack2.set('attack2.to2', a2)
          res.push(attack2)
        }
      }
    }

  }

  return { rows: res }
}

function attacks_coll(m: PositionManager, pos: PositionC): Relation {
        let res: Row[] = []

        let occupied = m.pos_occupied(pos)
        for (let color of [WHITE, BLACK]) {
            let pieces = m.get_pieces_color_bb(pos, color)

            for (let on of pieces) {

                let piece = m.get_at(pos, on)!


                let aa = m.attacks(piece, on, occupied)

                for (let a of aa) {

                    let attack = new Map()
                    attack.set('attack.from', on)
                    attack.set('attack.to', a)
                    res.push(attack)
                }
            }

        }

  return { rows: res }
}
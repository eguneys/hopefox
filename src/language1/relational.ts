import { BLACK, KING, make_move_from_to, move_c_to_Move, MoveC, piece_c_color_of, piece_c_type_of, PositionC, PositionManager, WHITE } from "../hopefox_c"
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

function expand(
  m: PositionManager,
  pos: PositionC,
  moves: MoveC[][],
  next: (pos: PositionC) => MoveC[][]
): MoveC[][] {
  const res: MoveC[][] = []

  for (const mm of moves) {
    for (let move of mm) {
      m.make_move(pos, move)
    }

    for (const mm2 of next(pos)) {
      res.push([...mm, ...mm2])
    }

    for (let i = mm.length - 1; i >= 0; i--) {
      m.unmake_move(pos, mm[i])
    }
  }

  return res
}


let m = await PositionManager.make()
export function join_position2(fen: FEN) {

  let pos = m.create_position(fen)

  function out_moves(pos: PositionC) {
    let res = join_position1a(pos)

    return res.moves
  }

  let moves: MoveC[][] = out_moves(pos)

  m.delete_position(pos)

  return moves
}

export function join_position1a(pos: PositionC) {
  let pp = join_position(pos)

  let moves: MoveC[][] = []

  moves.push(...bind_moves([pp.moves]))
  /*
  let checks = pp.checks
  make_moves(checks, pos, () => {
    let pp2 = join_position(pos)

    let blocks = pp2.blocks

    make_moves(blocks, pos, () => {
      let pp3 = join_position(pos)

      let captures = pp3.captures

      let forks = pp3.forks

      moves.push(...bind_moves([checks, blocks, forks]))
    })
  })
    */


  return {
    moves
  }

}

function bind_moves(aa: Relation[]) {
  let moves: MoveC[][] = out_moves(aa[0])

  for (let i = 1; i < aa.length; i++) {
    let b = out_moves(aa[i])
    moves = moves.flatMap(_ => b.map(m => [..._, ...m]))
  }
  return moves
}

function out_moves(moves: Relation) {
  return moves.rows.map(_ => [make_move_from_to(_.get('move.from')!, _.get('move.to')!)])
}

function make_moves(moves: Relation, pos: PositionC, fn: () => void) {
  for (let move of moves.rows) {
    m.make_move(pos, make_move_from_to(move.get('move.from')!, move.get('move.to')!))
    fn()
    m.unmake_move(pos, make_move_from_to(move.get('move.from')!, move.get('move.to')!))
  }
}
function unmake_moves(moves: Relation, pos: PositionC) {
  for (let i = moves.rows.length - 1; i >= 0; i--) {
    let move = moves.rows[i]
    m.unmake_move(pos, make_move_from_to(move.get('move.from')!, move.get('move.to')!))
  }
}

export function join_position(pos: PositionC) {

  let color = m.pos_turn(pos)
  let enemy_color = color === WHITE ? BLACK : WHITE

  let moves = move_coll(m, pos)
  let turn = turn_coll(m, pos)
  let occupy = occupy_coll(m, pos)
  let attacks2 = attacks2_coll(m, pos)
  let attacks = attacks_coll(m, pos)

  let _

  _ = join(attacks, occupy, (a, o1) =>
    a.get('attack.attacker_square') === o1.get('occupy.square')
      ? mergeRows(a, o1)
      : null
  )
  _ = join(_, occupy, (t, o2) =>
    t.get('attack.target_square') === o2.get('occupy.square') &&
      t.get('occupy.color') !== o2.get('occupy.color')
      ? (() => {
        const r = new Map()
        r.set('threat.attacker_square', t.get('attack.attacker_square'))
        r.set('threat.attacker_piece', t.get('occupy.piece'))
        r.set('threat.attacker_color', t.get('occupy.color'))
        r.set('threat.target_square', o2.get('occupy.square'))
        r.set('threat.target_piece', o2.get('occupy.piece'))
        r.set('threat.target_value', o2.get('occupy.value'))
        return r
      })()
      : null
  )

  let threats = _

  moves = project(threats, (a) => {
    let row = new Map()
    row.set('move.from', a.get('threat.attacker_square'))
    row.set('move.to', a.get('threat.target_square'))
    return row
  })

  return {
    moves
  }
}

function mapRows(a: Row, b: Row, fn: (a: Row, b: Row) => Row) {
  return fn(a, b)
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
      occupy.set('occupy.square', on)
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
                    attack.set('attack.attacker_square', on)
                    attack.set('attack.target_square', a)
                    res.push(attack)
                }
            }

        }

  return { rows: res }
}
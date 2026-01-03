import { between } from "../attacks"
import { BLACK, KING, make_move_from_to, move_c_to_Move, MoveC, piece_c_color_of, piece_c_type_of, PositionC, PositionManager, WHITE } from "../hopefox_c"
import { FEN } from "../mor3_hope1"
import { SquareSet } from "../squareSet"

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

  let first_move = pp

  let res: MoveC[][] = []
  
  make_moves(pp.moves, pos, () => {
    let second_move = join_position(pos)

    let blockable_checks = join(first_move.checks, second_move!.blocks, (a, b) =>
      a.get('check.check_square') === b.get('block.attacker_square') &&
        a.get('check.target_square') === b.get('block.target_square')
        ? (() => {
          const r = new Map()
          r.set('blockable_check.blocker_square', b.get('block.blocker_square'))
          r.set('blockable_check.block_square', b.get('block.block_square'))
          r.set('blockable_check.attacker_square', a.get('check.check_square'))
          r.set('blockable_check.attacker_piece', a.get('check.piece'))
          r.set('blockable_check.attacker_color', a.get('check.color'))
          r.set('blockable_check.target_square', b.get('check.target_square'))
          r.set('blockable_check.target_piece', b.get('block.target_square'))

          r.set('blockable_check.check_attacker_square', a.get('check.attacker_square'))
          r.set('blockable_check.check_square', a.get('check.check_square'))

          return r
        })()
        : null
    )

    let moves1 = project(blockable_checks, (a) => {
      let row = new Map()
      row.set('move.from', a.get('blockable_check.check_attacker_square'))
      row.set('move.to', a.get('blockable_check.check_square'))
      return row
    })

    let moves2 = project(blockable_checks, (a) => {
      let row = new Map()
      row.set('move.from', a.get('blockable_check.blocker_square'))
      row.set('move.to', a.get('blockable_check.block_square'))
      return row
    })

    moves1 = legalize_moves(first_move.moves, moves1)
    moves2 = legalize_moves(second_move!.moves, moves2)

    res.push(...bind_moves([moves1, moves2]))
  })

  return {
    moves: res
  }
}

function legalize_moves(moves: Relation, a: Relation) {
  return semiJoin(moves, a, (a, b) =>
    a.get('move.from') === b.get('move.from') &&
    a.get('move.to') === b.get('move.to')
  )
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

  let legal_moves = move_coll(m, pos)
  let turn = turn_coll(m, pos)
  let { occupies, vacants } = occupies_coll(m, pos)
  let attacks2 = attacks2_coll(m, pos)
  let attacks = attacks_coll(m, pos)

  let _
  let pressures, covers, defends

  let attacks_occupy = join(attacks, occupies, (a, o1) =>
    a.get('attack.attacker_square') === o1.get('occupy.square')
      ? mergeRows(a, o1)
      : null
  )

  covers = semiJoin(attacks, vacants, (a, o2) =>
    a.get('attack.target_square') === o2.get('vacant.square')
  )

  pressures = join(attacks_occupy, occupies, (t, o2) =>
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


  _ = join(attacks2, occupies, (a2, o1) =>
    a2.get('attack2.attacker_square') === o1.get('occupy.square')
      ? mergeRows(a2, o1)
      : null
  )

  _ = join(_, occupies, (t, o2) =>
    t.get('attack2.target_square') === o2.get('occupy.square') &&
    t.get('occupy.color') !== o2.get('occupy.color')
      ? (() => {
        const r = new Map()
        r.set('check.check_square', t.get('attack2.check_square'))
        r.set('check.attacker_square', t.get('attack2.attacker_square'))
        r.set('check.attacker_piece', t.get('occupy.piece'))
        r.set('check.attacker_color', t.get('occupy.color'))
        r.set('check.target_square', o2.get('occupy.square'))
        r.set('check.target_piece', o2.get('occupy.piece'))
        r.set('check.target_value', o2.get('occupy.value'))
        return r
      })()
      : null
  )

  let checks = select(_, _ => _.get('check.target_piece') === KING)

  checks = select(checks, _ => _.get('check.attacker_color') === color)

  let blocks = join(pressures, attacks, (a, b) =>
    between(
      a.get('threat.attacker_square')!, 
      a.get('threat.target_square')!)
      .has(b.get('attack.target_square')!)
      ? (() => {
        const r = new Map()
        r.set('block.attacker_square', a.get('threat.attacker_square'))
        r.set('block.target_square', a.get('threat.target_square'))
        r.set('block.blocker_square', b.get('attack.attacker_square'))
        r.set('block.block_square', b.get('attack.target_square'))
        return r
      })()
      : null
  )

  let moves = legal_moves

  return {
    checks,
    blocks,
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


function occupies_coll(m: PositionManager, pos: PositionC): { occupies: Relation, vacants: Relation } {
  let occupies: Relation = { rows: [] }
  let vacants: Relation = { rows: [] }

  let occupied = m.pos_occupied(pos)
  for (let on of SquareSet.full()) {

    let piece = m.get_at(pos, on)

    if (!piece) {
      let vacant = new Map()
      vacant.set('vacant.square', on)
      vacants.rows.push(vacant)
      continue
    }

    let occupy = new Map()
    occupy.set('occupy.color', piece_c_color_of(piece))
    occupy.set('occupy.piece', piece_c_type_of(piece))
    occupy.set('occupy.square', on)
    occupies.rows.push(occupy)
  }

  return { occupies, vacants }
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
          attack2.set('attack2.attacker_square', on)
          attack2.set('attack2.check_square', a)
          attack2.set('attack2.target_square', a2)
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
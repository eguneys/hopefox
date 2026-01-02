import { BLACK, KING, KNIGHT, make_move_from_to, move_c_to_Move, piece_c_type_of, PositionC, PositionManager, ROOK, WHITE } from "../hopefox_c"

function execute(bindings: Binding[]) {
    let result: Row[] = [{ fields: new Map(), env: new Map() }]
    for (const binding of bindings) {
        const rows = binding()
        result = join(result, rows)

        for (const row of result) {
            for (const [k, v] of row.fields) {
                const r = resolve(v, row.env)
                if (typeof r === "symbol") continue
                if (typeof v === "symbol" && row.env.has(v) && row.env.get(v)! !== r) {
                    throw new Error("Inconsistent binding detected")
                }
            }
        }



        if (result.length === 0) {
            break
        }
    }
    return result
}

type Binding = () => Row[]

type Value = number | Symbol
type Path = string

type Env = Map<symbol, number>

type Row = {
  fields: Map<string, number | symbol>
  env: Env
}


function resolve(v: number | symbol, env: Env): number | symbol {
  while (typeof v === "symbol" && env.has(v)) {
    v = env.get(v)!
  }
  return v
}


function unify(a: number | symbol, b: number | symbol, env: Env): boolean {
  a = resolve(a, env)
  b = resolve(b, env)

  if (a === b) return true

  if (typeof a === "symbol") {
      if (typeof b === 'number') {
          env.set(a, b)
          return true
      }
  }

  if (typeof b === "symbol") {
    if (typeof a === 'number') {
        env.set(b, a)
        return true
    }
  }

  return false
}

function join(a: Row[], b: Row[]): Row[] {
  const out: Row[] = []

  for (const ra of a) {
    for (const rb of b) {
      const fields = new Map(ra.fields)
      const env = new Map(ra.env)

      let ok = true

      for (const [k, rawV] of rb.fields) {
        const v = resolve(rawV, env)

        if (!fields.has(k)) {
          fields.set(k, v)
        } else {
          const existing = resolve(fields.get(k)!, env)
          if (!unify(existing, v, env)) {
            ok = false
            break
          }
          fields.set(k, resolve(existing, env))
        }
      }

      if (ok) out.push({ fields, env })
    }
  }

  return out
}


function projectMove(row: Row) {
    let from = row.fields.get('move.from')
    let to = row.fields.get('move.to')

    if (from === undefined || to === undefined) {
        return []
    }

    from = resolve(from, row.env)
    to = resolve(to, row.env)



    if (typeof from !== 'number' || typeof to !== 'number') {
        return []
    }

    return [[make_move_from_to(from, to)]]
}


type FEN = string
let m = await PositionManager.make()
export function join_position(fen: FEN) {

    let pos = m.create_position(fen)

    let turn = turn_binding(m, pos)
    let occupies = occupy_binding(m, pos)
    let moves = move_binding(m, pos)
    let attacks = attacks_binding(m, pos)
    let attacks2 = attacks2_binding(m, pos)

    let bindings = [
        occupies,
        moves,
        () => {

            let fields = new Map()
            fields.set('move.from', Z)
            fields.set('occupy.on', Z)
            return [
                { fields, env: new Map()}
            ]
        },
        //attacks,
        attacks2,
        check_binding
    ]


    let res = execute(bindings)

    //console.log(res.map(_ => [_.fields.get('move.from'), _.fields.get('move.to'), _.fields.get('occupy.on'), _.env]))

    m.delete_position(pos)

    return res.flatMap(_ => projectMove(_))
}

const X = Symbol('X')
const Y = Symbol('Y')
const Z = Symbol('Z')

const check_binding: Binding = () => {

    let rows: Row[] = []

    let row = new Map()
    row.set('occupy.role', KING)
    rows.push({ fields: row, env: new Map() })

    return rows
}


function move_binding(m: PositionManager, pos: PositionC): Binding {
    return () => {

        let res: Row[] = []

        let row

        let l = m.get_legal_moves(pos)

        for (let m of l) {

            row = new Map()
            let { from, to } = move_c_to_Move(m)

            row.set('move.from', from)
            row.set('move.to', to)

            res.push({ fields: row, env: new Map() })
        }
        return res
    }
}


function turn_binding(m: PositionManager, pos: PositionC): Binding {
    return () => {

        let res: Row[] = []

        let color = m.pos_turn(pos)
        let row = new Map()
        row.set('turn.color', color)
        row.set('opposite.color', color === WHITE ? BLACK : WHITE)


        res.push({ fields: row, env: new Map() })

        return res

    }
}


function occupy_binding(m: PositionManager, pos: PositionC): Binding {
    return () => {

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
                res.push({ fields: occupy, env: new Map() })
            }
        }

        return res
    }
}


function attacks2_binding(m: PositionManager, pos: PositionC): Binding {
    return () => {

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
                        res.push({ fields: attack2, env: new Map() })
                    }
                }
            }

        }

        return res
    }
}

function attacks_binding(m: PositionManager, pos: PositionC): Binding {
    return () => {

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
                    res.push({ fields: attack, env: new Map() })
                }
            }

        }

        return res
    }
}
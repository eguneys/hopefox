import { between } from "../attacks"
import { BLACK, KING, piece_c_type_of, PositionC, PositionManager, WHITE } from "../hopefox_c"

type ColumnName = string

enum Param {
    Color,
    Role,
    On,
    From,
    To,
    To2
}

type Column = number

type Value = number



enum Binding {
    Equal,
    Different,
    Const,
    Between
}

type BindEqual = {
    type: Binding.Equal
    a: Column
    p: Param
    b: Column
    q: Param
}

type BindDifferent = {
    type: Binding.Different
    a: Column
    p: Param
    b: Column
    q: Param
}

type BindConst = {
    type: Binding.Const
    a: Column
    p: Param
    v: Value
}

type BindBetween = {
    type: Binding.Between
    a: Column
    p: Param
    b: Column
    from: Param
    on: Param
    to: Param
}

type Bind = 
    | BindEqual
    | BindDifferent
    | BindConst
    | BindBetween

'check'
'Equal attack2 to2 occupy on'
'Const occupy king'


'fork'
'Different attack to attack to'

'block'
'Between occupy on attack from on to'
'Equal occupy on move to'

type Index = number

class Db {

    column_index: number
    column_map: Map<Column, ColumnName>
    column_by_name: Map<ColumnName, Column>

    constructor() {
        this.column_index = 0
        this.column_map = new Map()

        this.binds = new Map()
    }

    NewColumn(name: ColumnName): Column {
        let column = this.column_by_name.get(name)
        if (column) {
            return column
        }
        column = this.column_index
        this.column_map.set(this.column_index++, name)
        this.column_by_name.set(name, column)
        return column
    }

    binds: Map<Column, Bind[]>
    bind: Column

    BeginBind(column: ColumnName) {
        this.bind = this.NewColumn(column)
        this.binds.set(this.bind, [])
    }

    BindEqual(a: ColumnName, p: Param, b: ColumnName, q: Param) {

        let binds = this.binds.get(this.bind)!

        binds.push({
            type: Binding.Equal,
            a: this.NewColumn(a),
            p,
            b: this.NewColumn(b),
            q,
        })
    }

    BindDifferent(a: ColumnName, p: Param, b: ColumnName, q: Param) {

        let binds = this.binds.get(this.bind)!

        binds.push({
            type: Binding.Different,
            a: this.NewColumn(a),
            p,
            b: this.NewColumn(b),
            q,
        })
    }

    BindConst(a: ColumnName, p: Param, v: Value) {

        let binds = this.binds.get(this.bind)!

        binds.push({
            type: Binding.Const,
            a: this.NewColumn(a),
            p,
            v,
        })
    }

    BindBetween(a: ColumnName, p: Param, b: ColumnName, from: Param, on: Param, to: Param) {

        let binds = this.binds.get(this.bind)!

        binds.push({
            type: Binding.Between,
            a: this.column_by_name.get(a)!,
            p,
            b: this.column_by_name.get(b)!,
            from,
            on,
            to,
        })
    }



    /** Alpha */
    BeginSetBinding(column: Column) {

    }

    BeginEqual(a: Column, p: Param, b: Column, q: Param) {

    }

    BeginDifferent(a: Column, p: Param, b: Column, q: Param) {

    }

    BeginBetween(a: Column, p: Param, b: Column, from: Param, on: Param, to: Param) {

    }


    BeginConst(a: Column, p: Param) {

    }


    SetEqual(a: Index, b: Index) {

    }


    SetDifferent(a: Index, b: Index) {

    }

    SetBetween(a: Index, b: Index) {

    }

    SetConst(a: Index) {

    }


    JoinBinds() {

    }


    /** Beta */
    static Nb_ColumnSize = 1000000
    static Nb_ParamSize = 10
    tape: Int32Array = new Int32Array(Db.Nb_ColumnSize * Db.Nb_ParamSize).fill(0)

    BeginAddValue(a: Column) {
        let cursor = 
        this.tape[a * Db.Nb_ColumnSize * Db.Nb_ParamSize]
        this.tape[a * Db.Nb_ColumnSize * Db.Nb_ParamSize] = cursor + Db.Nb_ParamSize
    }

    AddValue(a: Column, p: Param, v: Value) {
        let cursor = this.tape[a * Db.Nb_ColumnSize * Db.Nb_ParamSize]
        this.tape[a * Db.Nb_ColumnSize * Db.Nb_ParamSize + cursor + p] = v
    }

    GetParam(a: Index, p: Param) {
        return this.tape[a + p]
    }

    GetIteration(a: Column) {
        let begin = a * Db.Nb_ColumnSize * Db.Nb_ParamSize + Db.Nb_ParamSize
        let end = this.tape[a * Db.Nb_ColumnSize * Db.Nb_ParamSize]
        return [begin, end, Db.Nb_ParamSize]
    }

    GetParam2(a: Index, p: Param, q: Param) {
        return [a + p, a + q]
    }
}


function run_db(db: Db) {
    for (let [column, binds] of db.binds) {
        db.BeginSetBinding(column)
        for (let bind of binds) {
            if (bind.type === Binding.Equal) {
                db.BeginEqual(bind.a, bind.p, bind.b, bind.q)
                let [A_start, A_end, A_Inc] = db.GetIteration(bind.a)
                for (let a = A_start; a < A_end; a+=A_Inc) {
                    let a_value = db.GetParam(a, bind.p)
                    let [B_start, B_end, B_Inc] = db.GetIteration(bind.b)

                    for (let b = B_start; b < B_end; b+=B_Inc) {
                        let b_value = db.GetParam(b, bind.q)

                        if (a_value === b_value) {
                            db.SetEqual(a, b)
                        }
                    }

                }
            } else if (bind.type === Binding.Different) {
                db.BeginDifferent(bind.a, bind.p, bind.b, bind.q)
                let [A_start, A_end, A_Inc] = db.GetIteration(bind.a)
                for (let a = A_start; a < A_end; a+=A_Inc) {
                    let a_value = db.GetParam(a, bind.p)
                    let [B_start, B_end, B_Inc] = db.GetIteration(bind.b)

                    for (let b = B_start; b < B_end; b+=B_Inc) {
                        let b_value = db.GetParam(b, bind.q)

                        if (a_value !== b_value) {
                            db.SetDifferent(a, b)
                        }
                    }

                }
            } else if (bind.type === Binding.Between) {
                db.BeginBetween(bind.a, bind.p, bind.b, bind.from, bind.on, bind.to)
                let [A_start, A_end, A_Inc] = db.GetIteration(bind.a)
                for (let a = A_start; a < A_end; a+=A_Inc) {
                    let a_value = db.GetParam(a, bind.p)
                    let [B_start, B_end, B_Inc] = db.GetIteration(bind.b)

                    for (let b = B_start; b < B_end; b+=B_Inc) {
                        let [b_value1, b_value2] = db.GetParam2(b, bind.from, bind.to)

                        if (between(b_value1, b_value2).has(a_value)) {
                            db.SetBetween(a, b)
                        }
                    }
                }
            } else if (bind.type === Binding.Const) {
                db.BeginConst(bind.a, bind.p)
                let [A_start, A_end, A_Inc] = db.GetIteration(bind.a)
                for (let a = A_start; a < A_end; a+=A_Inc) {
                    let a_value = db.GetParam(a, bind.p)
                    if (a_value === bind.v) {
                        db.SetConst(a)
                    }
                }
            }
        }

        db.JoinBinds()
    }
}


function bind_db(db: Db) {

    db.BeginBind('check')
    db.BindEqual('attack2', Param.To2, 'occupy', Param.On)
    db.BindConst('occupy', Param.Role, KING)

    db.BeginBind('fork')
    db.BindDifferent('attack', Param.To, 'attack', Param.To)

    db.BeginBind('block')
    db.BindBetween('occupy', Param.On, 'attack', Param.From, Param.On, Param.To)
    db.BindEqual('occupy', Param.On, 'move', Param.To)
}


function seed_db(m: PositionManager, db: Db, pos: PositionC) {

    let color = m.pos_turn(pos)

    let turn = db.NewColumn('turn')
    db.BeginAddValue(turn)
    db.AddValue(turn, Param.Color, color)
    let opposite = db.NewColumn('opposite')
    db.BeginAddValue(opposite)
    db.AddValue(opposite, Param.Color, color === WHITE ? BLACK : WHITE)

    let attack = db.NewColumn('attack')
    let attack2 = db.NewColumn('attack2')

    let occupy = db.NewColumn('occupy')

    let occupied = m.pos_occupied(pos)
    for (let color of [WHITE, BLACK]) {
        let pieces = m.get_pieces_color_bb(pos, color)

        for (let on of pieces) {

            let piece = m.get_at(pos, on)!

            db.BeginAddValue(occupy)
            db.AddValue(occupy, Param.Role, piece_c_type_of(piece))
            db.AddValue(occupy, Param.Color, color)
            db.AddValue(occupy, Param.On, on)

            let aa = m.attacks(piece, on, occupied)

            for (let a of aa) {

                db.BeginAddValue(attack)
                db.AddValue(attack, Param.From, on)
                db.AddValue(attack, Param.To, a)


                let aa2 = m.attacks(piece, a, occupied.without(on))

                for (let a2 of aa2) {
                    db.BeginAddValue(attack2)
                    db.AddValue(attack2, Param.From, on)
                    db.AddValue(attack2, Param.To, a)
                    db.AddValue(attack2, Param.To2, a2)
                }
            }
        }
    }

    return {
        turn,
        opposite,
        attack,
        attack2,
        occupy
    }
}

import { between } from "../attacks"
import { BLACK, KING, move_c_to_Move, piece_c_type_of, PositionC, PositionManager, WHITE } from "../hopefox_c"

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


'binding block'; 'bind equal a p b q'
'set equal a b J'


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


    JoinBinds() {

        if (this.equal_bind_header) {
            let [a, p, b, q] = this.equal_bind_header
            let [E_start, E_end, E_Inc] = this.GetEqualBindIteration()

            for (let e = E_start; e < E_end; e += E_Inc) {
                let [a_index, b_index, J] = this.GetEqualBind(e)
                if (J === 0) {
                    continue
                }

                if (this.different_bind_header) {
                    this.SetEqualBindJ(e, 0)
                    let [a2, p2, b2, q2] = this.different_bind_header
                    let [D_start, D_end, D_Inc] = this.GetDifferentBindIteration()

                    for (let d = D_start; d < D_end; d += D_Inc) {
                        let [a2_index, b2_index, J2] = this.GetDifferentBind(d)
                        if (J2 === 0) {
                            continue
                        }

                        let intersect =
                            (a === a2 && a_index === a2_index)
                            || (a2 === b && a2_index === b_index)
                            || (a === b2 && a_index === b2_index)
                            || (b2 === b && b2_index === b_index)

                        if (intersect) {
                            this.SetDifferentBindJ(e, 1)
                            break
                        }
                    }
                }
            }
        }


        if (this.different_bind_header) {
            let [a, p, b, q] = this.different_bind_header
        }

        if (this.between_bind_header) {
            let [a, p, b, from, on, to] = this.between_bind_header
        }

        if (this.const_bind_header) {
            let [a, p] = this.const_bind_header
        }



        if (this.between_bind_header) {

            let [a, p, b, from, on, to] = this.between_bind_header


            if (from === Param.From || to === Param.To) {

                let [B_start, B_end, B_Inc] = this.GetBetweenBindIteration()

                for (let b = B_start; b < B_end; b += B_Inc) {
                    let [a_index, b_index, J] = this.GetBetweenBind(b)
                    if (J === 0) {
                        continue
                    }


                    this.BeginAddValue(this.bind_column)
                    if (from === Param.From) {
                        this.AddValue(this.bind_column, Param.From, from)
                    }
                    if (to === Param.To) {
                        this.AddValue(this.bind_column, Param.To, to)
                    }
                }

            }

        }
    }


    GetEqualBindIteration(): [Index, Index, Index] {
        let begin =  Db.Nb_EqualBindsSize * Db.Nb_BindEqualParamSize + Db.Nb_BindEqualParamSize
        let end = this.equal_bind_tape[Db.Nb_EqualBindsSize * Db.Nb_BindEqualParamSize]
        return [begin, end, Db.Nb_BindEqualParamSize]
    }
    GetEqualBind(o: any): [Column, Column, number] {
        return [
            this.equal_bind_tape[o],
            this.equal_bind_tape[o + 1],
            this.equal_bind_tape[o + 2],
        ]
    }
    SetEqualBindJ(o: any, J: number) {
        this.equal_bind_tape[o + 2] = J
    }

    GetDifferentBindIteration(): [Index, Index, Index] {
        let begin =  Db.Nb_EqualBindsSize * Db.Nb_BindEqualParamSize + Db.Nb_BindEqualParamSize
        let end = this.different_bind_tape[Db.Nb_EqualBindsSize * Db.Nb_BindEqualParamSize]
        return [begin, end, Db.Nb_BindEqualParamSize]
    }

    GetDifferentBind(o: any): [Index, Index, Index] {
        return [
            this.different_bind_tape[o],
            this.different_bind_tape[o + 1],
            this.different_bind_tape[o + 2],
        ]
    }

    SetDifferentBindJ(o: any, J: number) {
        this.different_bind_tape[o + 2] = J
    }

    GetBetweenBind(o: any): [Column, Column, number] {
        return [
            this.between_bind_tape[o],
            this.between_bind_tape[o + 1],
            this.between_bind_tape[o + 2],
        ]
    }

    GetBetweenBindIteration(): [any, any, any] {
        let begin =  Db.Nb_EqualBindsSize * Db.Nb_BindEqualParamSize + Db.Nb_BindEqualParamSize
        let end = this.between_bind_tape[Db.Nb_EqualBindsSize * Db.Nb_BindEqualParamSize]
        return [begin, end, Db.Nb_BindEqualParamSize]
    }


    static Nb_Max_Columns = 300


    bind_column: Column
    equal_bind_header?: [Column, Param, Column, Param]
    different_bind_header?: [Column, Param, Column, Param]
    between_bind_header?: [Column, Param, Column, Param, Param, Param]
    const_bind_header?: [Column, Param]

    static Nb_BindEqualParamSize = 4
    static Nb_EqualBindsSize = 100000

    equal_bind_tape: Int32Array = new Int32Array(Db.Nb_EqualBindsSize * Db.Nb_BindEqualParamSize)
    different_bind_tape: Int32Array = new Int32Array(Db.Nb_EqualBindsSize * Db.Nb_BindEqualParamSize)
    between_bind_tape: Int32Array = new Int32Array(Db.Nb_EqualBindsSize * Db.Nb_BindEqualParamSize)
    const_bind_tape: Int32Array = new Int32Array(Db.Nb_EqualBindsSize * Db.Nb_BindEqualParamSize)
    
    BeginSetBinding(column: Column) {
        this.bind_column = column
        this.equal_bind_header = undefined
    }

    BeginEqual(a: Column, p: Param, b: Column, q: Param) {
        this.equal_bind_header = [a, p, b, q]
    }

    SetEqual(a: Index, b: Index) {
        let cursor = 
            this.equal_bind_tape[Db.Nb_BindEqualParamSize * Db.Nb_EqualBindsSize]
            this.equal_bind_tape[Db.Nb_BindEqualParamSize * Db.Nb_EqualBindsSize] = cursor + Db.Nb_BindEqualParamSize

        this.equal_bind_tape[Db.Nb_EqualBindsSize * Db.Nb_BindEqualParamSize + cursor + 0] = a
        this.equal_bind_tape[Db.Nb_EqualBindsSize * Db.Nb_BindEqualParamSize + cursor + 1] = b
        this.equal_bind_tape[Db.Nb_EqualBindsSize * Db.Nb_BindEqualParamSize + cursor + 2] = 1
    }

    BeginDifferent(a: Column, p: Param, b: Column, q: Param) {
        this.different_bind_header = [a, p, b, q]
    }
    SetDifferent(a: Index, b: Index) {
        let cursor = 
            this.different_bind_tape[Db.Nb_BindEqualParamSize * Db.Nb_EqualBindsSize]
            this.different_bind_tape[Db.Nb_BindEqualParamSize * Db.Nb_EqualBindsSize] = cursor + Db.Nb_BindEqualParamSize

        this.different_bind_tape[Db.Nb_EqualBindsSize * Db.Nb_BindEqualParamSize + cursor + 0] = a
        this.different_bind_tape[Db.Nb_EqualBindsSize * Db.Nb_BindEqualParamSize + cursor + 1] = b
        this.different_bind_tape[Db.Nb_EqualBindsSize * Db.Nb_BindEqualParamSize + cursor + 2] = 1
    }

    BeginBetween(a: Column, p: Param, b: Column, from: Param, on: Param, to: Param) {
        this.between_bind_header = [a, p, b, from, on, to]
    }


    SetBetween(a: Index, b: Index) {
        let cursor = 
            this.between_bind_tape[Db.Nb_BindEqualParamSize * Db.Nb_EqualBindsSize]
            this.between_bind_tape[Db.Nb_BindEqualParamSize * Db.Nb_EqualBindsSize] = cursor + Db.Nb_BindEqualParamSize

        this.between_bind_tape[Db.Nb_EqualBindsSize * Db.Nb_BindEqualParamSize + cursor + 0] = a
        this.between_bind_tape[Db.Nb_EqualBindsSize * Db.Nb_BindEqualParamSize + cursor + 1] = b
        this.between_bind_tape[Db.Nb_EqualBindsSize * Db.Nb_BindEqualParamSize + cursor + 2] = 1
    }

    BeginConst(a: Column, p: Param) {
        this.const_bind_header = [a, p]
    }

    SetConst(a: Index) {
        let cursor = 
            this.equal_bind_tape[Db.Nb_BindEqualParamSize * Db.Nb_EqualBindsSize]
            this.equal_bind_tape[Db.Nb_BindEqualParamSize * Db.Nb_EqualBindsSize] = cursor + Db.Nb_BindEqualParamSize

        this.equal_bind_tape[Db.Nb_EqualBindsSize * Db.Nb_BindEqualParamSize + cursor + 0] = a
        this.equal_bind_tape[Db.Nb_EqualBindsSize * Db.Nb_BindEqualParamSize + cursor + 1] = 1
    }


    /** Beta */
    static Nb_ColumnSize = 1000000
    static Nb_ParamSize = 10
    tape: Int32Array = new Int32Array(Db.Nb_Max_Columns * Db.Nb_ColumnSize * Db.Nb_ParamSize).fill(0)

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


    let l = m.get_legal_moves(pos)

    let move = db.NewColumn('move')
    for (let m of l) {

        let { from, to } = move_c_to_Move(m)

        db.BeginAddValue(move)

        db.AddValue(move, Param.From, from)
        db.AddValue(move, Param.To, to)
    }


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
}

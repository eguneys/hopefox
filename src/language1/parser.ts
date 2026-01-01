import { BLACK, KING, piece_c_type_of, PositionC, PositionManager, WHITE } from "../hopefox_c"

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

type ColumnName = string

class Db {

    column_index: number
    column_map: Map<Column, ColumnName>
    column_by_name: Map<ColumnName, Column>

    constructor() {
        this.column_index = 0
        this.column_map = new Map()
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

    AddRow(col: Column, param: Param, value: Value) {
    }

    SetBinding(col_a: Column, col_b: Column, param: Param) {
    }
}

function run_db(db: Db) {

}


type Binding = {
    a: ColumnName
    b: ColumnName
    param: Param
}

function bind_db(db: Db, bindings: Binding[]) {
    for (let bind of bindings) {
        let a = db.NewColumn(bind.a)
        let b = db.NewColumn(bind.b)
        db.SetBinding(a, b, bind.param)
    }
}

function seed_db(m: PositionManager, db: Db, pos: PositionC) {

    let color = m.pos_turn(pos)

    let turn = db.NewColumn('turn')
    db.SetValue(turn, Param.Color, color)
    let opposite = db.NewColumn('opposite')
    db.SetValue(opposite, Param.Color, color === WHITE ? BLACK : WHITE)

    let attack = db.NewColumn('attack')
    let attack2 = db.NewColumn('attack2')

    let occupy = db.NewColumn('occupy')

    let occupied = m.pos_occupied(pos)
    for (let color of [WHITE, BLACK]) {
        let pieces = m.get_pieces_color_bb(pos, color)

        for (let on of pieces) {

            let piece = m.get_at(pos, on)!

            db.SetValue(occupy, Param.Role, piece_c_type_of(piece))
            db.SetValue(occupy, Param.Color, color)
            db.SetValue(occupy, Param.On, on)

            let aa = m.attacks(piece, on, occupied)

            for (let a of aa) {

                db.SetValue(attack, Param.From, on)
                db.SetValue(attack, Param.To, a)


                let aa2 = m.attacks(piece, a, occupied.without(on))

                for (let a2 of aa2) {
                    db.SetValue(attack2, Param.From, on)
                    db.SetValue(attack2, Param.To, a)
                    db.SetValue(attack, Param.To2, a2)
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

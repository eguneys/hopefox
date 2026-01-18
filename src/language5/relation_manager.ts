import { ColorC, PieceTypeC } from "../distill/hopefox_c"
import { Square } from "../distill/types"

type WorldId = number
export type RowId = number


export type BaseRow = {
    start_world_id: WorldId
    end_world_id: WorldId
}

export type Legals = BaseRow & {
    from: Square
    to: Square
}
export type Attacks = BaseRow & {
    from: Square
    to: Square
}
export type Attacks2 = BaseRow & {
    from: Square
    to: Square
    to2: Square
}
export type Occupies = BaseRow & {
    on: Square
    piece: PieceTypeC
    color: ColorC
}

export type Captures = BaseRow & {
    from: Square
    to: Square
}
export type Checks = BaseRow & {
    from: Square
    to: Square
    to2: Square
}

export type Forks = BaseRow & {
    from: Square
    to: Square
    a: Square
    b: Square
}

export type Evades = BaseRow & {
    from: Square
    to: Square
}

type Row =
    | Legals
    | Attacks
    | Attacks2
    | Occupies
    | Captures
    | Checks
    | Forks
    | Evades


export type Column = 
    | 'legals'
    | 'attacks'
    | 'attacks2'
    | 'occupies'
    | 'captures'
    | 'checks'
    | 'forks'
    | 'evades'


type Relation<R extends Row> = { rows: R[] }

export class RelationManager<R extends Row> {
    base: Relation<R>
    name: Column
    private index_start_world: Map<WorldId, RowId[]>

    private key_index: Map<number, RowId>

    constructor(name: Column) {
        this.base = { rows: [] }
        this.name = name
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


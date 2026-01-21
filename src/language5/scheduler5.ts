import { between } from "../distill/attacks"
import { BISHOP, ColorC, KING, KNIGHT, make_move_from_to, move_c_to_Move, MoveC, PAWN, piece_c_color_of, piece_c_type_of, PieceTypeC, PositionC, PositionManager, QUEEN, ROOK } from "../distill/hopefox_c"
import { SquareSet } from "../distill/squareSet"
import { Square } from "../distill/types"
import { NodeId, NodeManager } from "../language1/node_manager"
import { san_moves_c } from "../language2/san_moves_helper"
import { Constants, Definition, DotedPath, Field, is_column, is_columns, is_const_match, MoveListRight, parse_defs6 } from "./parser5"
import { concat, join, LookupFilter, mergeRows, project, Relation, RelationManager, Row, RowId, select, semiJoin } from "./relation_manager"

enum MaterializeState {
    Materializing,
    Complete
}

type Column = string

export class Rs {

    nodes: NodeManager
    m: PositionManager
    pos: PositionC

    relations: Map<Column, StatefulRelationManager>

    constructor(m: PositionManager, pos: PositionC) {
        this.m = m
        this.pos = pos
        this.nodes = new NodeManager()

        this.relations = new Map()

        this.set_relation('legals', materialize_legals)
        this.set_relation('attacks', materialize_attacks)
        this.set_relation('occupies', materialize_occupies)
    }

    set_relation(column: Column, fn: MaterializeFn) {
        this.relations.set(column, new StatefulRelationManager(this, fn))
    }

    add_row(column: Column, row: Row) {
        return this.relation(column).add_row(row)
    }

    private relation(column: Column) {
        return this.relations.get(column)!
    }

    get_row_by_row_id(column: Column, row_id: RowId) {
        return this.relation(column).get_row_by_row_id(row_id)
    }

    get_or_wait(column: Column, world_id: WorldId) {
        return this.relation(column).get(world_id)
    }

    lookupRows(column: Column, world_id: WorldId, filters: LookupFilter[]) {
        return this.relation(column).lookupRows(world_id, filters)
    }

    run() {
        let there_is_more
        do  {
            there_is_more = false
            for (let R of this.relations) {
                there_is_more = R[1].step() || there_is_more
            }
        } while (there_is_more)
    }

    expand_legal_worlds(expand: Column, world_id: WorldId): Relation | false {
        let r = this.relation(expand).get(world_id)
        if (!r) {
            return false
        }

        let legals = this.relation('legals').get(world_id)
        if (!legals) {
            return false
        }

        return semiJoin(legals, r, (a, b) => a.get('from') === b.get('from') && a.get('to') === b.get('to'))

    }

    make_moves_to_world(world_id: WorldId) {
        let history = this.nodes.history_moves(world_id)
        for (let move of history) {
            this.m.make_move(this.pos, move)
        }
    }

    unmake_moves_to_base(world_id: WorldId) {
        let history = this.nodes.history_moves(world_id)
        for (let i = history.length - 1; i >= 0; i--) {
            let move = history[i]
            this.m.unmake_move(this.pos, move)
        }
    }
}

type MaterializeFn = (world_id: WorldId, r: Rs) => boolean
export type WorldId = NodeId

export class StatefulRelationManager {

    private states: Map<WorldId, MaterializeState>
    private relation: RelationManager

    private fn: MaterializeFn
    private Rs: Rs

    private nb_used: number

    constructor(Rs: Rs, fn: MaterializeFn) {
        this.relation = new RelationManager()
        this.states = new Map()
        this.fn = fn
        this.Rs = Rs

        this.nb_used = 0
    }

    get(world_id: WorldId) {
        let state = this.states.get(world_id)
        if (state === MaterializeState.Complete) {
            this.nb_used++
            return this.relation.get_relation_starting_at_world_id(world_id)
        }
        if (state === undefined) {
            this.states.set(world_id, MaterializeState.Materializing)
        }
    }

    get_row_by_row_id(row_id: number) {
        return this.relation.get_row(row_id)
    }

    add_row(row: Row) {
        this.relation.add_row(row)
    }

    lookupRows(world_id: WorldId, filters: LookupFilter[]) {
        return this.relation.lookupRows(world_id, filters)
    }

    step() {
        let there_is_more = false

        for (let [world_id, state] of this.states) {
            if (state === MaterializeState.Materializing) {
                let complete = this.fn(world_id, this.Rs)
                if (complete) {
                    this.states.set(world_id, MaterializeState.Complete)
                } else {
                    there_is_more = true
                }
            }
        }
        return there_is_more
    }
}

function materialize_legals(world_id: WorldId, Rs: Rs): boolean {
    Rs.make_moves_to_world(world_id)

    for (let move of Rs.m.get_legal_moves(Rs.pos)) {
        let { from, to } = move_c_to_Move(move)
        let end_world_id = Rs.nodes.add_move(world_id, move)
        Rs.add_row('legals', new Map([
            ['start_world_id', world_id],
            ['end_world_id', end_world_id],
            ['from', from],
            ['to', to]
        ]))
    }

    Rs.unmake_moves_to_base(world_id)
    return true
}

const FullSquares = SquareSet.full()
function materialize_attacks(world_id: WorldId, Rs: Rs): boolean {
    Rs.make_moves_to_world(world_id)

    let end_world_id = world_id
    for (let on of FullSquares) {
        let piece = Rs.m.get_at(Rs.pos, on)
        if (piece) {
            let aa = Rs.m.pos_attacks(Rs.pos, on)
            for (let a of aa) {
                Rs.add_row('attacks', new Map([
                    ['start_world_id', world_id],
                    ['end_world_id', end_world_id],
                    ['from', on],
                    ['to', a]
                ]))
            }
        }
    }

    Rs.unmake_moves_to_base(world_id)
    return true
}

function materialize_occupies(world_id: WorldId, Rs: Rs): boolean {
    Rs.make_moves_to_world(world_id)

    let end_world_id = world_id
    for (let on of FullSquares) {
        let piece = Rs.m.get_at(Rs.pos, on)
        if (piece) {
            Rs.add_row('occupies', new Map([
                ['start_world_id', world_id],
                ['end_world_id', end_world_id],
                ['on', on],
                ['piece', piece_c_type_of(piece)],
                ['color', piece_c_color_of(piece)]
            ]))
        }
    }

    Rs.unmake_moves_to_base(world_id)
    return true
}



export function extract_moves(relation: Relation) {
    return relation.rows.map(_ => make_move_from_to(_.get('from')!, _.get('to')!))
}

export function extract_sans(m: PositionManager, pos: PositionC, relation: Relation) {
    return extract_moves(relation).map(_ => san_moves_c(m, pos, [_]))
}


export function Search(m: PositionManager, pos: PositionC, rules: string) {
    let dd = parse_defs6(rules)

    let rs = new Rs(m, pos)

    let ii = []
    for (let d of dd) {
        if (d.fact) {
            set_materialize_f(rs, d)
        } else if (d.idea) {
            set_materialize_i(rs, d)
        } else {

            ii.push(materialize_d(d))
        }
    }

    let res = []
    for (let mFn of ii) {
        let r = mFn(0, rs)
        while (!r) {
            rs.run()
            r = mFn(0, rs)
        }
        res.push(r)
    }
    return res
}

type Binding = Map<Column, Row>


type RelationCompound = MoveListRight

type RawSourceAliasRelation = { expand?: Column, column: Column, relation: RelationCompound }

type JoinColumnField = { expand?: Column, column: Column, field: string }

type OutputExpr = { column: Column, expr: JoinColumnField }

type Join = NormalJoin | ConstJoin
type NormalJoin = { left: JoinColumnField, right: JoinColumnField, is_different: boolean } 
type ConstJoin = { left: JoinColumnField, right_as_const: Constants, is_different: boolean }


function is_const_join(_: Join): _ is ConstJoin  {
    return (_ as ConstJoin).right_as_const !== undefined
}

type BetweenJoin = { left: JoinColumnField, right: JoinColumnField, right2: JoinColumnField, is_different: boolean }

type FactPlan = {
    name: Column
    raw_sources: RawSourceAliasRelation[]
    joins: Join[]
    between_joins: BetweenJoin[]

    output: OutputExpr[]
}

function convert_to_plan(d: Definition) {

    let raw_sources: RawSourceAliasRelation[] = []
    let joins: Join[] = []
    let output: OutputExpr[] = []
    let between_joins: BetweenJoin[] = []

    for (let alias of d.alias) {
        raw_sources.push({ column: alias.left, relation: alias.right })
    }

    for (let m of d.matches) {

        let left = dotted_path_join_column_path(m.left)
        if (left.expand) {
            if (!raw_sources.find(_ => _.expand === left.expand && _.column === left.column)) {
                raw_sources.push({ expand: left.expand, column: left.column, relation: { type: 'single', a: m.left } })
            }
        } else {
            if (!raw_sources.find(_ => _.column === left.column)) {
                raw_sources.push({ column: left.column, relation: { type: 'single', a: m.left } })
            }
        }

        if (is_const_match(m)) {
            joins.push({
                left,
                right_as_const: m.const,
                is_different: false
            })

            continue
        }

        let right = dotted_path_join_column_path(m.right)
        if (right.expand) {
            if (!raw_sources.find(_ => _.expand === right.expand && _.column === right.column)) {
                raw_sources.push({ expand: right.expand, column: right.column, relation: { type: 'single', a: m.right } })
            }
        } else {
            if (!raw_sources.find(_ => _.column === right.column)) {
                raw_sources.push({ column: right.column, relation: { type: 'single', a: m.right } })
            }
        }


        let is_different = m.is_different === true

        if (m.right2 !== undefined) {
            let right2 = dotted_path_join_column_path(m.right2)

            if (!raw_sources.find(_ => _.column === right2.column)) {
                raw_sources.push({ column: right2.column, relation: { type: 'single', a: m.right2 } })
            }



            between_joins.push({
                left,
                right,
                right2,
                is_different
            })
            continue
        }


        joins.push({
            left,
            right,
            is_different
        })
    }

    for (let assign of d.assigns) {
        output.push({ column: assign.left.field, expr: dotted_path_join_column_path(assign.right) })
    }

    let plan: FactPlan = {
        name: d.fact ?? d.idea!,
        raw_sources,
        joins,
        between_joins,
        output
    }

    return plan
}

const emitRow = (plan: FactPlan, Rs: Rs, binding: Binding, output: OutputExpr[], world_id: WorldId) => {
    let row = new Map()
    for (let { column, expr } of output) {
        row.set(column, binding.get(expr.column)?.get(expr.field))
    }
    row.set('start_world_id', world_id)
    Rs.add_row(plan.name, row)
}



function joinsSatisfiedSoFar(binding: Binding,
    joins: Join[],
    between_joins: BetweenJoin[],
) {
    for (const join of between_joins) {
        const l = binding.get(join.left.column)
        const r = binding.get(join.right.column)
        const r2 = binding.get(join.right2.column)
        if (l === undefined || r === undefined || r2 === undefined) {
            continue
        }
        let ray = between(r.get(join.right.field)!, r2.get(join.right2.field)!)
        if (join.is_different) {
            if (ray.has(l.get(join.left.field)!)) {
                return false
            }
        } else {
            if (!ray.has(l.get(join.left.field)!)) {
                return false
            }
        }
    }


    for (const join of joins) {
        let join_left_alias = join.left.expand ? `${join.left.expand}.${join.left.column}` : join.left.column
        const l = binding.get(join_left_alias)
        if (l === undefined) {
            continue
        }
        if (is_const_join(join)) {
            if (l.get(join.left.field) !== Constants_by_name[join.right_as_const]) {
                return false
            }
            continue
        }

        let join_right_alias = join.right.expand ? `${join.right.expand}.${join.right.column}` : join.right.column
        const r = binding.get(join_right_alias)
        if (r === undefined) {
            continue
        }
        if (join.is_different) {
            if (l.get(join.left.field) === r.get(join.right.field)) {
                return false

            }
        } else {
            if (l.get(join.left.field) !== r.get(join.right.field)) {
                return false
            }
        }
    }
    return true
}



function getRows(Rs: Rs, source_alias: Column, joins: Join[], world_id: WorldId, binding: Binding) {
    const filters: LookupFilter[] = []

    for (const j of joins) {
        if (is_const_join(j)) {
            if (j.left.column === source_alias) {
                filters.push({
                    field: j.left.field,
                    value: Constants_by_name[j.right_as_const]
                })
            }
        } else {
            if (j.left.column === source_alias && binding.has(j.right.column)) {
                filters.push({
                    field: j.left.field,
                    value: binding.get(j.right.column)!.get(j.right.field)!,
                    is_different: j.is_different
                })
            }

            if (j.right.column === source_alias && binding.has(j.left.column)) {
                filters.push({
                    field: j.right.field,
                    value: binding.get(j.left.column)!.get(j.left.field)!,
                    is_different: j.is_different
                })
            }
        }
    }

    return Rs.lookupRows(source_alias, world_id, filters)
}

function extend(Rs: Rs, world_id: WorldId, plan: FactPlan, binding: Binding, sourceIndex: number) {
    let sources = plan.raw_sources
    if (sourceIndex === sources.length) {
        emitRow(plan, Rs, binding, plan.output, world_id)
        return
    }

    const source = sources[sourceIndex]
    const rows = getRows(Rs, source.column, plan.joins, world_id, binding)
    for (const row_id of rows) {
        let row = Rs.get_row_by_row_id(source.column, row_id)
        binding.set(source.column, row)


        if (joinsSatisfiedSoFar(binding, plan.joins, plan.between_joins)) {
            extend(Rs, world_id, plan, binding, sourceIndex + 1)
        }

        binding.delete(source.column)
    }
}



function set_materialize_f(Rs: Rs, d: Definition) {

    let plan = convert_to_plan(d)

    let fn = (world_id: WorldId, r: Rs) => {
        for (let i = 0; i < plan.raw_sources.length; i++) {
            let source = plan.raw_sources[i]
            let relation = source.relation

            let res = Rs.get_or_wait(source.column, world_id)
            if (!res) {
                return false
            }
        }

        extend(Rs, world_id, plan, new Map(), 0)
        return true
    }

    Rs.set_relation(d.fact!, fn)
}

function set_materialize_i(Rs: Rs, d: Definition) {

    let plan = convert_to_plan(d)
    let moves = d.moves


    let fn = (world_id: WorldId, r: Rs) => {
        //extend(new Map(), 0)
        return true
    }

    Rs.set_relation(d.idea!, fn)
}

function materialize_d(d: Definition): (world_id: WorldId, Rs: Rs) => RelationManager | undefined {
    return (world_id: WorldId, Rs: Rs) => {
        let res: RelationManager | false = false
        for (let move of d.moves) {
            let right = move.right

            //res = workout_movelist_relation(Rs, [], right, world_id, false)
        }

        if (!res) {
            return undefined
        }
        return res
    }

}

const Constants_by_name = {
    King: KING,
    Queen: QUEEN,
    Rook: ROOK,
    Bishop: BISHOP,
    Knight: KNIGHT,
    Pawn: PAWN,
}


const dotted_path_join_column_path = (d: DotedPath): JoinColumnField => {
    if (is_columns(d)) {
        return { expand: d.columns[d.columns.length - 2], column: d.columns[d.columns.length - 1], field: d.field }
    }
    if (is_column(d)) {
        return { column: d.column, field: d.field }
    }
    else {
        return { column: d.field, field: d.field }
    }
}
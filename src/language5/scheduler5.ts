import { between } from "../distill/attacks"
import { BISHOP, ColorC, KING, KNIGHT, make_move_from_to, move_c_to_Move, MoveC, PAWN, piece_c_color_of, piece_c_type_of, PieceTypeC, PositionC, PositionManager, QUEEN, ROOK } from "../distill/hopefox_c"
import { SquareSet } from "../distill/squareSet"
import { Square } from "../distill/types"
import { NodeId, NodeManager } from "../language1/node_manager"
import { san_moves_c } from "../language2/san_moves_helper"
import { Constants, Definition, DotedPath, Field, is_column, is_columns, is_const_match, MoveListRight, parse_defs6 } from "./parser5"
import { concat, join, LookupFilter, mergeRows, project, Relation, RelationManager, Row, select, semiJoin } from "./relation_manager"

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

    relation(column: Column) {
        return this.relations.get(column)!
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
    public states: Map<WorldId, MaterializeState>
    public relation: RelationManager

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
        Rs.relation('legals').relation.add_row(new Map([
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
                Rs.relation('attacks').relation.add_row(new Map([
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
            Rs.relation('occupies').relation.add_row(new Map([
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

type RawSourceAliasRelation = { alias: Column, relation: RelationCompound, expand_legalize?: true }

type JoinColumnField = { expand?: Column, column: Column, field: string }

type OutputExpr = { column: Column, expr: JoinColumnField }

type Join = NormalJoin | ConstJoin
type NormalJoin = { left: JoinColumnField, right: JoinColumnField, is_different: boolean } 
type ConstJoin = { left: JoinColumnField, right_as_const: Constants, is_different: boolean }


function is_const_join(_: Join): _ is ConstJoin  {
    return (_ as ConstJoin).right_as_const !== undefined
}

type BetweenJoin = { left: JoinColumnField, right: JoinColumnField, right2: JoinColumnField, is_different: boolean }

type Source = { alias: Column, relation: RelationManager }

type FactPlan = {
    name: Column
    raw_sources: RawSourceAliasRelation[]
    sources: Source[]
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
        raw_sources.push({ alias: alias.left, relation: alias.right })
    }

    for (let m of d.matches) {

        let left = dotted_path_join_column_path(m.left)
        if (left.expand) {
            let alias = `${left.expand}.${left.column}`
            if (!raw_sources.find(_ => _.alias === alias)) {
                raw_sources.push({ alias, relation: { type: 'single', a: m.left } })
            }
        } else {
            if (!raw_sources.find(_ => _.alias === left.column)) {
                raw_sources.push({ alias: left.column, relation: { type: 'single', a: m.left } })
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
            let alias = `${right.expand}.${right.column}`
            if (!raw_sources.find(_ => _.alias === alias)) {
                raw_sources.push({ alias, relation: { type: 'single', a: m.right } })
            }
        } else {
            if (!raw_sources.find(_ => _.alias === right.column)) {
                raw_sources.push({ alias: right.column, relation: { type: 'single', a: m.right } })
            }
        }



        let is_different = m.is_different === true

        if (m.right2 !== undefined) {
            let right2 = dotted_path_join_column_path(m.right2)

            if (!raw_sources.find(_ => _.alias === right2.column)) {
                raw_sources.push({ alias: right2.column, relation: { type: 'single', a: m.right2 } })
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
        sources: [],
        joins,
        between_joins,
        output
    }

    return plan
}

const worklist_check_fact = (Rs: Rs, column: Column, world_id: WorldId) => {
    return Rs.relation(column).get(world_id)
}

const emitRow = (plan: FactPlan, Rs: Rs, binding: Binding, output: OutputExpr[], world_id: WorldId) => {
    let row = new Map()
    for (let { column, expr } of output) {
        row.set(column, binding.get(expr.column)?.get(expr.field))
    }
    row.set('start_world_id', world_id)
    Rs.relation(plan.name).relation.add_row(row)
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




function set_materialize_f(Rs: Rs, d: Definition) {

    let plan = convert_to_plan(d)
    let fn = (world_id: WorldId, Rs: Rs) => {
        const sources = plan.sources
        const raw_sources = plan.raw_sources
        const joins = plan.joins
        const between_joins = plan.between_joins

        function getRows(source: Source, world_id: WorldId, binding: Binding) {
            const filters: LookupFilter[] = []

            for (const j of joins) {

                if (is_const_join(j)) {
                    if (j.left.column === source.alias) {
                        filters.push({
                            field: j.left.field,
                            value: Constants_by_name[j.right_as_const]
                        })
                    }
                } else {
                    if (j.left.column === source.alias && binding.has(j.right.column)) {
                        filters.push({
                            field: j.left.field,
                            value: binding.get(j.right.column)!.get(j.right.field)!,
                            is_different: j.is_different
                        })
                    }

                    if (j.right.column === source.alias && binding.has(j.left.column)) {
                        filters.push({
                            field: j.right.field,
                            value: binding.get(j.left.column)!.get(j.left.field)!,
                            is_different: j.is_different
                        })
                    }
                }
            }

            return source.relation.lookupRows(world_id, filters)
        }

        function extend(binding: Binding, sourceIndex: number) {
            if (sourceIndex === sources.length) {
                emitRow(plan, Rs, binding, plan.output, world_id)
                return
            }

            const source = sources[sourceIndex]
            const rows = getRows(source, world_id, binding)
            for (const row_id of rows) {
                let row = source.relation.get_row(row_id)
                binding.set(source.alias, row)


                if (joinsSatisfiedSoFar(binding, joins, between_joins)) {
                    extend(binding, sourceIndex + 1)
                }

                binding.delete(source.alias)
            }
        }

        for (let i = 0; i < raw_sources.length; i++) {
            if (plan.sources[i] !== undefined) {
                continue
            }
            let relation = workout_movelist_relation(Rs, sources, raw_sources[i].relation, world_id, raw_sources[i].expand_legalize === true)
            if (!relation) {
                return false
            }
            
            plan.sources[i] = { alias: raw_sources[i].alias, relation }
        }

        extend(new Map(), 0)

        

        return true
    }

    Rs.set_relation(plan.name, fn)
}



function set_materialize_i(Rs: Rs, d: Definition) {

    let plan = convert_to_plan(d)

    let moves = d.moves


    for (let move of moves) {
        if (move.left) {
            let alias = move.left.field
            let i = plan.raw_sources.findIndex(_ => _.alias === alias)
            if (i !== -1) {
                plan.raw_sources.splice(i, 1)
            }
            plan.raw_sources.unshift({ alias: move.left.field, relation: move.right, expand_legalize: true })
        } else {
            plan.raw_sources.unshift({ alias: plan.name, relation: move.right, expand_legalize: true })
        }
    }



    let fn = (world_id: WorldId, r: Rs) => {
        const sources = plan.sources
        const raw_sources = plan.raw_sources
        const joins = plan.joins
        const between_joins = plan.between_joins

        function getRows(source: Source, world_id: WorldId, binding: Binding) {
            const filters: LookupFilter[] = []

            for (const j of joins) {

                if (is_const_join(j)) {
                    if (j.left.column === source.alias) {
                        filters.push({
                            field: j.left.field,
                            value: Constants_by_name[j.right_as_const]
                        })
                    }
                } else {
                    if (j.left.column === source.alias && binding.has(j.right.column)) {
                        filters.push({
                            field: j.left.field,
                            value: binding.get(j.right.column)!.get(j.right.field)!,
                            is_different: j.is_different
                        })
                    }

                    if (j.right.column === source.alias && binding.has(j.left.column)) {
                        filters.push({
                            field: j.right.field,
                            value: binding.get(j.left.column)!.get(j.left.field)!,
                            is_different: j.is_different
                        })
                    }
                }
            }

            return source.relation.lookupRows(world_id, filters)
        }

        function extend(binding: Binding, sourceIndex: number) {
            if (sourceIndex === sources.length) {
                emitRow(plan, Rs, binding, plan.output, world_id)
                return
            }

            const source = sources[sourceIndex]
            const rows = getRows(source, world_id, binding)
            for (const row_id of rows) {
                let row = source.relation.get_row(row_id)
                binding.set(source.alias, row)


                if (joinsSatisfiedSoFar(binding, joins, between_joins)) {
                    extend(binding, sourceIndex + 1)
                }

                binding.delete(source.alias)
            }
        }


        for (let i = 0; i < raw_sources.length; i++) {
            if (plan.sources[i] !== undefined) {
                continue
            }
            let relation = workout_movelist_relation(Rs, sources, raw_sources[i].relation, world_id, raw_sources[i].expand_legalize === true)
            if (!relation) {
                return false
            }
            
            plan.sources[i] = { alias: raw_sources[i].alias, relation }
        }

        extend(new Map(), 0)

        

        return true
    }

    Rs.set_relation(d.idea!, fn)
}


function materialize_d(d: Definition): (world_id: WorldId, Rs: Rs) => RelationManager | undefined {
    return (world_id: WorldId, Rs: Rs) => {
        let res: RelationManager | false = false
        for (let move of d.moves) {
            let right = move.right

            res = workout_movelist_relation(Rs, [], right, world_id, false)
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



const workout_movelist_relation = (Rs: Rs, sources: Source[], movelist: MoveListRight, world_id: WorldId, expand_legalize: boolean): RelationManager | false => {

    let res = new RelationManager()
    switch (movelist.type) {
        case 'and': break
        case 'or': break
        case 'minus': break
        case 'single':
            let dd = dotted_path_join_column_path(movelist.a)
            let column = dd.column

            if (expand_legalize) {
                let rr = Rs.expand_legal_worlds(column, world_id)
                if (rr === false) {
                    return false
                }

                res.add_rows(world_id, rr.rows)
                break
            }

            let ww = [world_id]
            let ee
            if (dd.expand) {
                let expand_from_source = sources.find(_ => _.alias === dd.expand)
                if (expand_from_source) {
                    ee = expand_from_source.relation.get_relation_starting_at_world_id(world_id)
                } else {
                    ee = Rs.expand_legal_worlds(dd.expand, world_id)
                    if (ee === false) {
                        return false
                    }
                }

                ww = ee.rows.map(_ => _.get('end_world_id')!)
            }

            for (let w of ww) {
                if (!Rs.relation(column).get(w)) {
                    return false
                }
            }

            for (let i = 0; i < ww.length; i++) {
                let w = ww[i]
                let r = Rs.relation(column).get(w)!

                if (ee !== undefined) {
                    let e = ee.rows[i]


                    res.add_rows(w, r.rows)
                } else {
                    res.add_rows(w, r.rows)
                }
            }
            break
    }
    return res
}
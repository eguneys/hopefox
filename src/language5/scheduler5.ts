import { between } from "../distill/attacks"
import { BISHOP, ColorC, KING, KNIGHT, make_move_from_to, move_c_to_Move, MoveC, PAWN, piece_c_color_of, piece_c_type_of, PieceTypeC, PositionC, PositionManager, QUEEN, ROOK } from "../distill/hopefox_c"
import { SquareSet } from "../distill/squareSet"
import { Square } from "../distill/types"
import { NodeId, NodeManager } from "../language1/node_manager"
import { san_moves_c } from "../language2/san_moves_helper"
import { Constants, Definition, DotedPath, is_column, is_columns, is_const_match, MoveListRight, parse_defs6 } from "./parser5"
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

    add_rows(world_id: WorldId, column: Column, rows: Row[]) {
        return this.relation(column).add_rows(world_id, rows)
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
        return this.expand_legal_worlds2(r, world_id)
    }

    expand_legal_worlds2(relation: Relation, world_id: WorldId): Relation | false {
        let legals = this.relation('legals').get(world_id)
        if (!legals) {
            return false
        }

        return semiJoin(legals, relation, (a, b) => a.get('from') === b.get('from') && a.get('to') === b.get('to'))

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

    add_rows(world_id: WorldId, rows: Row[]) {
        this.relation.add_rows(world_id, rows)
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

            ii.push(materialize_d(rs, d))
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

type ResolvedDotedPath = { full: string, column: Column, field?: string, source: DotedPath, expand?: Column, left_column_path: string }

type ResolvedMoveListRight = {
    type: 'single'
    a: ResolvedDotedPath
} | {
    type: 'and',
    aa: ResolvedDotedPath[]
} | {
    type: 'or',
    aa: ResolvedDotedPath[]
} | {
    type: 'minus'
    aa: ResolvedDotedPath[]
}

type OutputExpr = { left: ResolvedDotedPath, right: ResolvedDotedPath }

type Join = NormalJoin | ConstJoin
type NormalJoin = { left: ResolvedDotedPath, right: ResolvedDotedPath, is_different: boolean } 
type ConstJoin = { left: ResolvedDotedPath, right_as_const: Constants, is_different: boolean }

type Source = { path: ResolvedDotedPath, relation: ResolvedMoveListRight }

function is_const_join(_: Join): _ is ConstJoin  {
    return (_ as ConstJoin).right_as_const !== undefined
}

type BetweenJoin = { left: ResolvedDotedPath, right: ResolvedDotedPath, right2: ResolvedDotedPath, is_different: boolean }

type PlanMove = { left?: string, right: ResolvedMoveListRight }

type FactPlan = {
    name: Column
    sources: Source[]
    joins: Join[]
    between_joins: BetweenJoin[]
    moves: PlanMove[]
    output: OutputExpr[]
}

function convert_to_plan(d: Definition) {

    let sources: Source[] = []
    let joins: Join[] = []
    let output: OutputExpr[] = []
    let between_joins: BetweenJoin[] = []

    for (let alias of d.alias) {
        sources.push({ path: { full: alias.left, left_column_path: alias.left, column: alias.left, source: { field: alias.left } } , relation: resolve_movelist(alias.right) })
    }

    for (let m of d.matches) {

        let left = resolve_doted_path(m.left)

        if (!sources.find(_ => doted_equals(_.path.source, m.left))) {
            sources.push({ path: left, relation: { type: 'single', a: left } })
        }

        if (is_const_match(m)) {
            joins.push({
                left: resolve_doted_path(m.left),
                right_as_const: m.const,
                is_different: false
            })

            continue
        }

        let right = resolve_doted_path(m.right)

        if (!sources.find(_ => doted_equals(_.path.source, m.right))) {
            sources.push({ path: right, relation: { type: 'single', a: right } })
        }


        let is_different = m.is_different === true

        if (m.right2 !== undefined) {
            let right2 = resolve_doted_path(m.right2)

            if (!sources.find(_ => doted_equals(_.path.source, m.right2!))) {
                sources.push({ path: right2, relation: { type: 'single', a: right2 } })
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
        output.push({ left: resolve_doted_path(assign.left), right: resolve_doted_path(assign.right) })
    }

    let moves: { left?: string, right: ResolvedMoveListRight }[]= []
    for (let move of d.moves) {
        if (move.left) {

            sources.push({ path: resolve_doted_path(move.left), relation: resolve_movelist(move.right) })
        }
        moves.push({
            left: move.left?.field,
            right: resolve_movelist(move.right)
        })
    }

    let plan: FactPlan = {
        name: d.fact ?? d.idea!,
        sources,
        joins,
        between_joins,
        output,
        moves
    }

    return plan
}




/* ** */


type ExpandOp = {
    type: 'expand'
    completed_relation?: Relation
    column_a: Column
    column_b: Column
    world_id: WorldId
    aa?: Row[]
    bb: Relation[]
    i_a: number
    i_b: number
}

type ColumnResolveOp = {
    type: 'column_resolve'
    column: Column,
    world_id: WorldId
    completed_relation?: Relation
}

type LiftLegalsOp = {
    type: 'lift_legals'
    column: ResolvedDotedPath
    world_id: WorldId
    completed_relation?: Relation
}



type Operation = ColumnResolveOp | ExpandOp | LiftLegalsOp

class IR {
    private Rs: Rs

    private aliases: Map<Column, Map<WorldId, Operation>>

    constructor(Rs: Rs) {
        this.Rs = Rs
        this.aliases = new Map()
    }

    step() {
        let there_is_more = false
        for (let v of this.aliases.values()) {
            for (let op of v.values()) {
                if (op.completed_relation === undefined) {
                    this.step_Op(op)
                    there_is_more = true
                }
            }
        }
        return there_is_more
    }




    getRows(source: Source, world_id: WorldId, binding: Binding, joins: Join[]) {
        const filters: LookupFilter[] = []
        let source_alias = source.path.left_column_path

        for (const j of joins) {
            if (is_const_join(j)) {
                if (j.left.column === source_alias) {
                    filters.push({
                        field: j.left.field!,
                        value: Constants_by_name[j.right_as_const]
                    })
                }
            } else {
                if (j.left.column === source_alias && binding.has(j.right.column!)) {
                    filters.push({
                        field: j.left.field!,
                        value: binding.get(j.right.column!)!.get(j.right.field!)!,
                        is_different: j.is_different
                    })
                }

                if (j.right.column === source_alias && binding.has(j.left.column!)) {
                    filters.push({
                        field: j.right.field!,
                        value: binding.get(j.left.column)!.get(j.left.field!)!,
                        is_different: j.is_different
                    })
                }
            }
        }

        //return this.lookupRows(source_alias, world_id, filters)
        return this.Resolve(source_alias, world_id)
    }

    emitRow(binding: Binding, output: OutputExpr[], emitRows: RelationManager) {
        let row = new Map()
        for (let { left, right } of output) {
            row.set(left.column, binding.get(right.column)!.get(right.field!))
        }
        emitRows.add_row(row)
    }

    extendBinding(binding: Binding, sourceIndex: number, sources: Source[], world_id: WorldId, joins: Join[], output: OutputExpr[], emitRows: RelationManager) {
        if (sourceIndex === sources.length) {
            this.emitRow(binding, output, emitRows)
            return
        }

        const source = sources[sourceIndex]
        const { rows } = this.getRows(source, world_id, binding, joins)!

        for (const row of rows) {
            binding.set(source.path.left_column_path, row)


            if (joins.every(join => this.IsJoinSatisfiedSofar(world_id, join, binding))) {
                this.extendBinding(binding, sourceIndex + 1, sources, world_id, joins, output, emitRows)
            }

            binding.delete(source.path.left_column_path)
        }
    }

    private _get_Op(column: Column, world_id: WorldId) {
        let res = this.aliases.get(column)
        if (!res) {
            res = new Map()
            this.aliases.set(column,res) 
        }
        return res.get(world_id)
    }

    private _set_Op(column: Column, world_id: WorldId, op: Operation) {
        let res = this.aliases.get(column)
        if (!res) {
            res = new Map()
            this.aliases.set(column,res) 
        }
        res.set(world_id, op)
    }

    private step_Op(op: Operation) {
        if (op.type === 'expand') {
            this.step_ExpandOp(op)
        }
        if (op.type === 'column_resolve') {
            this.step_ColumnResolveOp(op)
        }
        if (op.type === 'lift_legals') {
            this.step_LiftMovesToLegals(op)
        }
    }

    private resolve_Op(column: Column, world_id: WorldId, op: Operation) {
        let res = this._get_Op(column, world_id)
        if (res === undefined) {
            this._set_Op(column, world_id, op)
            return undefined
        }
        return res.completed_relation
    }

    LiftLegals(alias: Column, column: ResolvedDotedPath, world_id: WorldId) {
        return this.resolve_Op(alias, world_id, { column, world_id, type: 'lift_legals' })
    }

    Resolve(alias: Column, world_id: WorldId) {
        return this.resolve_Op(alias, world_id, { column: alias, world_id, type: 'column_resolve' })
    }


    DotedResolveWithAlias(alias: Column, column: ResolvedDotedPath, world_id: WorldId) {
        if (column.expand) {
            return this.ReResolve(column.column, column.expand, world_id)
        } else {
            return this.resolve_Op(alias, world_id, { column: column.column, world_id, type: 'column_resolve' })
        }
    }



    DotedResolve(column: ResolvedDotedPath, world_id: WorldId) {
        if (column.expand) {
            return this.ReResolve(column.column, column.expand, world_id)
        } else {
            return this.resolve_Op(column.column, world_id, { column: column.column, world_id, type: 'column_resolve' })
        }
    }


    ReResolve(column_a: Column, column_b: Column, world_id: WorldId) {
        let op: ExpandOp = {
            type: 'expand',
            column_a,
            column_b,
            world_id,
            aa: undefined,
            bb: [],
            i_a: 0,
            i_b: 0
        }

        return this.resolve_Op(`${column_a}.${column_b}`, world_id, op)
    }

    IsJoinSatisfiedSofar(world_id: WorldId, join: Join, binding: Binding) {
        if (is_const_join(join)) {
            return this.IsConstraintJoinSatisfiedSofar(world_id, join, binding)
        } else {
            return this.IsEqNormalJoinSatisfiedSofar(world_id, join, binding)
        }
    }

    private IsConstraintJoinSatisfiedSofar(world_id: WorldId, join: ConstJoin, binding: Binding) {
        let a = binding.get(join.left.left_column_path)
        let field_a = join.left.field!

        if (a === undefined) {
            return true
        }

        let value = Constants_by_name[join.right_as_const]
        return (a.get(field_a) === value) === !join.is_different
    }

    private IsEqNormalJoinSatisfiedSofar(world_id: WorldId, join: NormalJoin, binding: Binding) {
        let a = binding.get(join.left.left_column_path)
        let b = binding.get(join.right.left_column_path)
        let field_a = join.left.field!
        let field_b = join.right.field!

        if (a === undefined || b === undefined) {
            return true
        }

        return this.EqConstraint(a, b, field_a, field_b, join.is_different)
    }

    private EqConstraint(left: Row, right: Row, field_a: string, field_b: string, is_different: Boolean) {
        if (is_different) {
            return left.get(field_a) !== right.get(field_b)
        } else {
            return left.get(field_a) === right.get(field_b)
        }
    }

    private step_LiftMovesToLegals(op: LiftLegalsOp) {
        let legals = this.Resolve('legals', op.world_id)
        if (!legals) {
            return
        }
        let relation = this.DotedResolve(op.column, op.world_id)

        if (!relation) {
            return
        }

        op.completed_relation = semiJoin(legals, relation, (a, b) => a.get('from') === b.get('from') && a.get('to') === b.get('to'))
    }



    private resolve_slot(column: Column, row: Row) {
        let next_world_id = row.get('end_world_id')!
        return this.Resolve(column, next_world_id)
    }

    private step_ColumnResolveOp(op: ColumnResolveOp) {
        let relation = this.Rs.get_or_wait(op.column, op.world_id)
        if (!relation) {
            return
        }
        op.completed_relation = relation
    }

    private step_ExpandOp(op: ExpandOp) {
        if (op.aa === undefined) {
            let relation = this.Resolve(op.column_a, op.world_id)
            if (!relation) {
                return false
            }

            op.aa = relation.rows
        }


        while (op.i_a < op.aa.length) {
            let relation = op.bb[op.i_a] ?? this.resolve_slot(op.column_b, op.aa[op.i_a])
            if (!relation) {
                return
            }
            op.bb[op.i_a] = relation
            /*
            while (op.i_b < relation.rows.length) {
                let row_b = relation.rows[op.i_b]
                //op.bb[op.i_b] = row
                op.i_b++
            }

            op.i_b = 0
            */
            op.i_a++
        }

        op.completed_relation = { rows: op.bb.flatMap(_ => _.rows) }
    }

}




function double_join(a: Relation, b: Relation, fn: (a: Row, b: Row) => boolean) {
    let aa = []
    let bb = []

    for (let a_row of a.rows) {
        for (let b_row of b.rows) {
            if (fn(a_row, b_row)) {
                aa.push(a_row)
                bb.push(b_row)
            }
        }
    }

    return [{ rows: aa } , { rows: bb }]
}

function set_materialize_f(Rs: Rs, d: Definition) {

    let plan = convert_to_plan(d)

    let fn = (world_id: WorldId, r: Rs) => {
        return true
    }

    Rs.set_relation(d.fact!, fn)
}

function extract_single(l: ResolvedMoveListRight) {
    if (l.type === 'single') {
        return l.a
    }
    throw 'Not implemented'
}

function set_materialize_i(Rs: Rs, d: Definition) {

    let plan = convert_to_plan(d)

    let R2 = new IR(Rs)

    let fn = (world_id: WorldId, r: Rs) => {

        R2.step()

        for (let move of plan.moves) {
            if (move.left) {
                let relation = R2.LiftLegals(move.left, extract_single(move.right), world_id)
                if (!relation) {
                    return false
                }
            }
        }

        for (let alias of plan.sources) {
            if (alias.path.expand) {
                let relation = R2.ReResolve(alias.path.expand, alias.path.column, world_id)
                if (!relation) {
                    return false
                }
            } else {
                let relation = R2.DotedResolveWithAlias(alias.path.column, extract_single(alias.relation), world_id)
                if (!relation) {
                    return false
                }
            }
        }

        let emitRows = new RelationManager()
        R2.extendBinding(new Map(), 0, plan.sources, world_id, plan.joins, plan.output, emitRows)

        Rs.add_rows(world_id, d.idea!, emitRows.get_relation_starting_at_world_id(world_id)!.rows)

        return true
    }

    Rs.set_relation(d.idea!, fn)
}

function materialize_d(Rs: Rs, d: Definition): (world_id: WorldId, Rs: Rs) => RelationManager | undefined {

    let plan = convert_to_plan(d)

    let R2 = new IR(Rs)

    return (world_id: WorldId, Rs: Rs) => {

        R2.step()

        for (let move of plan.moves) {
            if (move.left) {
                let relation = R2.LiftLegals(move.left, extract_single(move.right), world_id)
                if (!relation) {
                    return
                }
            } else {
                let relation = R2.LiftLegals('', extract_single(move.right), world_id)
                if (!relation) {
                    return
                }
            }
        }


        for (let alias of plan.sources) {
            if (alias.path.expand) {
                let relation = R2.ReResolve(alias.path.expand, alias.path.column, world_id)
                if (!relation) {
                    return
                }
            } else {
                let relation = R2.DotedResolveWithAlias(alias.path.column, extract_single(alias.relation), world_id)
                if (!relation) {
                    return
                }
            }
        }


        let emitRows = new RelationManager()
        //R2.extendBinding(new Map(), 0, plan.sources, world_id, plan.joins, plan.output, emitRows)

        //Rs.add_rows(world_id, d.idea!, emitRows.get_relation_starting_at_world_id(world_id)!.rows)

        emitRows.add_rows(0, R2.Resolve('', 0)!.rows)
        return emitRows
    }

}

function Rs_get_movelist_relation_or_wait(relations: Map<Column, RelationManager>, Rs: Rs, world_id: WorldId, movelist: ResolvedMoveListRight) {
    switch (movelist.type) {
        case 'and': break
        case 'or': break
        case 'minus': break
        case 'single': 
            let dd = movelist.a

            if (dd.expand) {
                let relation = relations.get(dd.expand)?.get_relation_starting_at_world_id(world_id)!
                let r = Rs.expand_legal_worlds2(relation, world_id)
                if (!r) {
                    return false
                }
                let res = new RelationManager()
                for (let row of r.rows) {
                    let next_world_id = row.get('end_world_id')!

                    let next_r = Rs.get_or_wait(dd.column, next_world_id)

                    if (!next_r) {
                        return false
                    }

                    res.add_rows(next_world_id, next_r.rows)
                }
                return res
            }


            let r = Rs.get_or_wait(dd.column, world_id)
            if (!r) {
                return false
            }

            let res = new RelationManager()
            res.add_rows(world_id, r.rows)
            return res
        break
    }
    throw 'Not Implemented'
}

const Constants_by_name = {
    King: KING,
    Queen: QUEEN,
    Rook: ROOK,
    Bishop: BISHOP,
    Knight: KNIGHT,
    Pawn: PAWN,
}


function resolve_movelist(d: MoveListRight): ResolvedMoveListRight {
    switch (d.type) {
        case 'single':
            return {
                type: 'single',
                a: resolve_doted_path(d.a)
            }
    }
    throw 'Not implemented'
}

function resolve_doted_path(d: DotedPath): ResolvedDotedPath {
    if (is_columns(d)) {
        let expand = d.columns[d.columns.length - 2]
        let column = d.columns[d.columns.length - 1]
        let left_column_path = expand + '.' + column
        let full = left_column_path + '.' + d.field
        return { left_column_path, expand, column, field: d.field, source: d, full }
    } else if (is_column(d)) {
        return { full: d.column + '.' + d.field, left_column_path: d.column, column: d.column, field: d.field, source: d }
    } else {
        return { full: d.field, left_column_path: d.field, column: d.field, source: d }
    }
}

export function doted_equals(a: DotedPath, b: DotedPath) {
    if (is_columns(a) && is_columns(b)) {
        return a.columns.join(' ') === b.columns.join(' ')
    } else if (is_column(a) && is_column(b)) {
        return a.column === b.column
    } else {
        if (is_columns(b) || is_column(b)) {
            return false
        }
    }
    return false
}
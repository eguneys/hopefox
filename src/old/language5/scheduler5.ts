import { between } from "../distill/attacks"
import { BISHOP, ColorC, KING, KNIGHT, make_move_from_to, move_c_to_Move, MoveC, PAWN, piece_c_color_of, piece_c_type_of, PieceTypeC, PositionC, PositionManager, QUEEN, ROOK } from "../distill/hopefox_c"
import { SquareSet } from "../distill/squareSet"
import { Square } from "../distill/types"
import { NodeId, NodeManager } from "../language1/node_manager"
import { san_moves_c } from "../language2/san_moves_helper"
import { Constants, Definition, DotedPath, is_column, is_columns, is_const_match, MoveListRight, parse_defs6 } from "./parser5"
import { anti_join, concat, join, LookupFilter, mergeRows, project, Relation, RelationManager, Row, RowId, select, semiJoin } from "./relation_manager"

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


    has(column: Column) {
        return this.relations.has(column)
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

    step() {
        let there_is_more = false
        for (let R of this.relations) {
            there_is_more = R[1].step() || there_is_more
        }
        return there_is_more
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



export function Search(m: PositionManager, pos: PositionC, rules: string) {
    let dd = parse_defs6(rules)

    let rss = new RssManager(m, pos)

    for (let d of dd) {
        if (d.fact) {
            rss.set_f(d)
        } else if (d.idea) {
            rss.set_i(d)
        } else {
            rss.set_d(d)
        }
    }


    rss.run()

    return rss.results
}


type Emit = (world_id: WorldId, _: Relation) => void
type EmitMoves = (world_id: WorldId, move: string, _: Relation) => void

class RssManager {
    Rs: Rs
    d_steps: [FactPlan, IR][]
    results: RelationManager[]

    constructor(m: PositionManager, pos: PositionC) {
        this.Rs = new Rs(m, pos)
        this.d_steps = []
        this.results = []
    }

    set_f(f: Definition) {

        let plan = convert_to_plan(f)

        let R2 = new IR(this.Rs)

        this.Rs.set_relation(plan.name, (world_id: WorldId) => this._f_step(plan, R2, world_id))
    }




    set_i(i: Definition) {

        let plan = convert_to_plan(i)

        let R2 = new IR(this.Rs)

        for (let alias of plan.moves) {
            const alias_left = alias.left
            if (alias_left) {
                this.Rs.set_relation(`${plan.name}.${alias_left}`, (world_id: WorldId) => {
                    this._i_step(plan, R2, world_id)
                    return this._i_moves_step(plan, R2, alias, world_id)
                })

            }
        }

        for (let alias of plan.lines) {
            const alias_left = alias.left
            if (alias_left) {
                this.Rs.set_relation(`${plan.name}.${alias_left}`, (world_id: WorldId) => {
                    this._i_step(plan, R2, world_id)
                    return this._i_lines_step(plan, R2, alias, world_id)
                })
            }
        }



        this.Rs.set_relation(plan.name, (world_id: WorldId) => this._i_step(plan, R2, world_id))

    }

    set_d(d: Definition) {
        let plan = convert_to_plan(d)
        let R2 = new IR(this.Rs)

        this.d_steps.push([plan, R2])
    }


    run() {
        while (this.d_steps.length > 0) {

            let d_steps = []
            for (let d_step of this.d_steps) {
                let result = this._d_step(d_step[0], d_step[1])
                if (!result) {
                    d_steps.push(d_step)
                } else {
                    this.results.push(result)
                }

            }
            this.d_steps = d_steps

            this.Rs.step()
        }
    }



    _f_step(plan: FactPlan, R2: IR, world_id: WorldId): boolean {
        R2.step()

        for (let alias of plan.sources) {
            let res = R2.AliasResolve(alias, world_id)
            if (!res) {
                return false
            }
        }

        let emitRows = new RelationManager()
        R2.extendBinding(new Map(), 0, plan.sources, world_id, plan.joins, plan.output, emitRows)

        this.Rs.add_rows(world_id, plan.name, emitRows.get_relation_starting_at_world_id(world_id).rows)
        return true
    }



    _i_step(plan: FactPlan, R2: IR, world_id: WorldId): boolean {

        R2.step()

        let skip = false

        for (let move of plan.moves) {
            if (move.left) {
                let relation = R2.LiftLegals(move.left, move.right, world_id)
                if (!relation) {
                    //return false
                    skip = true
                }
                
            }
        }

        for (let move of plan.lines) {
            if (move.left) {
                let relation = R2.LiftExpandResolve(move.left, move.right, world_id)
                if (!relation) {
                    //return false
                    skip = true
                }
            } else {
                let relation = R2.resolve_movelist(move.right, world_id)
                if (!relation) {
                    //return false
                    skip = true
                }
            }
        }

        for (let alias of plan.sources) {
            let res = R2.AliasResolve(alias, world_id)
            if (!res) {
                // return false
                skip = true
            }
        }

        if (skip) {
            return false
        }

        let emitRows = new RelationManager()
        R2.extendBinding(new Map(), 0, plan.sources, world_id, plan.joins, plan.output, emitRows)

        this.Rs.add_rows(world_id, plan.name, emitRows.get_relation_starting_at_world_id(world_id).rows)
        return true
    }


    _i_lines_step(plan: FactPlan, R2: IR, line: PlanMove, world_id: WorldId): boolean {

        R2.step()


        if (!line.left) {
            return true
        }

        let relation = R2.LiftExpandResolve(line.left, line.right, world_id)
        if (!relation) {
            return false
        }

        this.Rs.add_rows(world_id, `${plan.name}.${line.left}`, relation.rows)

        return true
    }



    _i_moves_step(plan: FactPlan, R2: IR, move: PlanMove, world_id: WorldId): boolean {
        R2.step()


        if (!move.left) {
            return true
        }

        let relation = R2.LiftLegals(move.left, move.right, world_id)
        if (!relation) {
            return false
        }

        this.Rs.add_rows(world_id, `${plan.name}.${move.left}`, relation.rows)

        return true
    }

    _d_step(plan: FactPlan, R2: IR) {
        let world_id = 0

        R2.step()

        for (let move of plan.lines) {
            if (move.left) {
                let relation = R2.LiftExpandResolve(move.left, move.right, world_id)
                if (!relation) {
                    return false
                }
            } else {
                let relation = R2.resolve_movelist(move.right, world_id)
                if (!relation) {
                    return false
                }

            }
        }


        for (let move of plan.moves) {
            if (move.left) {
                let relation = R2.LiftLegals(move.left, move.right, world_id)
                if (!relation) {
                    return false
                }
            } else {
                let relation = R2.LiftLegals('', move.right, world_id)
                if (!relation) {
                    return false
                }
            }
        }


        for (let alias of plan.sources) {
            let relation = R2.AliasResolve(alias, world_id)
            if (!relation) {
                return false
            }
        }


        let emitRows = new RelationManager()
        let ex_line = plan.lines[0].right
        emitRows.add_rows(0, R2.resolve_movelist(ex_line, 0)!.rows)
        return emitRows

    }
}





type Binding = Map<Column, Row>

type DotedPathWithField = { columns: string[], full_path: string, field: string }
type DotedPathColumn = { columns: string[], full_path: string }

type ResolvedMoveListRight = {
    type: 'single'
    a: DotedPathColumn
} | {
    type: 'and',
    aa: DotedPathColumn[]
} | {
    type: 'or',
    aa: DotedPathColumn[]
} | {
    type: 'minus'
    aa: DotedPathColumn[]
}

type OutputExpr = { left: DotedPathWithField, right: DotedPathWithField }

type Join = NormalJoin | ConstJoin
type NormalJoin = { left: DotedPathWithField, right: DotedPathWithField, is_different: boolean } 
type ConstJoin = { left: DotedPathWithField, right_as_const: Constants, is_different: boolean }

type Source = { path: DotedPathColumn, relation: ResolvedMoveListRight }

function is_const_join(_: Join): _ is ConstJoin  {
    return (_ as ConstJoin).right_as_const !== undefined
}

type BetweenJoin = { left: DotedPathWithField, right: DotedPathWithField, right2: DotedPathWithField, is_different: boolean }

type PlanMove = { left?: string, right: ResolvedMoveListRight }

type FactPlan = {
    name: Column
    sources: Source[]
    joins: Join[]
    between_joins: BetweenJoin[]
    moves: PlanMove[]
    lines: PlanMove[]
    output: OutputExpr[]
}

function convert_to_plan(d: Definition) {

    let sources: Source[] = []
    let joins: Join[] = []
    let output: OutputExpr[] = []
    let between_joins: BetweenJoin[] = []

    for (let alias of d.alias) {
        sources.push({ path: { columns: [alias.left], full_path: alias.left }, relation: resolve_movelist(alias.right) })
    }

    for (let m of d.matches) {

        let left = resolve_doted_path_with_field(m.left)
        let left_source = { ...left, field: undefined }

        if (!sources.find(_ => _.path.full_path === left.full_path)) {
            sources.push({ path: left_source, relation: { type: 'single', a: left } })
        }

        if (is_const_match(m)) {
            joins.push({
                left,
                right_as_const: m.const,
                is_different: false
            })

            continue
        }

        let right = resolve_doted_path_with_field(m.right)
        let right_source = { ...right, field: undefined }

        if (!sources.find(_ => _.path.full_path === right.full_path)) {
            sources.push({ path: right_source, relation: { type: 'single', a: right } })
        }


        let is_different = m.is_different === true

        if (m.right2 !== undefined) {
            let right2 = resolve_doted_path_with_field(m.right2)
            let right2_source = { ...right2, field: undefined}

            if (!sources.find(_ => _.path.full_path === right2.full_path)) {
                sources.push({ path: right2_source, relation: { type: 'single', a: right2 } })
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
        output.push({ left: resolve_doted_path_with_field(assign.left), right: resolve_doted_path_with_field(assign.right) })
    }

    let moves: { left?: string, right: ResolvedMoveListRight }[]= []
    for (let move of d.moves) {
        if (move.left) {

            //sources.push({ path: resolve_doted_path(move.left), relation: resolve_movelist(move.right) })
        }
        moves.push({
            left: move.left?.field,
            right: resolve_movelist(move.right)
        })
    }

    let lines: { left?: string, right: ResolvedMoveListRight }[]= []
    for (let move of d.lines) {
        if (move.left) {

            //sources.push({ path: resolve_doted_path(move.left), relation: resolve_movelist(move.right) })
        }
        lines.push({
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
        moves,
        lines
    }

    return plan
}




/* ** */


type ExpandOp = {
    type: 'expand'
    completed_relation?: Relation
    column_a: Column
    column_b: ResolvedMoveListRight
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

type RelationResolveOp = {
    type: 'relation_resolve'
    column: ResolvedMoveListRight,
    world_id: WorldId
    completed_relation?: Relation
}

type LiftLegalsOp = {
    type: 'lift_legals'
    column: ResolvedMoveListRight,
    world_id: WorldId
    completed_relation?: Relation
}



type Operation = RelationResolveOp | ColumnResolveOp | ExpandOp | LiftLegalsOp

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
        return this.Resolve(source.path.full_path, world_id)

        /*

        const filters: LookupFilter[] = []
        let source_alias = doted_path_alias(source.path)

        for (const j of joins) {
            if (is_const_join(j)) {
                if (doted_path_alias(j.left) === source_alias) {
                    filters.push({
                        field: doted_path_field(j.left),
                        value: Constants_by_name[j.right_as_const]
                    })
                }
            } else {
                if (doted_path_alias(j.left) === source_alias && binding.has(doted_path_alias(j.right))) {
                    filters.push({
                        field: doted_path_field(j.left),
                        value: binding.get(doted_path_alias(j.right))!.get(doted_path_field(j.right))!,
                        is_different: j.is_different
                    })
                }

                if (doted_path_alias(j.right) === source_alias && binding.has(doted_path_alias(j.left))) {
                    filters.push({
                        field: doted_path_field(j.right),
                        value: binding.get(doted_path_alias(j.left))!.get(doted_path_field(j.left))!,
                        is_different: j.is_different
                    })
                }
            }
        }

        //return this.lookupRows(source_alias, world_id, filters)
        return this.Resolve(source_alias, world_id)
        */
    }

    emitRow(binding: Binding, output: OutputExpr[], emitRows: RelationManager) {
        let row = new Map()
        for (let { left, right } of output) {
            row.set(left.field, binding.get(right.full_path)!.get(right.field))
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
            binding.set(source.path.full_path, row)


            if (joins.every(join => this.IsJoinSatisfiedSofar(world_id, join, binding))) {
                this.extendBinding(binding, sourceIndex + 1, sources, world_id, joins, output, emitRows)
            }

            binding.delete(source.path.full_path)
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
        if (op.type === 'relation_resolve') {
            this.step_RelationResolveOp(op)
        } else if (op.type === 'expand') {
            this.step_ExpandOp(op)
        } else if (op.type === 'column_resolve') {
            this.step_ColumnResolveOp(op)
        } else if (op.type === 'lift_legals') {
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

    LiftLegals(alias: Column, column: ResolvedMoveListRight, world_id: WorldId) {
        return this.resolve_Op(alias, world_id, { column, world_id, type: 'lift_legals' })
    }

    Resolve(alias: Column, world_id: WorldId) {
        return this.resolve_Op(alias, world_id, { column: alias, world_id, type: 'column_resolve' })
    }

    LiftExpandResolve(alias: Column, split_column: ResolvedMoveListRight, world_id: WorldId) {
        let [column_a, column_b] = split_resolve_move_list(split_column)
        let op: ExpandOp = {
            type: 'expand',
            column_a,
            column_b: { type: 'single', a: { columns: [column_b], full_path: column_b}},
            world_id,
            aa: undefined,
            bb: [],
            i_a: 0,
            i_b: 0
        }

        return this.resolve_Op(alias, world_id, op)
    }



    DotedPathResolve(path: DotedPathColumn, world_id: WorldId) {
        if (this.Rs.has(path.full_path)) {
            return this.Resolve(path.full_path, world_id)
        } else if (path.columns.length === 1) {
            return this.Resolve(path.columns[0], world_id)
        } else {
            return this.ReResolve(path.columns[0], { type: 'single', a: { columns: [path.columns[1]], full_path: path.columns[1] } } , world_id)
        }
    }

    AliasResolve(alias: Source, world_id: WorldId) {
        if (alias.path.columns.length === 2) {
            return this.ReResolve(alias.path.columns[0], { type: 'single', a: { columns: [alias.path.columns[1]], full_path: alias.path.columns[1] } } , world_id)
        }
        if (alias.path.full_path === get_movelist_alias(alias.relation)) {
            return this.Resolve(alias.path.full_path, world_id)
        }
        return this.resolve_Op(alias.path.full_path, world_id, { column: alias.relation, world_id, type: 'relation_resolve' })
    }

    ReResolve(column_a: Column, column_b: ResolvedMoveListRight, world_id: WorldId) {
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
        let column_b_alias = get_movelist_alias(column_b)
        return this.resolve_Op(`${column_a}.${column_b_alias}`, world_id, op)
    }

    IsJoinSatisfiedSofar(world_id: WorldId, join: Join, binding: Binding) {
        if (is_const_join(join)) {
            return this.IsConstraintJoinSatisfiedSofar(world_id, join, binding)
        } else {
            return this.IsEqNormalJoinSatisfiedSofar(world_id, join, binding)
        }
    }

    private IsConstraintJoinSatisfiedSofar(world_id: WorldId, join: ConstJoin, binding: Binding) {
        let a = binding.get(join.left.full_path)
        let field_a = join.left.field

        if (a === undefined) {
            return true
        }

        let value = Constants_by_name[join.right_as_const]
        return (a.get(field_a) === value) === !join.is_different
    }

    private IsEqNormalJoinSatisfiedSofar(world_id: WorldId, join: NormalJoin, binding: Binding) {
        let a = binding.get(join.left.full_path)
        let b = binding.get(join.right.full_path)
        let field_a = join.left.field
        let field_b = join.right.field

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
        let relation = this.resolve_movelist(op.column, op.world_id)

        if (!relation) {
            return
        }

        op.completed_relation = semiJoin(legals, relation, (a, b) => a.get('from') === b.get('from') && a.get('to') === b.get('to'))
    }



    private resolve_slot(column: ResolvedMoveListRight, row: Row) {
        let next_world_id = row.get('end_world_id')!
        //return this.Resolve(column, next_world_id)
        return this.resolve_movelist(column, next_world_id)
    }

    private step_RelationResolveOp(op: RelationResolveOp) {
        let relation = this.resolve_movelist(op.column, op.world_id)
        if (!relation) {
            return
        }
        op.completed_relation = relation
    }


    private step_ColumnResolveOp(op: ColumnResolveOp) {
        console.log(op.column)
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

        op.completed_relation = {
            rows: op.aa.flatMap((aa, i) => {
                let bb = op.bb[i]


                return project(bb, bb => new Map([
                    ['from', aa.get('from')!],
                    ['to', aa.get('to')!],
                    ['from2', bb.get('from')!],
                    ['to2', bb.get('to')!],
                    ['start_world_id', aa.get('start_world_id')!],
                    ['end_world_id', bb.get('end_world_id')!],
                ])).rows
            })
        }
    }



    resolve_movelist(d: ResolvedMoveListRight, world_id: WorldId) {
        if (d.type === 'single') {
            let res = this.DotedPathResolve(d.a, world_id)
            if (!res) {
                return undefined
            }
            return res
        } else if (d.type === 'minus') {
            let a = this.DotedPathResolve(d.aa[0], world_id)
            if (!a) {
                return undefined
            }
            let b = this.DotedPathResolve(d.aa[1], world_id)
            if (!b) {
                return undefined
            }

            return anti_join(a, b, (a, b) => a.get('from') === b.get('from') && a.get('to') === b.get('to'))
        }
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



const Constants_by_name = {
    King: KING,
    Queen: QUEEN,
    Rook: ROOK,
    Bishop: BISHOP,
    Knight: KNIGHT,
    Pawn: PAWN,
}

function get_movelist_alias(d: ResolvedMoveListRight) {
    if (d.type === 'single') {
        return d.a.full_path
    } else {
        //return d.aa.map(a => a.full_path).join('.')
        return 'NoAliasFound'
    }
}

function resolve_movelist(d: MoveListRight): ResolvedMoveListRight {
    switch (d.type) {
        case 'single':
            return {
                type: 'single',
                a: resolve_doted_path_column(d.a)
            }
        case 'minus':
            return {
                type: 'minus',
                aa: d.aa.map(resolve_doted_path_column)
            }
    }
    throw 'Not implemented'
}


function resolve_doted_path_column(d: DotedPath): DotedPathColumn {
    if (is_columns(d)) {
        return { columns: [...d.columns, d.field], full_path: `${d.columns.join('.')}.${d.field}` }
    } else if (is_column(d)) {
        return { columns: [d.column, d.field], full_path: `${d.column}.${d.field}` }
    } else {
        return {columns: [d.field], full_path: d.field}
    }
}

function split_resolve_move_list(d: ResolvedMoveListRight) {
    if (d.type === 'single') {
        return d.a.columns
    } else if (d.type === 'minus') {
    }
    throw 'Not implemented'
}

function resolve_doted_path_with_field(d: DotedPath): DotedPathWithField {
    if (is_columns(d)) {
        return {field: d.field, columns: d.columns, full_path: d.columns.join('.') }
    } else if (is_column(d)) {
        return {field: d.field, columns: [d.column], full_path: d.column }
    } else {
        return {field: d.field, columns: [], full_path: d.field}
    }
}
import { ColorC, KING, make_move_from_to, move_c_to_Move, piece_c_color_of, piece_c_type_of, PieceC, PieceTypeC, PositionC, PositionManager } from "../distill/hopefox_c"
import { Move, Piece, Square } from "../distill/types"
import { NodeId, NodeManager } from "../language1/node_manager"
import { BaseRowKey, Column, RelationManager } from "./relation_manager"


type Query = Column

const QUERY_PIPELINES: Query[][] = [
    ['legals'],
]







type WorldId = NodeId

class IndentationManager {

    public nodes: NodeManager
    private m: PositionManager
    private pos: PositionC

    constructor(m: PositionManager, pos: PositionC) {
        this.nodes = new NodeManager()
        this.m = m
        this.pos = pos
    }

    private getOrCreateRelation<T extends BaseRowKey>(column: Column): RelationManager<T> {
        return this.Relations.get(column)
    }

    private getOrCreateMoveContexts<T extends MoveTypes>(world_id: WorldId, type: T): MoveContext[] {
        const indentation = this.getOrCreateIndentation(world_id)
        switch (type) {
            case MoveTypes.LegalsFrom:
                if (indentation.legals === undefined) {
                    indentation.legals = this.create_moves_froms(world_id)
                }
                return indentation.legals
            case MoveTypes.CapturesTo:
                if (indentation.captures === undefined) {
                    indentation.captures = this.create_captures_tos(world_id)
                }
                return indentation.captures
            case MoveTypes.RemovesDefenderOf:
                if (indentation.removes_defender_of === undefined) {
                    indentation.removes_defender_of = this.create_removes_defender_ofs(world_id)
                }
                return indentation.removes_defender_of
            case MoveTypes.Checks:
                if (indentation.checks === undefined) {
                    indentation.checks = this.create_checks(world_id)
                }
                return indentation.checks
            case MoveTypes.Forks:
                if (indentation.forks === undefined) {
                    indentation.forks = this.create_forks(world_id)
                }
                return indentation.forks
            case MoveTypes.EvadesChecks:
                if (indentation.evades_checks === undefined) {
                    indentation.evades_checks = this.create_evades_checkss(world_id)
                }
                return indentation.evades_checks
            case MoveTypes.Skewers:
                if (indentation.skewers === undefined) {
                    indentation.skewers = this.create_skewers(world_id)
                }
                return indentation.skewers
            case MoveTypes.Sacrifices:
                if (indentation.sacrifices === undefined) {
                    indentation.sacrifices = this.create_sacrifices(world_id)
                }
                return indentation.sacrifices
            case MoveTypes.ZoneMatesWithSupport:
                if (indentation.zone_mates_with_support === undefined) {
                    indentation.zone_mates_with_support = this.create_zone_mates_with_supports(world_id)
                }
                return indentation.zone_mates_with_support
        }
        return []
    }

    create_unblockable_checks(world_id: WorldId): UnblockableChecks[] {
        throw new Error("Method not implemented.")
    }
    create_unevadable_checks(world_id: WorldId): UncapturableChecks[] {
        throw new Error("Method not implemented.")
    }
    create_uncapturable_checks(world_id: WorldId): UncapturableChecks[] {
        throw new Error("Method not implemented.")
    }

    create_moves_froms(world_id: WorldId): Legals[] {
        this.make_moves_to_world(world_id)
        let res: Legals[] = []
        for (let move of this.m.get_legal_moves(this.pos)) {
            this.nodes.add_move(world_id, move)
            let { from, to } = move_c_to_Move(move)
            let piece = this.m.get_at(this.pos, from)!

            res.push({
                type: MoveTypes.LegalsFrom,
                piece: piece_c_type_of(piece),
                color: piece_c_color_of(piece),
                from,
                to
            })
        }

        this.unmake_moves_to_base(world_id)
        return res
    }
    private create_captures_tos(world_id: WorldId): Captures[] {
        throw new Error("Method not implemented.")
    }
    private create_removes_defender_ofs(world_id: WorldId): RemovesDefenderOfRole[] {
        throw new Error("Method not implemented.")
    }
    private create_checks(world_id: WorldId): ChecksRole[] {
        let occupies = this.getOrCreateMoveContexts(0, MoveTypes.Occupies) as Occupies[]
        let attacks2 = this.getOrCreateMoveContexts(0, MoveTypes.Attacks2) as Attacks2[]

        let res: ChecksRole[] = []
        for (let a2 of attacks2) {
            if (a2.to2 === KING) {
                res.push({
                    type: MoveTypes.Checks,
                    from: a2.from,
                    to: a2.to,
                    checked_color: piece_c_color_of(piece),
                    checked_piece: piece_c_type_of(piece),
                    to2: a2.to2
                })
            }
        }

        return res
    }
    private create_forks(world_id: WorldId): ForksRoles[] {
        throw new Error("Method not implemented.")
    }
    private create_evades_checkss(world_id: WorldId): EvadesChecks[] {
        throw new Error("Method not implemented.")
    }
    private create_skewers(world_id: WorldId): SkewersRoles[] {
        throw new Error("Method not implemented.")
    }
    private create_sacrifices(world_id: WorldId): SacrificesRoleVsRole[] {
        throw new Error("Method not implemented.")
    }
    private create_zone_mates_with_supports(world_id: WorldId): ZoneMatesWithSupport[] {
        throw new Error("Method not implemented.")
    }

    private make_moves_to_world(world_id: WorldId) {
        let history = this.nodes.history_moves(world_id)
        for (let move of history) {
            this.m.make_move(this.pos, move)
        }
    }

    private unmake_moves_to_base(world_id: WorldId) {
        let history = this.nodes.history_moves(world_id)
        for (let i = history.length - 1; i >= 0; i--) {
            let move = history[i]
            this.m.unmake_move(this.pos, move)
        }
    }



    public runQueryPipeline(world_id: WorldId, pipeline: Query[]) {

        let sets: MoveContext[][] = []
        for (let q of pipeline) {
            let s: MoveContext[] = this.getOrCreateMoveContexts(world_id, q) as MoveContext[]
            if (s.length === 0) {
                return []
            }
            sets.push(s)
        }
        return this.intersect_moves(sets)
    }

    private intersect_moves(sets: MoveContext[][]) {

        if (sets.length === 0) return []
        let result = sets[0].slice(0)

        for (let i = 1; i < sets.length; i++) {
            result = this.intersect_move_from_to(result, sets[i])
            if (result.length === 0) {
                return []
            }
        }
        return result
    }

    intersect_move_from_to(a: FromTo[], b: FromTo[]) {
        return a.filter(a => b.some(b => a.from === b.from && a.to === b.to))
    }


}


export class BindingScriptManager {

    world: IndentationManager

    constructor(m: PositionManager, pos: PositionC) {
        this.world = new IndentationManager(m, pos)
    }

    public search(world_id: WorldId, depth: number) {

        if (depth <= 0) return

        for (let pipeline of QUERY_PIPELINES) {

            let candidates = this.world.runQueryPipeline(world_id, pipeline)
            if (!this.isPromising(candidates)) {
                continue
            }

            let moves = candidates.map(_ => make_move_from_to(_.from, _.to))

            let children = this.world.nodes.history_moves(world_id)

            let worlds = children.filter(_ => moves.indexOf(_) !== -1)

            for (let w of worlds) {
                this.search(w, depth - 1)
            }

            break
        }
    }

    isPromising(set: MoveContext[]) {
        if (set.length === 0) {
            return false
        }
        if (set.length < 3) {
            return true
        }
        return false
    }
}

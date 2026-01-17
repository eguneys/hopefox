import { ColorC, PieceC, PieceTypeC } from "../distill/hopefox_c"
import { Move, Piece, Square } from "../distill/types"
import { NodeId } from "../language1/node_manager"

enum MoveTypes {
    MovesFrom,
    CapturesTo,
    RemovesDefenderOf,
    Checks,
    Forks,
    EvadesChecks,
    Skewers,
    UnblockableChecks,
    UncapturableChecks,
    UnevadableChecks,
    Sacrifices,
    ZoneMatesWithSupport
}

type UnblockableChecks = {
    type: MoveTypes.UnblockableChecks
    Checks: ChecksRole
}
type UncapturableChecks = {
    type: MoveTypes.UncapturableChecks
    Checks: ChecksRole
}
type UnevadableChecks = {
    type: MoveTypes.UnevadableChecks
    Checks: ChecksRole
}

type MovesFromRole = {
    type: MoveTypes.MovesFrom
    piece: PieceTypeC
    color: ColorC
    from: Square
    to: Square
}


type CapturesToRole = {
    type: MoveTypes.CapturesTo
    from: Square
    to: Square
    captured_from: Square
    captured_piece: PieceTypeC
    captured_color: ColorC
}


type RemovesDefenderOfRole = {
    type: MoveTypes.RemovesDefenderOf
    from: Square
    to: Square
    defender_from: Square
    defender_to: Square
    defender_piece: PieceTypeC
    defender_color: ColorC
    defended_piece: PieceTypeC
    defended_color: ColorC
}

type ChecksRole = {
    type: MoveTypes.Checks
    from: Square
    to: Square
    to2: Square
    checked_piece: PieceTypeC
    checked_color: ColorC
}

type ForksRoles = {
    type: MoveTypes.Forks
    from: Square
    to: Square
    fork_on_a: Square
    fork_on_b: Square
    fork_piece_a: PieceTypeC
    fork_color_a: ColorC
    fork_piece_b: PieceTypeC
    fork_color_b: ColorC
}


type EvadesChecks = {
    type: MoveTypes.EvadesChecks
    piece: PieceTypeC
    color: ColorC
    from: Square
    to: Square
    check_from: Square
    check_to: Square
    check_to2: Square
    check_piece: PieceTypeC
    check_color: ColorC
}


type SkewersRoles = {
    type: MoveTypes.Skewers
    piece: PieceTypeC
    color: ColorC
    from: Square
    to: Square
    to2: Square
    skewer_on_a: Square
    skewer_piece_a: PieceTypeC
    skewer_color_a: ColorC
    skewer_on_b: Square
    skewer_piece_b: PieceTypeC
    skewer_color_b: ColorC
}


type SacrificesRoleVsRole = {
    type: MoveTypes.Sacrifices
    from: Square
    to: Square
    piece: PieceTypeC
    color: ColorC
    vs_from: Square
    vs_piece: PieceTypeC
    vs_color: ColorC
}


type ZoneMatesWithSupport = {
    type: MoveTypes.ZoneMatesWithSupport
    piece: PieceTypeC
    color: ColorC
    from: Square
    to: Square
    support_from: Square
    support_piece: PieceTypeC
    support_color: ColorC
}

type MoveContext = 
    UnblockableChecks
    | UncapturableChecks
    | UnevadableChecks
    | MovesFromRole
    | CapturesToRole
    | RemovesDefenderOfRole
    | ChecksRole
    | ForksRoles
    | EvadesChecks
    | SkewersRoles
    | SacrificesRoleVsRole
    | ZoneMatesWithSupport


type WorldId = NodeId

type Indentation = {
    world_id: WorldId
    unblockable_check: UnblockableChecks[]
    uncapturable_check: UncapturableChecks[]
    unevadable_check: UnevadableChecks[]
    moves_from: MovesFromRole[]
    captures_to: CapturesToRole[]
    removes_defender_of: RemovesDefenderOfRole[]
    checks: ChecksRole[]
    forks: ForksRoles[]
    evades_checks: EvadesChecks[]
    skewers: SkewersRoles[]
    sacrifices: SacrificesRoleVsRole[]
    zone_mates_with_support: ZoneMatesWithSupport[]
}

class IndentationManager {
    private indentations: Map<WorldId, Indentation> = new Map()

    public createIndentation(world_id: WorldId): Indentation {
        const indentation: Indentation = {
            world_id,
            unblockable_check: [],
            uncapturable_check: [],
            unevadable_check: [],
            moves_from: [],
            captures_to: [],
            removes_defender_of: [],
            checks: [],
            forks: [],
            evades_checks: [],
            skewers: [],
            sacrifices: [],
            zone_mates_with_support: []
        }
        this.indentations.set(world_id, indentation)
        return indentation
    }

    public getOrCreateIndentation(world_id: WorldId): Indentation {
        return this.indentations.get(world_id) ?? this.createIndentation(world_id)
    }


    public addMoveContext(world_id: WorldId, context: MoveContext) {
        const indentation = this.getOrCreateIndentation(world_id)
        switch (context.type) {
            case MoveTypes.UnblockableChecks:
                indentation.unblockable_check.push(context)
                break
            case MoveTypes.UncapturableChecks:
                indentation.uncapturable_check.push(context)
                break
            case MoveTypes.UnevadableChecks:
                indentation.unevadable_check.push(context)
                break
            case MoveTypes.MovesFrom:
                indentation.moves_from.push(context)
                break
            case MoveTypes.CapturesTo:
                indentation.captures_to.push(context)
                break
            case MoveTypes.RemovesDefenderOf:
                indentation.removes_defender_of.push(context)
                break
            case MoveTypes.Checks:
                indentation.checks.push(context)
                break
            case MoveTypes.Forks:
                indentation.forks.push(context)
                break
            case MoveTypes.EvadesChecks:
                indentation.evades_checks.push(context)
                break
            case MoveTypes.Skewers:
                indentation.skewers.push(context)
                break
            case MoveTypes.Sacrifices:
                indentation.sacrifices.push(context)
                break
            case MoveTypes.ZoneMatesWithSupport:
                indentation.zone_mates_with_support.push(context)
                break
        }
    }
}

import { CoreConstraint, CoreIdea, CoreMove, CoreProgram, CoreRelation, CoreStep } from "./core"
import { parseSurfaceProgramWithSpans, SurfaceProgram } from "./parser6"

export type DiagnosticSeverity =
    | 'error'
    | 'warning'
    | 'info'



export interface Span {
    startLine: number
    startCol: number
    endLine: number
    endCol: number
}


export interface Diagnostic {
    severity: DiagnosticSeverity
    code: string
    message: string
    span: Span
    related?: RelatedDiagnostic[]
    fix?: FixSuggestion
}

export interface RelatedDiagnostic {
    message: string
    span: Span
}


export interface FixSuggestion {
    description: string
    replacement: string
    span: Span
}


type StructuralError =
    | 'MissingRequiredClause'
    | 'DuplicateClause'
    | 'InvalidHierarchy'


type ArityError =
    | 'TooFewTargets'
    | 'TooManyTargets'
    | 'MissingActor'

type TypeError =
    | 'ExpectedPiece'
    | 'ExpectedSquare'
    | 'ExpectedSide'


type LogicError =
    | 'SelfContradictory'
    | 'ImpossibleCondition'

function error(code: string, message: string, span: Span, 
    related?: RelatedDiagnostic[]): Diagnostic {
        return {
            severity: 'error',
            code,
            message,
            span,
            related
        }
    }


function TooFewTargets(span: Span, expected: number, found: number): Diagnostic {
    return error(`DSL001`, `Expected at least ${expected} targets, but found ${found}`,
        span
    )
}

export interface SemanticResult<T> {
    node?: T
    diagnostics: Diagnostic[]
}

export function analyseProgram(text: string): SemanticResult<CoreProgram> {

    const surfaceProgram = parseSurfaceProgramWithSpans(text)
    const diagnostics: Diagnostic[] = []

    for (const err of validateSurfaceProgram(surfaceProgram)) {
        diagnostics.push({ message: err.message, code: err.code, span: err.span, severity: 'error' })
    }

    if (diagnostics.some(d => d.severity === 'error')) {
        return { diagnostics }
    }

    const core = lowerSurfaceToCore(surfaceProgram, diagnostics)

    runArityChecks(core, diagnostics)
    runTypeChecks(core, diagnostics)
    runLogicChecks(core, diagnostics)

    return {
        node: diagnostics.some(d => d.severity === 'error') ? undefined : core,
        diagnostics
    }
}

enum Codes {
    UnknownPiece = 'EU1',
    UnknownRelationKind = "UnkownRelationKind",
    ArityMoveTo = "ArityMoveTo",
    MissingSubject = "MissingSubject",
    InvalidSquare = "InvalidSquare",
    DuplicateMoveToSquare = "DuplicateMoveToSquare",
    UnknownSquare = "UnknownSquare",
    UnknownReference = "UnknownReference"
}

export function lowerSurfaceToCore(program: SurfaceProgram, diagnostics: Diagnostic[]): CoreProgram {
    const coreIdeas: CoreIdea[] = []

    for (const idea of program.ideas) {
        const coreSteps: CoreStep[] = []

        for (const step of idea.steps) {
            const moves: CoreMove[] = []
            const relations: CoreRelation[] = []
            const constraints: CoreConstraint[] = []

            for (const move of step.moves) {
                const knownPieces = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn']
                if (!knownPieces.includes(move.piece)) {
                    diagnostics.push({
                        message: `Unknown piece "${move.piece}"`,
                        code: Codes.UnknownPiece,
                        span: move.span,
                        severity: 'error'
                    })
                }

                moves.push({
                    piece: move.piece,
                    from: move.from,
                    to: move.to,
                    span: move.span
                })
            }


            for (const rel of step.relations) {
                const knownKinds = ['attacks', 'checks', 'occupies']
                if (!knownKinds.includes(rel.kind)) {
                    diagnostics.push({
                        message: `Unkown relation kind "${rel.kind}"`,
                        span: rel.span,
                        code: Codes.UnknownRelationKind,
                        severity: 'error'
                    })
                }

                relations.push({
                    kind: rel.kind,
                    subject: rel.subject,
                    object: rel.object,
                    span: rel.span
                })
            }


            for (const c of step.constraints) {
                constraints.push({
                    kind: c.kind,
                    left: c.left,
                    right: c.right,
                    span: c.span
                })

            }

            coreSteps.push({
                moves,
                relations,
                constraints,
                span: step.span
            })
        }

        coreIdeas.push({
            name: idea.name,
            steps: coreSteps,
            span: idea.span
        })
    }


    return { ideas: coreIdeas }
}



function runArityChecks(core: CoreProgram, diagnostics: Diagnostic[]) {
    for (const idea of core.ideas) {
        for (const step of idea.steps) {
            for (const move of step.moves) {

                if (!move.to) {
                    diagnostics.push({
                        message: `Move must have a target square "to"`,
                        span: move.span,
                        severity: 'error',
                        code: Codes.ArityMoveTo
                    })
                }
            }

            for (const rel of step.relations) {
                if (!rel.subject || !rel.object) {
                    diagnostics.push({
                        message: `Relation must have both object and subject`,
                        span: rel.span,
                        severity: 'error',
                        code: Codes.MissingSubject
                    })
                }
            }
        }
    }
}

const knownPieces = ['king', 'queen', 'bishop', 'rook', 'knight', 'pawn']
const squares = Array.from({ length: 8 },
    (_, i) => ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h',]
        .map(f => `${f}${i + 1}`)).flat()


const knownRelationKinds = ['attacks', 'checks', 'occupies']


function runTypeChecks(core: CoreProgram, diagnostics: Diagnostic[]) {
    for (const idea of core.ideas) {
        for (const step of idea.steps) {
            for  (const move of step.moves) {
                if (move.from && squares.includes(move.from)) {
                    diagnostics.push({
                        message: `Invalid source square "${move.from}"`,
                        span: move.span,
                        code: Codes.InvalidSquare,
                        severity: "error"
                    })
                }
                if (!squares.includes(move.to)) {
                    diagnostics.push({
                        message: `Invalid target square "${move.from}"`,
                        span: move.span,
                        code: Codes.InvalidSquare,
                        severity: "error"
                    })
                }
                if (!knownPieces.includes(move.piece)) {
                    diagnostics.push({
                        message: `Unknown piece "${move.piece}`,
                        span: move.span,
                        code: Codes.UnknownPiece,
                        severity: "error"
                    })
                }
            }

            for (const rel of step.relations) {
                if (!knownPieces.includes(rel.subject)) {
                    diagnostics.push({
                        message: `Unknown subject piece "${rel.subject}`,
                        span: rel.span,
                        code: Codes.UnknownPiece,
                        severity: "error"
                    })
                }
                if (!knownPieces.includes(rel.object)) {
                    diagnostics.push({
                        message: `Unknown object piece "${rel.object}`,
                        span: rel.span,
                        code: Codes.UnknownPiece,
                        severity: "error"
                    })
                }
            }
        }
    }
}


function runLogicChecks(core: CoreProgram, diagnostics: Diagnostic[]) {
    for (const idea of core.ideas) {
        for (const step of idea.steps) {
            const targets = new Set<string>()
            for (const move of step.moves) {
                if (targets.has(move.to)) {
                    diagnostics.push({
                        message: `Duplicate move to square "${move.to} in the same step`,
                        span: move.span,
                        code: Codes.DuplicateMoveToSquare,
                        severity: "error"
                    })
                } else {
                    targets.add(move.to)
                }
            }

            const knownNames = [...step.moves.map(m => m.piece), ...step.relations.map(r => r.subject)]

            for (const c of step.constraints) {
                if (!knownNames.includes(c.left)) {
                    diagnostics.push({
                        message: `Constraint left refers to unknown "${c.left}"`,
                        span: c.span,
                        code: Codes.UnknownPiece,
                        severity: "error"
                    })
                }
                if (!knownNames.includes(c.right)) {
                    diagnostics.push({
                        message: `Constraint right refers to unknown "${c.right}"`,
                        span: c.span,
                        code: Codes.UnknownPiece,
                        severity: "error"
                    })
                }
            }
        }
    }
}


function validateSurfaceProgram(program: SurfaceProgram): Diagnostic[] {
    const diagnostics: Diagnostic[] = []

    for (const idea of program.ideas) {
        for (const step of idea.steps) {
            for (const move of step.moves) {
                if (!knownPieces.includes(move.piece)) {
                    diagnostics.push({
                        message: `Unknown piece "${move.piece}"`,
                        span: move.span,
                        code: Codes.UnknownPiece,
                        severity: 'error'
                    })
                }


                if (move.from && !squares.includes(move.from)) {
                    diagnostics.push({
                        message: `Unknown source square "${move.from}"`,
                        span: move.span,
                        code: Codes.UnknownSquare,
                        severity: 'error'
                    })
                }

                if (move.to && !squares.includes(move.to)) {
                    diagnostics.push({
                        message: `Unknown source square "${move.to}"`,
                        span: move.span,
                        code: Codes.UnknownSquare,
                        severity: 'error'
                    })
                }
            }


            for (const rel of step.relations) {
                if (!knownRelationKinds.includes(rel.kind)) {
                    diagnostics.push({
                        message: `Unknown relation kind "${rel.kind}"`,
                        span: rel.span,
                        code: Codes.UnknownRelationKind,
                        severity: 'error'
                    })
                }

                if (!knownPieces.includes(rel.subject)) {
                    diagnostics.push({
                        message: `Unknown subject piece "${rel.subject}"`,
                        span: rel.span,
                        code: Codes.UnknownPiece,
                        severity: 'error'
                    })
                }

                if (!knownPieces.includes(rel.object)) {
                    diagnostics.push({
                        message: `Unknown object piece "${rel.object}"`,
                        span: rel.span,
                        code: Codes.UnknownPiece,
                        severity: 'error'
                    })
                }
            }

            const knownNames = [
                ...step.moves.map(m => m.piece),
                ...step.relations.map(r => r.subject),
            ]

            for (const c of step.constraints) {
                if (!knownNames.includes(c.left)) {
                    diagnostics.push({
                        message: `Constraint refers to unknown "${c.left}"`,
                        span: c.span,
                        code: Codes.UnknownReference,
                        severity: 'error'
                    })
                }
                if (!knownNames.includes(c.right)) {
                    diagnostics.push({
                        message: `Constraint refers to unknown "${c.right}"`,
                        span: c.span,
                        code: Codes.UnknownReference,
                        severity: 'error'
                    })
                }
            }
        }
    }

    return diagnostics
}
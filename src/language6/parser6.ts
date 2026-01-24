import { Span } from "./diagnostics"

export interface SurfaceProgram {
    ideas: SurfaceIdea[]
}


interface SurfaceIdea {
    name: string
    steps: SurfaceStep[]
    span: Span
}

interface SurfaceStep {
    moves: SurfaceMove[]
    relations: SurfaceRelation[]
    constraints: SurfaceConstraint[]
    span: Span
}


interface SurfaceMove {
    piece: string
    from?: string
    to: string
    span: Span
}


interface SurfaceRelation {
    kind: 'attacks' | 'checks' | 'occupies'
    subject: string
    object: string
    span: Span
}


interface SurfaceConstraint {
    kind: 'equals' | 'not_equals'
    left: string
    right: string
    span: Span
}


/* *

Program ::= Idea*
Idea    ::= 'idea' STRING Step*
Step    ::= Move | Relation | Constraint
Move    ::= 'move' PIECE 'from' SQUARE 'to' SQUARE
Relation    ::= ('attacks' | 'checks' | 'occupies') PIECE '->' TARGET
Constraint    ::= IDENTIFIER ('=' | '!=') IDENTIFIER

Indentation or line breaks can define steps grouping
Each idea contains multiple steps
Each step contains moves, relations, constraints

*/

export function parseSurfaceProgramWithSpans(text: string): SurfaceProgram {
    const lines = text.split('\n')
    const ideas: SurfaceIdea[] = []
    let currentIdea: SurfaceIdea | null = null
    let currentStep: SurfaceStep | null = null


    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmed = line.trim()
        if (!trimmed) continue

        if (trimmed.startsWith('idea')) {
            const nameMatch = trimmed.match(/idea\s+"(.+)"/)
            const name = nameMatch![1]
            currentIdea = { name, 
                steps: [] ,
                span: { startLine: i + 1, startCol: 1, endLine: i + 1, endCol: line.length }
            }

            ideas.push(currentIdea)
            currentStep = { moves: [], relations: [], constraints: [],
                span: { startLine: i + 1, startCol: 1, endLine: i + 1, endCol: line.length }
             }
            currentIdea.steps.push(currentStep)
        } else if (trimmed.startsWith('move')) {
            const m = trimmed.match(/move (\w+) from (\w\d) to (\w\d)/)
            if (!m) continue
            currentStep!.moves.push({ piece: m[1], from: m[2], to: m[3], 
                span: { startLine: i + 1, startCol: 1, endLine: i + 1, endCol: line.length }
            })
        } else if (/^(attacks|checks|occupies)/.test(trimmed)) {
            const m = trimmed.match(/(attacks|checks|occupies) (\w+) -> (\w+)/)!
            currentStep!.relations.push({ kind: m[1] as any, subject: m[2], object: m[3],
                span: { startLine: i + 1, startCol: 1, endLine: i + 1, endCol: line.length }
            })
        } else if (/=|!=/.test(trimmed)) {
            const m = trimmed.match(/(\w+)\s*(=|!=)\s*(\w+)/)!
            currentStep!.constraints.push({ 
                kind: m[2] === '=' ? 'equals' : 'not_equals',
                left: m[1],
                right: m[3],
                span: { startLine: i + 1, startCol: 1, endLine: i + 1, endCol: line.length }
            })
        }
    }
    return { ideas } 
}
import { Span } from "./diagnostics"

export type EntityId = string
export type RelationId = string
export type WorldVar = string


export type EntityKind =
    | 'piece'
    | 'square'
    | 'side'

export interface EntityRef {
    kind: EntityKind
    id: EntityId
}

export interface WorldBinding {
    name: WorldVar
}

export type CoreRelation =
    | OccupiesRelation
    | AttacksRelation
    | ChecksRelation
    | MoveRelation

export interface OccupiesRelation {
    kind: 'occupies'
    world: WorldBinding
    piece: EntityRef
    square: EntityRef
    span: Span
}


export interface AttacksRelation {
    kind: 'attacks'
    world: WorldBinding
    from: EntityRef
    to: EntityRef
    span: Span
}



export interface ChecksRelation {
    kind: 'checks'
    world: WorldBinding
    attacker: EntityRef
    king: EntityRef
    span: Span
}



export interface MoveRelation {
    kind: 'move'
    fromWorld: WorldBinding
    toWorld: WorldBinding
    piece: EntityRef
    from: EntityRef
    to: EntityRef
    span: Span
}

export type CoreConstraint = {
    kind: 'equals' | 'not_equals'
    left: RelationFieldRef
    right: RelationFieldRef
    span: Span
}


export type CoreValue =
    | EntityRef
    | RelationFieldRef

export interface RelationFieldRef {
    relation: RelationId
    field: string
}

export interface CoreStep {
    id?: string
    inputWorld?: WorldBinding
    outputWorld?: WorldBinding

    relations: CoreRelation[]
    constraints: CoreConstraint[]
    moves: CoreMove[]
    span: Span
}

export interface CoreMove {
    piece: string
    from?: string
    to: string
    span: Span
}

export interface CoreIdea {
    name?: string
    steps: CoreStep[]
    span: Span
}


export interface CoreProgram {
    ideas: CoreIdea[]
}



type NodeId = string


interface RelationNode {
    id: RelationId
    schema: string[]
    subscribers: NodeId[]
    span?: Span
}


interface ResolverNode {
    id: NodeId
    input: RelationId
    outputs: RelationId[]
    kind: 'resolver'
    span?: Span
}

interface JoinNode {
    id: NodeId
    inputs: RelationId[]
    output: RelationId
    constraint: CoreConstraint
    kind: 'join'
    span?: Span
}

type EngineNode = ResolverNode | JoinNode


export interface EngineGraph {
    relations: Map<RelationId, RelationNode>
    nodes: Map<NodeId, EngineNode>
}

class LoweringContext {
    graph: EngineGraph = {
        relations: new Map(),
        nodes: new Map()
    }

    private nextNodeId = 0

    freshNodeId(prefix: string): NodeId {
        return `${prefix}_${this.nextNodeId++}`
    }

    getOrCreateRelation(id: RelationId, schema: string[], span?: Span): RelationNode {
        let rel = this.graph.relations.get(id)
        if (!rel) {
            rel = { id, schema, subscribers: [], span }
            this.graph.relations.set(id, rel)
        }
        return rel
    }

    addNode(node: EngineNode) {
        this.graph.nodes.set(node.id, node)
        for (const relId of this.inputRelations(node)) {
            this.graph.relations.get(relId)!.subscribers.push(node.id)
        }
    }


    private inputRelations(node: EngineNode): RelationId[] {
        if (node.kind === 'resolver') return [node.input]
        return node.inputs
    }
}


function worldRelationId(world: WorldBinding): RelationId {
    return `world@${world.name}`
}

function coreRelationId(rel: CoreRelation): RelationId {
    switch (rel.kind) {
        case 'occupies':
            return `occupies@${rel.world.name}`
        case 'attacks':
            return `attacks@${rel.world.name}`
        case 'checks':
            return `checks@${rel.world.name}`
        case 'move':
            return `move@${rel.fromWorld.name}->${rel.toWorld.name}`
    }
}



export const SCHEMAS = {
    world: ['world_id', 'depth'],
    occupies: ['piece', 'square', 'role', 'color'],
    attacks: ['from', 'to'],
    checks: ['attacker', 'king'],
    move: ['piece', 'from', 'to', 'fromWorld', 'toWorld'],
}


function materializeRelations(ctx: LoweringContext, step: CoreStep) {
    ctx.getOrCreateRelation(
        worldRelationId(step.inputWorld), 
        SCHEMAS.world,
        step.span)

        if (step.outputWorld) {
            ctx.getOrCreateRelation(
                worldRelationId(step.outputWorld),
                SCHEMAS.world,
                step.span
            )
        }

        for (const rel of step.relations) {
            const id = coreRelationId(rel)
            const schema = 
            rel.kind === 'occupies' ? SCHEMAS.occupies :
            rel.kind === 'attacks' ? SCHEMAS.attacks :
            rel.kind === 'checks' ? SCHEMAS.checks :
            SCHEMAS.move

            ctx.getOrCreateRelation(id, schema, rel.span)
        }
}

function createResolvers(
    ctx: LoweringContext,
    step: CoreStep
) {
    for (const rel of step.relations) {
        if (rel.kind === 'occupies') continue
        if (rel.kind === 'move') {
            const node: ResolverNode = {
                id: ctx.freshNodeId('resolve_move'),
                kind: 'resolver',
                input: worldRelationId(rel.fromWorld),
                outputs: [
                    worldRelationId(rel.toWorld),
                    coreRelationId(rel)
                ],
                span: rel.span
            }
            ctx.addNode(node)
            continue
        }


        const node: ResolverNode = {
            id: ctx.freshNodeId(`resolve_${rel.kind}`),
            kind: 'resolver',
            input: worldRelationId(rel.world),
            outputs: [coreRelationId(rel)],
            span: rel.span
        }

        ctx.addNode(node)
    }
}


function createJoins(
    ctx: LoweringContext,
    step: CoreStep
) {
    for (const constraint of step.constraints) {
        if (constraint.kind !== 'equals') continue

        const left = constraint.left
        const right = constraint.right

        const leftRel = `${left.relation}@${step.inputWorld.name}`
        const rightRel = `${right.relation}@${step.inputWorld.name}`


        const outputId = ctx.freshNodeId('join_out')

        ctx.getOrCreateRelation(outputId, [])

        const join: JoinNode = {
            id: ctx.freshNodeId('join'),
            kind: 'join',
            inputs: [leftRel, rightRel],
            output: outputId,
            constraint,
            span: constraint.span
        }
        ctx.addNode(join)
    }
}


export function lowerCoreToEngine(core: CoreProgram): EngineGraph {
    const ctx = new LoweringContext()

    for (const idea of core.ideas) {
        for (const step of idea.steps) {
            materializeRelations(ctx, step)
            createResolvers(ctx, step)
            createJoins(ctx, step)
        }
    }
    return ctx.graph
}



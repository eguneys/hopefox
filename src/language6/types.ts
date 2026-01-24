type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn'


type Verb = 
    | 'checks'
    | 'attacks'
    | 'forks'
    | 'pins'
    | 'blocks'
    | 'captures'
    | 'moves'


type Modifier =
    | 'uncapturable'
    | 'unblockable'
    | 'unevadable'
    | 'undefended'
    | 'overloaded'

type Outcome =
    | 'wins material'
    | 'wins exchange'
    | 'mates'


type DSLNode =
    | SubjectNode
    | ActionNode
    | ModifierNode
    | OnlyReplyNode
    | OutcomeNode


interface SubjectNode {
    kind: 'subject'
    piece: PieceType
    children: DSLNode[]
}


interface ActionNode {
    kind: 'action'
    verb: Verb
    targets: PieceType[]
    children: DSLNode[]
}


interface ModifierNode {
    kind: 'modifier'
    modifier: Modifier
    children: DSLNode[]
}

interface OnlyReplyNode {
    kind: 'only_reply'
    piece: PieceType
    children: DSLNode[]
}

interface OutcomeNode {
    kind: 'outcome'
    outcome: Outcome
}


type WorldId = number

interface IRNode {
    id: number
    downstream: IRNode[]
}


interface WorldRelationNode extends IRNode {}

interface JoinNode extends IRNode {
    relation: string
    bindAs: string
}


interface ResolverNode extends IRNode {
    kind: 'attack' | 'capture' | 'block' | 'replies'
    params: any
}


interface NegJoinNode extends IRNode {
    relation: string
    predicate: any
}

interface OutcomeNodeIR extends IRNode {
    outcome: Outcome
}


interface LoweringContext {
    world: IRNode
    bindings: Map<string, string> // DSL name -> IR binding id
}


let NODE_ID = 0

function nodeIR<T extends IRNode>(n: Omit<T, "id" | "downstream">): T {
    return {
        ...n,
        id: NODE_ID++,
        downstream: []
    } as unknown as T
}

function link(parent: IRNode, child: IRNode) {
    parent.downstream.push(child)
}

function lowerDSL(root: SubjectNode): IRNode {
    const world = nodeIR<WorldRelationNode>({})
    const ctx: LoweringContext = {
        world,
        bindings: new Map()
    }

    lowerNode(root, ctx)
    return world
}


function lowerNode(node: DSLNode, ctx: LoweringContext): void {
    switch (node.kind) {
        case 'subject':
            lowerSubject(node, ctx)
            break
        case 'action':
            lowerAction(node, ctx)
            break
        case 'modifier':
            lowerModifier(node, ctx)
            break
        case 'only_reply':
            lowerOnlyReply(node, ctx)
            break

        case 'outcome':
            lowerOutcome(node, ctx)
            break
    }
}

function lowerSubject(node: SubjectNode, ctx: LoweringContext) {
    let binding = `piece_${node.piece}_${ctx.bindings.size}`
    ctx.bindings.set(node.piece, binding)

    const join = nodeIR<JoinNode>({
        relation: `piece:${node.piece}`,
        bindAs: binding
    })


    link(ctx.world, join)

    const childCtx: LoweringContext = {
        world: join,
        bindings: new Map(ctx.bindings)
    }

    for (const child of node.children) {
        lowerNode(child, childCtx)
    }
}


function lowerAction(node: ActionNode, ctx: LoweringContext) {
    const source = [...ctx.bindings.values()].slice(-1)[0]
    if (!source) throw new Error(`Action without subject`)

        for (const target of node.targets) {
            if (!ctx.bindings.has(target)) {
                ctx.bindings.set(target, `piece_${target}_${ctx.bindings.size}`)
            }

            const resolver = nodeIR<ResolverNode>({
                kind: node.verb === 'captures' ? 'capture': 'attack',
                params: {
                    source,
                    target: ctx.bindings.get(target)
                }
            })

            link(ctx.world, resolver)

            const childCtx: LoweringContext = {
                world: resolver,
                bindings: new Map(ctx.bindings)
            }

            for (const child of node.children) {
                lowerNode(child, childCtx)
            }
        }
}


function lowerModifier(node: ModifierNode, ctx: LoweringContext) {
    const target = [...ctx.bindings.values()].slice(-1)[0]
    if (!target) throw new Error(`Modifier without target`)

    const neg = nodeIR<NegJoinNode>({
        relation:
            node.modifier === 'uncapturable' ? 'capture' : 'defend',
        predicate: { target }
    })

    link(ctx.world, neg)

    const childCtx: LoweringContext = {
        world: neg,
        bindings: new Map(ctx.bindings)
    }

    for (const child of node.children) {
        lowerNode(child, childCtx)
    }
}


function lowerOnlyReply(node: OnlyReplyNode, ctx: LoweringContext) {
  const resolver = nodeIR<ResolverNode>({
    kind: "replies",
    params: { only: node.piece }
  })

  link(ctx.world, resolver)

  const childCtx: LoweringContext = {
    world: resolver,
    bindings: new Map(ctx.bindings)
  }

  childCtx.bindings.set(node.piece, `reply_${node.piece}`)

  for (const child of node.children) {
    lowerNode(child, childCtx)
  }
}


function lowerOutcome(node: OutcomeNode, ctx: LoweringContext) {
    const outcome = nodeIR<OutcomeNodeIR>({
        outcome: node.outcome
    })

    link(ctx.world, outcome)
}





/** Print */

function nodeLabel(node: IRNode): string {
    if ("outcome" in node) {
        return `Outcome(${node.outcome})`
    }

    if ("kind" in node) {
        return `Resolver(${node.kind})`
    }

    if ("relation" in node && "bindAs" in node) {
        return `Join(${node.relation}) as ${node.bindAs}`
    }


    if ("relation" in node) {
        return `NegJoin(${node.relation})`
    }

    return "World"
}


function printIR(
    root: IRNode,
    indent: number = 0,
    visited = new Set<number>()
) {
    const pad = " ".repeat(indent)

    console.log(`${pad}- [${root.id}] ${nodeLabel(root)}`)


    if (visited.has(root.id)) {
        console.log(`${pad} ↳ (already visited)`)
        return
    }

    visited.add(root.id)

    for (const child of root.downstream) {
        printIR(child, indent + 1, visited)
    }
}



const astForkAfterCheck: SubjectNode = {
  kind: "subject",
  piece: "knight",
  children: [
    {
      kind: "action",
      verb: "checks",
      targets: ["king"],
      children: [
        {
          kind: "modifier",
          modifier: "uncapturable",
          children: [
            {
              kind: "action",
              verb: "forks",
              targets: ["queen", "rook"],
              children: [
                {
                  kind: "outcome",
                  outcome: "wins material"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}


export function example() {
    console.log(printIR(lowerDSL(astForkAfterCheck)))
}
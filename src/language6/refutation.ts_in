type World = {}
type Outcome = {}

type RefutationSchema = {
    name: string
    applicable(outcome: Outcome): boolean
    attempt(world: World, outcome: Outcome): RefutationResult
}


type RefutationResult = 
    | { success: true, degradedOutcome: Outcome }
    | { success: false }


// Outcome has partial order:
// dominates(a, b): boolean // a > b


function findInevitableOutcome(world: World): Outcome | null {
    const outcomes = inferAchievableOutcomes(world)
    const sorted = sortByDominance(outcomes)


    for (const outcome of sorted) {
        if (proveInevitable(world, outcome)) {
            return outcome
        }
    }
    return null
}


function proveInevitable(world: World, outcome: Outcome): boolean {
    const dependencies = extractDependencies(world, outcome)
    const refutations = generateRefutations(dependencies, outcome)

    for (const refutation of refutations) {
        const result = refutation.attempt(world, outcome)
        if (result.success) {
            return false
        }
    }
    return true
}


function generateRefutations(
    dependencies: RefutationSchema[],
    outcome: Outcome
): RefutationSchema[] {

    return PrimitiveRefutations.filter(r =>
        r.applicable(outcome) &&
        r.invalidatesAny(dependencies)
    )
}


const escapeAttackedPiece: RefutationSchema = {
    name: 'escape_attacked_piece',
    applicable(outcome) {
        return outcome.involvesThreatenedPiece
    },
    attempt(world, outcome) {
        const escapes = querySafeEscapes(world, outcome.targetPiece)

        for (const w2 of escapes) {
            const newOutcome = evaluateOutcome(w2)

            if (!dominates(outcome, newOutcome)) {
                return { success: true, degradesOutcome: newOutcome }
            }
        }

        return { success: false }
    }
}


/*

 onlyMoveRefutations.attempt = (world) => {
    const replies = legalReplies(world)
    if (replies.length === 1) {
      return { success: false }
    }
    return { success: true }
 }

*/


function proveSegment(worlds, segment): InvariantNode | failure {
    for (let refutationClass of segment.refutations) {
        let neutralized = false

        for (let inst of instantiate(refutationClass, worlds)) {
            if (existsNeutralizer(inst, segment, worlds)) {
                neutralized = true
                break
            }
        }

        if (!neutralized) return failure
    }
    return deriveInvariant(segment.I_out, worlds)
}


function proveIdea(worlds, segments): boolean {
    let invariant = initialInvariant(worlds)

    for (segment of segments) {
        invariant = proveSegment(invariant.worlds, segment)
        if (invariant === 'failure') return false
    }

    return true
}



type WorldId = number

type Binding = Record<string, any>

type WorldSet = {
    worlds: Set<WorldId>
    bindings: Binding
}


interface RefutationClass<I extends Invariant> {
    name: string

    appliesTo(invariant: I): boolean


    instantiate(worlds: WorldSet): RefutationInstance[]


    intent: RefutationIntent


    neutralization: NeutralizationContract<I>
}

type Piece = ''

type RefutationIntent =
| { kind: 'RemoveThreat', target: Piece }
| { kind: 'BlockLine', target: Piece }
| { kind: 'EvadeTarget', target: Piece }
| { kind: 'GenerateCounterThreat' }
| { kind: 'DeclineCommitment' }


interface RefutationInstance {
    className: string
    witness: any
    world: WorldId
}



interface NeutralizationContract<I extends Invariant> {
    prove(
        instance: RefutationInstance,
        worlds: WorldSet
    ): NeutralizationResult<I>
}

type NeutralizationResult<I extends Invariant> =
    | { success: true, nextInvariant: I }
    | { success: false }

interface Invariant {
    kind: string
}


interface InvariantSchema<I extends Invariant> {
    refutations: RefutationClass<I>[]
}


const AttackInvariantSchema: InvariantSchema<AttackInvariant> = {
    refutations: [
        CaptureAttacker,
        BlockAttack,
        EvadeTarget
    ]
}


const CaptureAttacker: RefutationClass<AttackInvariant> = {
    name: 'CaptureAttacker',
    appliesTo: inv => inv.kind === 'Attack',
    intent: { kind: 'RemoveThreat', target: 'attacker' },

    instantiate(worlds) {
        return enumerateCaptures(worlds, /* attacker */)
    },

    neutralization: {
        prove(instance, worlds) {
            if (existsRecapture(instance, worlds)) {
                return {
                    success: true,
                    nextInvariant: MaterialGainInvariant
                }
            }

            if (existsStrongerThreat(instance, worlds)) {
                return {
                    success: true,
                    nextInvariant: AttackInvariant
                }
            }

            return { success: false }
        }
    }

}


const BlockAttack: RefutationClass<AttackInvariant> = {
  name: "block_attack",

  appliesTo: inv => inv.kind === "Attack",

  intent: { kind: "BlockLine", line: "attack_line" },

  instantiate(worlds) {
    return enumerateBlocks(worlds)
  },

  neutralization: {
    prove(instance, worlds) {
      if (existsBypass(instance, worlds)) {
        return {
          success: true,
          nextInvariant: AttackInvariant
        }
      }

      if (existsSacrificeToOpen(instance, worlds)) {
        return {
          success: true,
          nextInvariant: ForcedLineInvariant
        }
      }

      return { success: false }
    }
  }
}

const EvadeTarget: RefutationClass<AttackInvariant> = {
  name: "evade_target",

  appliesTo: inv => inv.kind === "Attack",

  intent: { kind: "EvadeTarget", target: "king" },

  instantiate(worlds) {
    return enumerateKingEscapes(worlds)
  },

  neutralization: {
    prove(instance, worlds) {
      if (leadsToMateNet(instance, worlds)) {
        return {
          success: true,
          nextInvariant: KingExposureInvariant
        }
      }

      return { success: false }
    }
  }
}


function proveSegment<I extends Invariant>(
    invariant: I,
    worlds: WorldSet,
    schema: InvariantSchema<I>
): Invariant | 'failure' {
    for (const refClass of schema.refutations) {
        for (const inst of refClass.instantiate(worlds)) {
            const result = refClass.neutralization.prove(inst, worlds)
            if (!result.success) return 'failure'
        }
    }

    return invariantTransition(invariant)
}


type Relation =
  | { kind: "attacks"; from: Piece; to: Piece | Square }
  | { kind: "checks"; from: Piece; to: King }
  | { kind: "pins"; from: Piece; pinned: Piece; target: Piece }
  | { kind: "occupies"; piece: Piece; square: Square }
  | { kind: "defends"; from: Piece; to: Piece }


type RefutationIntent =
  | { kind: "Remove"; target: Entity }
  | { kind: "BreakRelation"; relation: Relation }
  | { kind: "InvalidateTarget"; target: Entity }



  function refutationIntentsFor(rel: Relation): RefutationIntent[] {
  switch (rel.kind) {
    case "attacks":
    case "checks":
      return [
        { kind: "Remove", target: rel.from },
        { kind: "BreakRelation", relation: rel },
        { kind: "InvalidateTarget", target: rel.to }
      ]

    case "pins":
      return [
        { kind: "Remove", target: rel.from },
        { kind: "BreakRelation", relation: rel },
        { kind: "InvalidateTarget", target: rel.pinned }
      ]

    default:
      return []
  }
}



function refutationClassesFromRelations<I extends Invariant>(
  invariant: I,
  relations: Relation[]
): RefutationClass<I>[] {

  const intents = relations.flatMap(refutationIntentsFor)

  return deduplicateByIntent(
    intents.map(intent => makeRefutationClass(intent, invariant))
  )
}
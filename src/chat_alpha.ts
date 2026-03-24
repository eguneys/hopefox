export type NodeMetrics = {
  nodes: number
  leafNodes: number
  cutoffs: number

  branching: number
}


export type NodeHook<TMove> = (info: {
  depth: number;
  alpha: number;
  beta: number;
  value?: number;
  move?: TMove;
  isCutoff?: boolean;
}) => void;


export type GeneratedMove<TMove> = {
  move: TMove;
  featureContributions: FeatureContribution[];
  intentionDelta: ContextDelta
}



export type Pv = string
/**
 * Interface for the game state to ensure it supports backtracking.
 */
export interface GameState<TMove, Context> {
  get_lambda(): number
  get_max_nodes_per_move(): number
  generateMovesWithIntentions(isMaxizing: boolean): GeneratedMove<TMove>[];
  undoIntentionDelta(delta: ContextDelta): void;
  applyIntentionDelta(delta: ContextDelta): void;
  makeMove(move: TMove): void;
  unmakeMove(move: TMove): void;
  evaluate(isMaximizing: boolean): number; // Heuristic evaluation
  isGameOver(isMaximizing: boolean): boolean;
  cloneContext(): Context;
  getContext(): Context;
  diffContext(a: Context, b: Context): Omit<ContextDelta, 'features'>
  print_history(): void;
  get_san_move(move: TMove): string
}

export type FeatureStats = {
    totalContribution: number;
    occurrences: number;

    pvContribution: number; // only on best line 
    cutoffContribution: number; // caused pruning

    positiveOutcomes: number;
    negativeOutcomes: number;
}

export type FeatureContribution = {
    feature: string; // king_safety vs
    delta: number; // after - before
    weighted: number // effect on eval
}

export type MinMaxPlayer = 'min' | 'max'

export type IntentionType = string

export type Intention = {
  id: string;
  type: IntentionType // "fork" | "attack" | ...;

  payload: any
  player: MinMaxPlayer

  createdAtDepth: number;
  lastUpdatedDepth: number;

  status: "active" | "fulfilled" | "failed";
};

export function intentionEqual(a: Intention, b: Intention): boolean {
  return (
    a.status === b.status &&
    a.lastUpdatedDepth === b.lastUpdatedDepth
  );
}



export type ContextDelta = {
    features: FeatureContribution[];
    addedIntentions: Intention[]
    removedIntentions: Intention[]
    updatedIntentions: { before: Intention, after: Intention }[]
}

export type MoveDelta<TMove> = {
    move: TMove;
    intentionDelta: ContextDelta;
    featureContributions: FeatureContribution[];
    value: number;


    // NEW
    depth: number;
    isPV: boolean; // part of principal variation
    causedCutoff: boolean
    child?: MoveDelta<TMove> // link to next move in PV

    metrics: NodeMetrics
    cost: number
    adjustedValue: number
  };

export type SearchResult<TMove> = {
  value: number;
  bestMove: TMove | null;
  isCutoff: boolean;


  moveDeltas?: Array<MoveDelta<TMove>>;


  metrics: NodeMetrics
};
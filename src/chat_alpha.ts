// @ts-nocheck
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
  };

export type SearchResult<TMove> = {
  value: number;
  bestMove: TMove | null;
  isCutoff: boolean;


  moveDeltas?: Array<MoveDelta<TMove>>;
};

export function alphaBeta<TMove, Context>(
  state: GameState<TMove, Context>,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  onNode?: NodeHook<TMove>
): SearchResult<TMove> {
  // 1. Base Case
  if (depth === 0 || state.isGameOver()) {
    let res = {
      value: state.evaluate(),
      bestMove: null,
      isCutoff: false,
    };

    onNode?.({
        depth, alpha, beta, value: res.value
    })

    return res
  }

  const moves = state.getPossibleMoves(isMaximizing);

  if (moves.length === 0) {
    let res= {
      value: state.evaluate(),
      bestMove: null,
      isCutoff: false,
    };

    onNode?.({
        depth, alpha, beta, value: res.value
    })

    return res
  }

  let bestChild: MoveDelta<TMove> | undefined;
  let moveDeltas: MoveDelta<TMove>[] = []
  let bestMove: TMove | null = null;
  let isCutoff = false;

  if (isMaximizing) {
    let value = -Infinity;

    for (const move of moves) {

      const ctxBefore = state.cloneContext();

      state.makeMove(move);

      const ctxAfter = state.cloneContext();

      const delta = state.diffContext(ctxBefore, ctxAfter);

      const result = alphaBeta(state, depth - 1, alpha, beta, false);

      state.unmakeMove(move);

      moveDeltas.push({
        move,
        delta,
        value: result.value
      })

      if (result.value > value) {
        value = result.value;
        bestMove = move;

        bestChild = result.moveDeltas?.find(md => md.isPV)
      }

      alpha = Math.max(alpha, value);

      if (beta <= alpha) {
        isCutoff = true;

          onNode?.({
              depth, alpha, beta, value, isCutoff: true, move
          })

        break;
      }
    }

    return { value, bestMove, isCutoff };

  } else {
    let value = Infinity;

    for (const move of moves) {
      state.makeMove(move);

      const result = alphaBeta(state, depth - 1, alpha, beta, true);

      state.unmakeMove(move);

      if (result.value < value) {
        value = result.value;
        bestMove = move;
      }

      beta = Math.min(beta, value);

      if (beta <= alpha) {
        isCutoff = true;

        onNode?.({
            depth, alpha, beta, value, isCutoff: true, move
        })


        break;
      }
    }

    return { value, bestMove, isCutoff };
  }
}


export function extract_pv<TMove, Context>(rootState: GameState<TMove, Context>, depth: number) {
    let current = rootState;
    let pv: TMove[] = [];

    for (let d = 0; d < depth; d++) {
        const result = alphaBeta(current, depth - d, -Infinity, Infinity, true);
        if (!result.bestMove) break;

        pv.push(result.bestMove);
        current.makeMove(result.bestMove);
    }
    return pv
}
// @ts-nocheck
export type NodeHook<TMove> = (info: {
  depth: number;
  alpha: number;
  beta: number;
  value?: number;
  move?: TMove;
  isCutoff?: boolean;
}) => void;


/**
 * Interface for the game state to ensure it supports backtracking.
 */
export interface GameState<TMove, Context> {
  generateMovesWithIntentions(isMaxizing: boolean): [TMove, FeatureContribution[]][];
  makeMove(move: TMove, intentionDelta: ContextDelta): void;
  unmakeMove(move: TMove): void;
  evaluate(): number; // Heuristic evaluation
  isGameOver(): boolean;
  cloneContext(): Context;
  getContext(): Context;
  diffContext(a: Context, b: Context): ContextDelta
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

export type IntentionType = string

export type Intention = {
  id: string;
  type: IntentionType // "fork" | "attack" | ...;

  createdAtDepth: number;
  lastUpdatedDepth: number;

  status: "active" | "fulfilled" | "failed";
};



export type ContextDelta = {
    features: FeatureContribution[];
    addedIntentions: Intention[]
    removedIntentions: Intention[]
    updatedIntentions: Intention[]
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

    /*

    // is this here, where is delta?

    for (const f of delta.features) {
       const stats = featureTable[f.name] ?? initStats();
   
       stats.totalContribution += f.weighted;
       stats.occurences++;

       if (isPV) stats.pvContribution += f.weighted;
       if (causedCutoff) stats.cutoffContribution += f.weighted;

       if (result.value > 0) stats.positiveOutcomes++;
       else stats.negativeOutcomes++;

    }

    */


    /*

       // where is these metrics computed and used

       avgImpact = totalContribution / occurrences

       pvScore = pvContribution / occurrences

       stability = positiveOutcomes


       if (avgImpact > threshold && stability < 0.5) {
         // fake heuristic
       }


       if (pvScore high && stability high) {
         // reliable heuristic
       }

       if (Math.abs(avgImpact) small && occurrences high) {
         // noise
       }
    */


    /*

      Print a table ?

      Feature           Avg     Stability   PV
      -----------------------------------------
      king_safety       +0.82   0.91        strong
      fork_pressure     +1.20   0.38        misleading
      mobility          +0.05   0.52        neutral

    */

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
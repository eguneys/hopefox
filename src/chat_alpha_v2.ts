import { ContextDelta, FeatureStats, GameState, MoveDelta, NodeHook, SearchResult } from "./chat_alpha";

/*
generateMovesWithIntentions() {
  const moves = [];

  // detect patterns
  const forks = detectForks(position);

  for (const fork of forks) {
    moves.push({
      move: forkMove,
      intentionDelta: {
        add: [{ type: "fork", targets: [...] }]
      }
    });
  }

  return { moves };
}

*/

export type FeatureTable = Record<string, FeatureStats>;

function initStats(): FeatureStats {
  return {
    totalContribution: 0,
    occurrences: 0,
    pvContribution: 0,
    cutoffContribution: 0,
    positiveOutcomes: 0,
    negativeOutcomes: 0,
  };
}


function updateFeatureStats(
  table: FeatureTable,
  delta: ContextDelta,
  resultValue: number,
  isPV: boolean,
  causedCutoff: boolean
) {
  for (const f of delta.features) {
    const stats = table[f.feature] ??= initStats();

    stats.totalContribution += f.weighted;
    stats.occurrences++;

    if (isPV) stats.pvContribution += f.weighted;
    if (causedCutoff) stats.cutoffContribution += f.weighted;

    if (resultValue > 0) stats.positiveOutcomes++;
    else stats.negativeOutcomes++;
  }
}



export function alphaBeta<TMove, Context>(
  state: GameState<TMove, Context>,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  featureTable: FeatureTable,
  onNode?: NodeHook<TMove>
): SearchResult<TMove> {

  // BASE
  if (depth === 0 || state.isGameOver()) {
    const value = state.evaluate();

    onNode?.({ depth, alpha, beta, value });

    return {
      value,
      bestMove: null,
      isCutoff: false,
      moveDeltas: [],
    };
  }

  //const moves = state.getPossibleMoves(isMaximizing);

  const movesAndFeatures = state.generateMovesWithIntentions(isMaximizing)

  if (movesAndFeatures.length === 0) {
    const value = state.evaluate();

    onNode?.({ depth, alpha, beta, value });

    return {
      value,
      bestMove: null,
      isCutoff: false,
      moveDeltas: [],
    };
  }

  let bestMove: TMove | null = null;
  let isCutoff = false;
  const moveDeltas: MoveDelta<TMove>[] = [];

  if (isMaximizing) {
    let value = -Infinity;

    for (const [move, featureContributions] of movesAndFeatures) {
      const ctxBefore = state.cloneContext();

      state.makeMove(move);
      const result = alphaBeta(
        state,
        depth - 1,
        alpha,
        beta,
        false,
        featureTable,
        onNode
      );


      const ctxAfter = state.getContext()
      const delta = state.diffContext(ctxBefore, ctxAfter);
      let intentionDelta = { features: featureContributions, ...delta }
      state.applyIntentionDelta(delta)
      state.unmakeMove(move);

      moveDeltas.push({
        move,
        featureContributions,
        intentionDelta,
        value: result.value,
        depth,
        isPV: false,
        causedCutoff: false,
      });

      if (result.value > value) {
        value = result.value;
        bestMove = move;
      }

      alpha = Math.max(alpha, value);

      if (beta <= alpha) {
        isCutoff = true;

        moveDeltas[moveDeltas.length - 1].causedCutoff = true;

        onNode?.({ depth, alpha, beta, value, isCutoff: true, move });

        break;
      }
    }

    // mark PV move
    for (const m of moveDeltas) {
      if (m.move === bestMove) {
        m.isPV = true;

        updateFeatureStats(
          featureTable,
          m.intentionDelta,
          m.value,
          true,
          m.causedCutoff
        );
      } else {
        updateFeatureStats(
          featureTable,
          m.intentionDelta,
          m.value,
          false,
          m.causedCutoff
        );
      }
    }

    return { value, bestMove, isCutoff, moveDeltas };

  } else {
    let value = Infinity;

    for (const [move, featureContributions] of movesAndFeatures) {
      const ctxBefore = state.cloneContext();

      state.makeMove(move);


      const result = alphaBeta(
        state,
        depth - 1,
        alpha,
        beta,
        true,
        featureTable,
        onNode
      );


      const ctxAfter = state.getContext();
      const delta = state.diffContext(ctxBefore, ctxAfter);

      let intentionDelta = { features: featureContributions, ...delta }
      state.applyIntentionDelta(delta)
      state.unmakeMove(move);

      moveDeltas.push({
        move,
        intentionDelta,
        featureContributions,
        value: result.value,
        depth,
        isPV: false,
        causedCutoff: false,
      });

      if (result.value < value) {
        value = result.value;
        bestMove = move;
      }

      beta = Math.min(beta, value);

      if (beta <= alpha) {
        isCutoff = true;

        moveDeltas[moveDeltas.length - 1].causedCutoff = true;

        onNode?.({ depth, alpha, beta, value, isCutoff: true, move });

        break;
      }
    }

    // mark PV move
    for (const m of moveDeltas) {
      if (m.move === bestMove) {
        m.isPV = true;

        updateFeatureStats(
          featureTable,
          m.intentionDelta,
          m.value,
          true,
          m.causedCutoff
        );
      } else {
        updateFeatureStats(
          featureTable,
          m.intentionDelta,
          m.value,
          false,
          m.causedCutoff
        );
      }
    }

    return { value, bestMove, isCutoff, moveDeltas };
  }
}


export function analyzeFeatures(table: FeatureTable) {
  const result = [];

  for (const [feature, s] of Object.entries(table)) {
    const avg = s.totalContribution / s.occurrences;
    const stability = s.positiveOutcomes / s.occurrences;
    const pvScore = s.pvContribution / s.occurrences;

    let label = "neutral";

    if (avg > 0.5 && stability < 0.5) label = "misleading";
    else if (pvScore > 0.3 && stability > 0.7) label = "strong";
    else if (Math.abs(avg) < 0.1) label = "noise";

    result.push({
      feature,
      avg,
      stability,
      pvScore,
      label,
    });
  }

  return result.sort((a, b) => b.avg - a.avg);
}


export function exampleUsage<TMove, Context>(state: GameState<TMove, Context>, depth: number) {
   
    const featureTable: FeatureTable = {};

    const result = alphaBeta(
        state,
        depth,
        -Infinity,
        Infinity,
        true,
        featureTable
    );

    const report = analyzeFeatures(featureTable);

    console.table(report);
}
   
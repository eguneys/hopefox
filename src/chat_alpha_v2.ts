import { ContextDelta, FeatureContribution, FeatureStats, GameState, MoveDelta, NodeHook, Pv, SearchResult } from "./chat_alpha";
import { Position } from "./distill/chess";
import { PositionMaterializer, WorldId } from "./pos_materializer";

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

    for (const m of movesAndFeatures) {
      let { move } = m
      const ctxBefore = state.cloneContext();

      state.applyIntentionDelta(m.intentionDelta)
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


      state.unmakeMove(move);
      state.undoIntentionDelta(m.intentionDelta)

      const ctxAfter = state.getContext()
      const structuralDelta = state.diffContext(ctxBefore, ctxAfter);

      const fullDelta = { features: m.featureContributions, ...structuralDelta }

      moveDeltas.push({
        move,
        featureContributions: m.featureContributions,
        intentionDelta: fullDelta,
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

    for (const m of movesAndFeatures) {
      let { move } = m
      const ctxBefore = state.cloneContext();

      state.applyIntentionDelta(m.intentionDelta)
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


      state.unmakeMove(move);
      state.undoIntentionDelta(m.intentionDelta)

      const ctxAfter = state.getContext();
      const structuralDelta = state.diffContext(ctxBefore, ctxAfter);

      let fullDelta = { features: m.featureContributions, ...structuralDelta }

      moveDeltas.push({
        move: m.move,
        featureContributions: m.featureContributions,
        intentionDelta: fullDelta,
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


export function exampleUsage<TMove, Context>(
  state: GameState<TMove, Context>,
  depth: number,
  solution: Pv[]
) {
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

  //console.table(report);

  let result_pv = state.get_pv(result)

  //console.log("PV:", result_pv);

  const cmp = compareLines(result_pv, solution);
  //console.log("Match length:", cmp.matchLength);

  const evalRes = evaluatePrediction(result_pv, solution);
  //console.log("TP/FP/FN:", evalRes);

  const metrics = evaluateLine(result_pv, solution)


  /*
  console.log("Match Length:", metrics.matchLength);
  console.log("Divergence Index:", metrics.divergenceIndex);
  console.log("Accuracy:", metrics.accuracy.toFixed(2));
  console.log("Correct First Move:", metrics.correctFirstMove);
  */

  return {
    report,
    result_pv,
    cmp,
    evalRes,
    metrics,
    pv: result_pv,
    solution
  }
}

function evaluatePrediction<TMove>(
  pv: TMove[],
  solution: TMove[]
) {
  const isMatch = solution.every((m, i) => pv[i] === m);

  if (isMatch) {
    return { TP: 1, FP: 0, FN: 0, TN: 0 };
  } else {
    return { TP: 0, FP: 1, FN: 1, TN: 0 };
  }
}


function compareLines<TMove>(pv: TMove[], solution: TMove[]) {
  let matchLength = 0;

  for (let i = 0; i < Math.min(pv.length, solution.length); i++) {
    if (pv[i] !== solution[i]) break;
    matchLength++;
  }

  return {
    matchLength,
    fullMatch: matchLength === solution.length
  };
}


function classifyRootMoves<TMove>(
  rootMoves: TMove[],
  bestMove: TMove | null,
  solutionMoves: TMove[]
) {
  let TP = 0, FP = 0, FN = 0, TN = 0;

  for (const move of rootMoves) {
    const isSolution = solutionMoves.includes(move);
    const isChosen = move === bestMove;

    if (isSolution && isChosen) TP++;
    else if (!isSolution && isChosen) FP++;
    else if (isSolution && !isChosen) FN++;
    else TN++;
  }

  return { TP, FP, FN, TN };
}


type LineMetrics = {
  matchLength: number;
  divergenceIndex: number;   // -1 if fully matches
  accuracy: number;
  correctFirstMove: boolean;
};

export function evaluateLine<TMove>(
  pv: TMove[],
  solution: TMove[]
): LineMetrics {

  let matchLength = 0;
  let divergenceIndex = -1;

  const minLen = Math.min(pv.length, solution.length);

  for (let i = 0; i < minLen; i++) {
    if (pv[i] === solution[i]) {
      matchLength++;
    } else {
      divergenceIndex = i;
      break;
    }
  }

  // full match case
  if (divergenceIndex === -1 && pv.length >= solution.length) {
    divergenceIndex = -1;
  } else if (divergenceIndex === -1) {
    divergenceIndex = matchLength; // pv ended early
  }

  const accuracy = solution.length > 0
    ? matchLength / solution.length
    : 0;

  const correctFirstMove =
    pv.length > 0 && solution.length > 0 && pv[0] === solution[0];

  return {
    matchLength,
    divergenceIndex,
    accuracy,
    correctFirstMove
  };
}
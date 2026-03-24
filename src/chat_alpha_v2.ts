import { ContextDelta, FeatureContribution, FeatureStats, GameState, MinMaxPlayer, MoveDelta, NodeHook, NodeMetrics, Pv, SearchResult } from "./chat_alpha";
import { Position } from "./distill/chess";
import { Move } from "./distill/types";
import { PositionMaterializer, WorldId } from "./pos_materializer";


// const LAMBDA = 0.2
// too high engine becomes lazy
// too low no effect

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

  let LAMBDA = state.get_lambda()

  // BASE
  if (depth === 0 || state.isGameOver(isMaximizing)) {
    const value = state.evaluate(isMaximizing);

    onNode?.({ depth, alpha, beta, value });

    return {
      value,
      bestMove: null,
      isCutoff: false,
      moveDeltas: [],
      metrics: {
        nodes: 1,
        leafNodes: 1,
        cutoffs: 0,
        branching: 0
      }
    };
  }

  let movesAndFeatures = state.generateMovesWithIntentions(isMaximizing)

  if (movesAndFeatures.length === 0) {
    const value = state.evaluate(isMaximizing);

    onNode?.({ depth, alpha, beta, value });

    return {
      value,
      bestMove: null,
      isCutoff: false,
      moveDeltas: [],
      metrics: {
        nodes: 1,
        leafNodes: 1,
        cutoffs: 0,
        branching: 0
      }
    };
  }

  let bestChild: MoveDelta<TMove> | undefined
  let bestMove: TMove | null = null;
  let isCutoff = false;
  const moveDeltas: MoveDelta<TMove>[] = [];


  let totalNodes = 1;
  let totalLeafs = 0;
  let totalCutoffs = 0;


  if (isMaximizing) {
    //let value = -Infinity;
    let bestAdjustedValue = -Infinity

    if (depth === 5) {
      //movesAndFeatures = movesAndFeatures.slice(0, 1)
    }
    for (const m of movesAndFeatures) {

      let currentChild: MoveDelta<TMove> | undefined

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
      //result.value = -result.value

      totalNodes += result.metrics.nodes
      totalLeafs += result.metrics.leafNodes
      totalCutoffs += result.metrics.cutoffs

      const cost = computeCost(result.metrics)

      //const adjustedValue = result.value - LAMBDA * cost
      const adjustedValue = result.value - LAMBDA * cost / depth;

      //console.log(result.value, state.print_history())
      state.unmakeMove(move);
      state.undoIntentionDelta(m.intentionDelta)

      currentChild = result.moveDeltas?.find(md => md.isPV)

      const ctxAfter = state.getContext()
      const structuralDelta = state.diffContext(ctxBefore, ctxAfter);

      const fullDelta = { features: m.featureContributions, ...structuralDelta }



      const currentMoveDelta: MoveDelta<TMove> = {
        move,
        featureContributions: m.featureContributions,
        intentionDelta: fullDelta,
        value: result.value,
        depth,
        isPV: false,
        causedCutoff: false,
        child: currentChild,
        metrics: result.metrics,
        adjustedValue,
        cost
      }

      moveDeltas.push(currentMoveDelta);

      //if (result.value > value) {
      if (adjustedValue > bestAdjustedValue) {
        //value = result.value;
        bestAdjustedValue = adjustedValue
        bestMove = move;
        bestChild = result.moveDeltas?.find(md => md.isPV)
      }


      //alpha = Math.max(alpha, value);
      alpha = Math.max(alpha, bestAdjustedValue);

      if (beta <= alpha) {
        isCutoff = true;
        totalCutoffs += 1;

        currentMoveDelta.causedCutoff = true;

        onNode?.({ depth, alpha, beta, value: bestAdjustedValue, isCutoff: true, move });

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

    return { value: bestAdjustedValue, bestMove, isCutoff, moveDeltas, metrics: { nodes: totalNodes, leafNodes: totalLeafs, cutoffs: totalCutoffs, branching: moveDeltas.length } };

  } else {
    //let value = Infinity;
    let bestAdjustedValue = Infinity;

    for (const m of movesAndFeatures) {

      let currentChild: MoveDelta<TMove> | undefined

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
      //result.value = -result.value
      totalNodes += result.metrics.nodes
      totalLeafs += result.metrics.leafNodes
      totalCutoffs += result.metrics.cutoffs

      const cost = computeCost(result.metrics)

      //const adjustedValue = result.value - LAMBDA * cost;
      const adjustedValue = result.value - LAMBDA * cost / depth



      //console.log(result.value, state.print_history())
      state.unmakeMove(move);
      state.undoIntentionDelta(m.intentionDelta)

      currentChild = result.moveDeltas?.find(md => md.isPV)

      const ctxAfter = state.getContext();
      const structuralDelta = state.diffContext(ctxBefore, ctxAfter);

      let fullDelta = { features: m.featureContributions, ...structuralDelta }


      const currentMoveDelta: MoveDelta<TMove> = {
        move,
        featureContributions: m.featureContributions,
        intentionDelta: fullDelta,
        value: result.value,
        depth,
        isPV: false,
        causedCutoff: false,
        child: currentChild,
        metrics: result.metrics,
        adjustedValue,
        cost
      }

      moveDeltas.push(currentMoveDelta);



      //if (result.value < value) {
      if (adjustedValue < bestAdjustedValue) {
        //value = result.value;
        bestAdjustedValue = adjustedValue
        bestMove = move;
        bestChild = result.moveDeltas?.find(md => md.isPV)
      }

      //beta = Math.min(beta, value);
      beta = Math.min(beta, bestAdjustedValue);

      if (beta <= alpha) {
        isCutoff = true;
        totalCutoffs += 1;

        moveDeltas[moveDeltas.length - 1].causedCutoff = true;

        onNode?.({ depth, alpha, beta, value: bestAdjustedValue, isCutoff: true, move });

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

    return { value: bestAdjustedValue, bestMove, isCutoff, moveDeltas, metrics: { nodes: totalNodes, leafNodes: totalLeafs, cutoffs: totalCutoffs, branching: moveDeltas.length } };
  }
}

const percent = (v: number) => Math.round(v * 100)

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
      avg: percent(avg),
      stability: percent(stability),
      pvScore: percent(pvScore),
      label,
    });
  }

  return result.sort((a, b) => b.avg - a.avg);
}


export function exampleUsage<Context>(
  mz: PositionMaterializer,
  state: GameState<WorldId, Context>,
  depth: number,
  solution: Pv[],
  multiPV: number
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

  //let result_pv = state.get_pv(result)

  //console.log("PV:", result_pv);

  //const cmp = compareLines(result_pv, solution);
  //console.log("Match length:", cmp.matchLength);

  //console.log("TP/FP/FN:", evalRes);

  //const metrics = evaluateLine(result_pv, solution)


  /*
  console.log("Match Length:", metrics.matchLength);
  console.log("Divergence Index:", metrics.divergenceIndex);
  console.log("Accuracy:", metrics.accuracy.toFixed(2));
  console.log("Correct First Move:", metrics.correctFirstMove);
  */

  //let result_pvFeatures = state.get_pv_features(result)
  //explainDivergence(result_pv, result_pvFeatures, solution)


  const rootPV = result.moveDeltas?.find(m => m.isPV)

  const { line, features } = extractPV(rootPV)
  let result_pv = line.map(w => mz.last_san(w))

  let k = multiPV
  //const topK = result.moveDeltas?.sort((a, b) => b.value - a.value).slice(0, k)
  const topK = result.moveDeltas?.sort((a, b) => b.adjustedValue - a.adjustedValue).slice(0, k)

  //console.log(1, mz.last_san(1))
  for (let i = 0; i < 38; i++) {
    //console.log(i, mz.last_san(i))
  }

  const evalRes = evaluatePrediction(result_pv, solution);

  return {
    report,
    evalRes,
    solution,
    rootPV,
    topK
  }
}

type SAN = string
export function explainMultiPv(rootPV: MoveDelta<WorldId> | undefined, solution: SAN[], topK: MoveDelta<WorldId>[] | undefined, mz: PositionMaterializer) {

  const { line, features } = extractPV(rootPV)
  let result_pv = line.map(w => mz.last_san(w))

  console.log('PV Preference against solution:')
  explainPVPreference_(result_pv, features, solution, [])


  console.log('PV Preference against Top 2:')
  const pvLines = topK?.map(md => extractPV(md))
  if (pvLines && pvLines.length >= 2)
    explainPVPreference_(_map_moves_to_sans(mz, pvLines![0].line), pvLines![0].features, _map_moves_to_sans(mz, pvLines![1].line), pvLines![1].features)

}

function _map_moves_to_sans(mz: PositionMaterializer, md: WorldId[]) {
  return md.map(m => mz.last_san(m))
}

function evaluatePrediction<TMove>(
  pv: TMove[],
  solution: TMove[]
) {

  let half_solution = []
  for (let i = 0; i < 1; i++) {

    half_solution.push(solution[i])
  }
  const isMatch = half_solution.every((m, i) => pv[i] === m);
  const isNegative = pv.length === 0

  if (isNegative) {
    return { TP: 0, FP: 0, FN: 1, TN: 0 };
  }
  if (isMatch) {
    return { TP: 1, FP: 0, FN: 0, TN: 0 };
  } else {
    return { TP: 0, FP: 1, FN: 0, TN: 0 };
  }
 
  /*
  if (isMatch) {
    return { TP: 1, FP: 0, FN: 0, TN: 0 };
  } else {
    return { TP: 0, FP: 1, FN: 1, TN: 0 };
  }
    */
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


export function explainDivergence<TMove>(
  pv: TMove[],
  pvFeatures: FeatureContribution[][],
  solution: TMove[]
) {
  let divergenceIndex = -1;

  for (let i = 0; i < Math.min(pv.length, solution.length); i++) {
    if (pv[i] !== solution[i]) {
      divergenceIndex = i;
      break;
    }
  }

  if (divergenceIndex === -1) {
    console.log("No divergence — solution matched.");
    return;
  }

  const features = pvFeatures[divergenceIndex];

  console.log("Divergence at move:", divergenceIndex);
  console.log("Engine move:", pv[divergenceIndex]);
  console.log("Expected move:", solution[divergenceIndex]);

  // rank features
  const ranked = [...features].sort(
    (a, b) => Math.abs(b.weighted) - Math.abs(a.weighted)
  );

  console.log("Top contributing features:");

  for (const f of ranked.slice(0, 5)) {
    console.log(
      `${f.feature}: Δ=${f.delta}, impact=${f.weighted.toFixed(2)}`
    );
  }
}


function extractPV<TMove>(root: MoveDelta<TMove> | undefined) {
  const line: TMove[] = [];
  const features: FeatureContribution[][] = [];

  let current = root;

  while (current) {
    line.push(current.move)
    features.push(current.featureContributions)
    current = current.child
  }
  return { line, features }
}


function findDivergenceIndex<TMove>(
  a: TMove[],
  b: TMove[]
): number {
  const len = Math.min(a.length, b.length)


  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) {
      return i;
    }
  }

  return -1
}


function aggregateFeatures(features: FeatureContribution[]) {
  const map: Record<string, number> = {}

  for (const f of features) {
    map[f.feature] = (map[f.feature] ?? 0) + f.weighted
  }

  return map
}


function compareFeatureMaps(
  a: Record<string, number>,
  b: Record<string, number>
) {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

  const diffs: Array<{ feature: string, delta: number }> = []

  for (const key of allKeys) {
    const va = a[key] ?? 0
    const vb = b[key] ?? 0

    diffs.push({
      feature: key,
      delta: va - vb
    })
  }

  return diffs.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
}

export function explainPVPreference<TMove>(
  pv1: MoveDelta<TMove>,
  pv2: MoveDelta<TMove>,
) {
  let { line: line1, features: features1 } = extractPV(pv1)
  let { line: line2, features: features2 } = extractPV(pv2)

  explainPVPreference_(line1, features1, line2, features2)
}

export function explainPVPreference_<TMove>(
  line1: TMove[],
  features1: FeatureContribution[][],
  line2: TMove[],
  features2: FeatureContribution[][]
) {
  const idx = findDivergenceIndex(line1, line2)

  if (idx === -1) {
    console.log("Lines do not diverge.")
    return
  }

  const f1 = aggregateFeatures(features1[idx] ?? [])
  const f2 = aggregateFeatures(features2[idx] ?? [])

  const diffs = compareFeatureMaps(f1, f2)

  console.log("Divergence at move: ", idx)
  console.log("PV1 move:", line1[idx])
  console.log("PV2 move:", line2[idx])

  console.log("Top feature differences:")

  for (const d of diffs.slice(0, 5)) {
     console.log(`${d.feature}: Δ=${d.delta.toFixed(2)}`);
  }
}

export function printMultiPV(pvLines: MoveDelta<WorldId>[], mz: PositionMaterializer) {
  pvLines.map((pv, i) => {
    let pvLine = extractPV(pv)
    console.log(`#${i + 1} | Eval Adj: ${pv.adjustedValue.toFixed(2)} | Eval: ${pv.value.toFixed(2)} | Line:`, _map_moves_to_sans(mz, pvLine.line))
  })
}


/*

#1 | Eval: +1.20 | Line: Bf7+ ...
#2 | Eval: +0.95 | Line: Qd5 ...
#3 | Eval: +0.40 | Line: Re1 ...

Solution rank: 2
*/
function findSolutionRank<TMove>(pvLines: MoveDelta<TMove>[], solution: TMove[]) {
  for (let i = 0; i < pvLines.length; i++) {
    const pv = extractPV(pvLines[i]).line

    if (solution.every((m, j) => pv[j] === m)) {
      return i + 1
    }
  }
  return -1
}


// TODO: Track Score gaps
/* gap = pvLines[0].value - pvLines[1].value */



function aggregatePVFeatures(
  pvFeatures: FeatureContribution[][]
) {
  const map: Record<string, number> = {};

  for (const step of pvFeatures) {
    for (const f of step) {
      const key = `${'f.owner'}:${f.feature}`;
      map[key] = (map[key] ?? 0) + f.weighted;
    }
  }

  return map;
}


function splitFeatures(map: any) {
  const my: any[] = [];
  const opponent: any[] = [];

  for (const [key, value] of Object.entries(map)) {
    const [owner, feature] = key.split(":");

    if (owner === "max") {
      my.push({ feature, value });
    } else {
      opponent.push({ feature, value });
    }
  }

  return {
    myTopFeatures: my.sort((a,b) => Math.abs(b.value)-Math.abs(a.value)).slice(0,5),
    opponentTopFeatures: opponent.sort((a,b) => Math.abs(b.value)-Math.abs(a.value)).slice(0,5)
  };
}

type PVReport<TMove> = {
  value: number;
  line: TMove[];

  // NEW
  summary: {
    myTopFeatures: any
    opponentTopFeatures: any

    //activeIntentions: Intention[];
    //failedIntentions: Intention[];
  };
};

function buildPVReport<TMove>(
  root: MoveDelta<TMove>,
  //initialContext: Context
): PVReport<TMove> {

  const { line, features } = extractPV(root);

  const featureMap = aggregatePVFeatures(features);
  const split = splitFeatures(featureMap);

  //const intentions = collectIntentionsAlongPV(root, initialContext);

  return {
    value: root.value,
    line,
    summary: {
      ...split,
      //activeIntentions: intentions.active,
      //failedIntentions: intentions.failed
    }
  };
}


export function printMultiPVReports(
  mz: PositionMaterializer,
  roots: MoveDelta<WorldId>[],
  //ctx: Context
) {
  roots.forEach((root, i) => {
    const report = buildPVReport(root)//, ctx);

    console.log(`\n#${i+1} Eval: ${report.value}`);

    console.log("Line:", _map_moves_to_sans(mz, report.line));

    console.log("My Features:");
    report.summary.myTopFeatures.forEach((f: any) =>
      console.log(`  ${f.feature}: ${f.value.toFixed(2)}`)
    );

    console.log("Opponent Features:");
    report.summary.opponentTopFeatures.forEach((f: any) =>
      console.log(`  ${f.feature}: ${f.value.toFixed(2)}`)
    );

    /*
    console.log("Active Intentions:",
      report.summary.activeIntentions.map(i => i.type)
    );
    */
  });
}



function focusScore(m: NodeMetrics) {
  return m.nodes / Math.max(1, m.branching)
}

function moveFocus<TMove>(m: MoveDelta<TMove>) {
  return m.metrics.nodes
}


// sort moves by score = evaluation / nodes

// search steering based on cost
/*
if (result.metrics.nodes > MAX_NODE_BUDGET_PER_MOVE) {
  deprioritize move
}
*/
// visualization
/*

Depth 3:
  Bf7+ → nodes: 8
    → child: nodes: 5
      → child: nodes: 2

  Qd5 → nodes: 3   ← clean line
*/

/* 
Move: Bf7+  | value: +1.2 | nodes: 30 | cost: 3.4 | adj: +0.5
Move: Qd5   | value: +1.0 | nodes: 5  | cost: 1.6 | adj: +0.8  ← chosen
*/

/* Final Form

Root

├─ Bf7+  val:+1.20 adj:+0.50 nodes:30 ⚠
│   [fork:+1.2, king_exp:+0.8]
│  └─ Ke7 val:+0.80 nodes:12

├─ Qd5   val:+1.00 adj:+0.80 nodes:5 ★
│   [center:+0.7, pressure:+0.5]
│  └─ Ke7 val:+0.60 nodes:3

└─ Re1   val:+0.40 adj:+0.10 nodes:20


*/

function computeCost(m: NodeMetrics): number {
  //return Math.log(m.nodes + 1)

  // more nodes -> worse
  // wider branching -> worse
  // more cutoffs -> better (good pruning)
  return (
    Math.log(m.nodes + 1) + 0.5 * m.branching - 0.3 * m.cutoffs
  )
}


/*

for (const m of moves) {
  const localBudget = { remaining: MAX_NODES_PER_MOVE };

  const result = alphaBeta(..., localBudget);
}
*/

/*

depth = 1 → evaluate
depth = 2 → refine
depth = 3 → refine further

*/






function printTree<TMove>(
  node: MoveDelta<TMove>,
  indent = "",
  isLast = true,
  isRoot = false
) {
  const prefix = isRoot
    ? ""
    : indent + (isLast ? "└─ " : "├─ ");

  const nextIndent = indent + (isLast ? "   " : "│  ");

  const star = node.isPV ? " ★" : "";

  console.log(
    `${prefix}${node.move} ` +
    `val:${node.value.toFixed(2)} ` +
    `adj:${node.adjustedValue.toFixed(2)} ` +
    `nodes:${node.metrics.nodes}${star}`,
    shortFeatures(node.featureContributions)
  );

  if (node.child) {
    printTree(node.child, nextIndent, true);
  }

  /*
  if (node.children) {
    node.children.forEach((child, i) => {
      printTree(child, nextIndent, i === node.children.length - 1);
    });
  }
    */
}

function shortFeatures(f: FeatureContribution[]) {
  return f
    .sort((a,b)=>Math.abs(b.weighted)-Math.abs(a.weighted))
    .slice(0,2)
    .map(f => `${f.feature}:${f.weighted.toFixed(1)}`)
    .join(", ");
}

/*

★ = chosen PV
! = cutoff happened
⚠ = high cost node

:example
Bf7+ val:+1.2 nodes:30 ⚠
Qd5  val:+1.0 nodes:5  ★
*/


export function printNode(
  mz: PositionMaterializer,
  moveDeltas: MoveDelta<WorldId>[],
  indent = "",
  isRoot = true
) {
  const sorted = [...moveDeltas].sort((a, b) => b.value - a.value);

  sorted.forEach((md, i) => {
    const isLast = i === sorted.length - 1;
    const prefix = isRoot
      ? ""
      : indent + (isLast ? "└─ " : "├─ ");

    const nextIndent = indent + (isLast ? "   " : "│  ");

    const star = md.isPV ? " ★" : "";

    console.log(
      `${prefix}${mz.last_san(md.move)} ` +
      `val:${md.value.toFixed(2)} ` +
      `adj:${md.adjustedValue.toFixed(2)} ` +
      `cost:${md.cost.toFixed(2)} ` +
      `nodes:${md.metrics.nodes}${star} ` +
      'feat:' + shortFeatures(md.featureContributions)
    );

    // recurse into THIS move's subtree
    if (md.child) {
      printNode(mz, [md.child], nextIndent, false);
    }
  });
}
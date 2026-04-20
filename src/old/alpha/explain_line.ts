import { FeatureContribution, GameState, Intention, NodeMetrics } from "./chat_alpha";
import { alphaBeta } from "./chat_alpha_v2";
import { PositionMaterializer, WorldId } from "./pos_materializer";

export type LineStep<TMove> = {
  move: TMove;

  value: number;

  features: FeatureContribution[];

  intentions: {
    active: Intention[];
    failed: Intention[];
  };

  metrics?: NodeMetrics; // optional if you run search per step
};


export function explainLine<TMove, Context>(
  state: GameState<TMove, Context>,
  line: TMove[],
  depthPerMove = 0 // optional mini-search
): LineStep<TMove>[] {

  const steps: LineStep<TMove>[] = [];

  let isMaximizing = true
  for (let i = 0; i < line.length; i++) {
    const move = line[i];

    const generated = state.generateMovesWithIntentions(isMaximizing)
    isMaximizing = !isMaximizing

    const m = generated.find(g => g.move === move);

    if (!m) {
      let list = generated.map(g => state.get_san_move(g.move))
      throw new Error(`Move not found in generated moves: ${state.get_san_move(move)} in ${list.join(', ')}`);
    }

    // apply
    state.applyIntentionDelta(m.intentionDelta);
    state.makeMove(move);

    // evaluate (or shallow search)
    let value: number;

    if (depthPerMove > 0) {
      const result = alphaBeta(
        state,
        depthPerMove,
        -Infinity,
        Infinity,
        isMaximizing,
        {}
      );
      value = result.value;
    } else {
      value = state.evaluate(isMaximizing)
    }

    // collect intentions
    const active: Intention[] = [];
    const failed: Intention[] = [];

    /*
    for (const intent of state.context.intentions.values()) {
      if (intent.status === "active") active.push(intent);
      if (intent.status === "failed") failed.push(intent);
    }
      */

    steps.push({
      move,
      value,
      features: m.featureContributions,
      intentions: { active, failed }
    });
  }

  return steps;
}

export function printLineExplanation(mz: PositionMaterializer, steps: LineStep<WorldId>[]) {
  steps.forEach((s, i) => {
    console.log(`\nMove ${i+1}: ${mz.last_san(s.move)}`);
    console.log(`  Eval: ${s.value.toFixed(2)}`);

    const topFeatures = s.features
      .sort((a,b)=>Math.abs(b.weighted)-Math.abs(a.weighted))
      .slice(0, 3);

    console.log("  Features:");
    topFeatures.forEach(f =>
      console.log(`    ${f.feature}: ${f.weighted.toFixed(2)}`)
    );

    console.log("  Active intentions:",
      s.intentions.active.map(i => i.type)
    );

    if (s.intentions.failed.length > 0) {
      console.log("  Failed intentions:",
        s.intentions.failed.map(i => i.type)
      );
    }
  });
}
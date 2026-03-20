/**
 * Interface for the game state to ensure it supports backtracking.
 */
export interface GameState<TMove> {
  getPossibleMoves(): TMove[];
  makeMove(move: TMove): void;
  unmakeMove(move: TMove): void;
  evaluate(): number; // Heuristic evaluation
  isGameOver(): boolean;
}

/**
 * Alpha-Beta Pruning with Make/Unmake logic.
 * * @param state The current mutable game state.
 * @param depth Current search depth remaining.
 * @param alpha The best score the maximizing player is assured of.
 * @param beta The moves the minimizing player is assured of.
 * @param isMaximizing Whether it's the Maximizer's or Minimizer's turn.
 */
export function alphaBeta<TMove>(
  state: GameState<TMove>,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): number {
  // 1. Base Case: Leaf node or terminal state
  if (depth === 0 || state.isGameOver()) {
    return state.evaluate();
  }

  const moves = state.getPossibleMoves();

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      state.makeMove(move); // Change state
      const evaluation = alphaBeta(state, depth - 1, alpha, beta, false);
      state.unmakeMove(move); // Revert state

      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      
      if (beta <= alpha) break; // Beta cut-off
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      state.makeMove(move);
      const evaluation = alphaBeta(state, depth - 1, alpha, beta, true);
      state.unmakeMove(move);

      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);

      if (beta <= alpha) break; // Alpha cut-off
    }
    return minEval;
  }
}
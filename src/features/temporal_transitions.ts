import { Position } from "../chess";
import { Move } from "../types";
import { Generate_TemporalMotives, play_moves, TemporalMoves } from "./tactical_features";

export function Generate_TemporalTransitions(pos: Position) {

    let queue: Move[][] = [[]]
    let depth = 3
    for (let i = 0; i < depth; i++) {
        let h1 = queue.pop()
        if (!h1) {
            break
        }
        let p2 = play_moves(pos, h1)
        let temporal_motives = Generate_TemporalMotives(p2)

        let m_moves = temporal_motives.map(_ => TemporalMoves(p2, _))

        for (let moves of m_moves) {
            let p3 = play_moves(p2, moves)
            queue.push([...h1, ...moves])
        }
    }
    return queue
}
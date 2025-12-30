import { Position } from "../chess";
import { Move } from "../types";
import { Generate_TemporalMotives, play_moves, san_moves, TemporalMoves } from "./tactical_features";

export function Generate_TemporalTransitions(pos: Position) {

    let res: Move[][] = []

    let queue: Move[][] = [[]]

    while (queue.length > 0) {
        let new_queue: Move[][] = []
        for (let h1 of queue) {
            if (h1.length > 5) {
                res.push(h1)
                continue
            }
            let p2 = play_moves(pos, h1)
            let temporal_motives = Generate_TemporalMotives(p2)

            let m_moves = 
                temporal_motives
                .map(_ => TemporalMoves(p2, _))
                .filter(_ => _.length > 0)

            if (m_moves.length === 0) {
                res.push(h1)
            }

            for (let moves of m_moves) {
                res.push([...h1, ...moves])
                new_queue.push([...h1, ...moves])
            }
        }
        queue = new_queue
    }
    return res
}
import { Position } from "../chess";
import { pos_moves } from "../hopefox";
import { Move } from "../types";
import { Generate_TemporalMotives, play_moves, san_moves, TemporalMoves } from "./tactical_features";

export function Generate_TemporalTransitions(pos: Position) {

    let res: Move[][] = []

    let queue: Move[][] = [[]]

    while (queue.length > 0) {
        let new_queue: Move[][] = []
        for (let h1 of queue) {
            let p2 = play_moves(pos, h1)
            let temporal_motives = Generate_TemporalMotives(p2)

            let m_moves = 
                temporal_motives
                .map(_ => TemporalMoves(p2, _))
                .filter(_ => _.length > 0)
                .filter(_ => Legal_moves_filter(p2, _))

            if (m_moves.length === 0) {
                res.push(h1)
            }

            for (let moves of m_moves) {
                res.push([...h1, ...moves])
                if (h1.length + moves.length >= 5) {
                    continue
                }
                new_queue.unshift([...h1, ...moves])
            }
        }
        queue = new_queue
    }
    return res
}

export function Legal_moves_filter(pos: Position, mm: Move[]) {

    let p2 = pos.clone()
    for (let m of mm) {
        let aa = pos_moves(p2)
        if (!aa.find(_ => _.from === m.from && _.to === m.to)) {
            return false
        }
        p2.play(m)
    }
    return true
}


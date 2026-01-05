import { PositionC, PositionManager } from "../hopefox_c"
import { parse_program } from "./parser2"
import { World_Manager } from "./world"

type FEN = string

export function search(m: PositionManager, pos: PositionC, rules: string) {
    let w = new World_Manager(m, pos, rules)


    return w.continuations(0, 'blockable_check')

    /*

    let queue = [0]

    for (let i = 0; i < 8; i++) {
        if (queue.length === 0) {
            break
        }
        let new_queue = []
        for (let world_id of queue) {
            let moves = w.select_Moves(world_id)

            for (let move of moves) {
                let cid = w.add_Move(m, pos, world_id, move)
                new_queue.push(cid)
            }
        }
        queue = new_queue
    }

    return w.select_Moves(0)
    */
}
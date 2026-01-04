import { PositionManager } from "../hopefox_c"
import { parse_program } from "./parser2"
import { World_Manager } from "./world"

type FEN = string

let m = await PositionManager.make()
export function search(fen: FEN, rules: string) {
    let pos = m.create_position(fen)
    let w = new World_Manager(m, pos, rules)


    return w.get_Column(0, 'captures.move')
    return w.continuations(0)

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

    m.delete_position(pos)
    return w.select_Moves(0)
    */
}
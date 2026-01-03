import { PositionC, PositionManager } from "../hopefox_c";
import { Linked, World } from "./linker";
import { join_position } from "./relational";

type FEN = string
let m = await PositionManager.make()

export function join_world(fen: FEN, l: Linked) {

    let pos = m.create_position(fen)
    let turn = m.pos_turn(pos)
    let w0: World = join_position(m, pos)
    m.delete_position(pos)

    for (let key of Object.keys(l.facts)) {
        w0[key] = l.facts[key](w0, turn)
    }
    return w0
}
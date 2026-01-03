import { PositionC, PositionManager } from "../hopefox_c";
import { Linked, World } from "./linker";
import { join_position } from "./relational";

type FEN = string

export function join_world(m: PositionManager, pos: PositionC, l: Linked) {
    let turn = m.pos_turn(pos)
    let w0: World = join_position(m, pos)

    for (let key of Object.keys(l.facts)) {
        w0[key] = l.facts[key](w0, turn)
    }


    for (let key of Object.keys(l.ideas)) {
        w0[key] = l.ideas[key](w0, turn, pos, l)
    }

    return w0
}
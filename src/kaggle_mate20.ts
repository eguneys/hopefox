import { squareSet } from "./debug";
import { ALL_PIECES, B_KING, ColorC, PieceC, PieceTypeC, PositionC, PositionManager, W_KING, W_ROOK } from "./hopefox_c";
import { SquareSet } from "./squareSet";
import { Square } from "./types";

type Attack1 = {
    pc: PieceC,
    from: Square,
    attack: SquareSet,
    occupied: SquareSet
}

function get_a1(pc: PieceC, from: Square, occupied: SquareSet, m: PositionManager) {
    let attack = m.attacks(pc, from, occupied)
    return {
        pc, from, attack, occupied
    }
}

function get_a2(a1: Attack1, m: PositionManager) {

    let occupied = a1.occupied.without(a1.from)
    return [...a1.attack].map(to => get_a1(a1.pc, to, occupied.with(to), m))
}

export function mate20(fen: string, m: PositionManager) {

    let pos = m.create_position(fen)


    let bk0 = m.get_pieces_bb(pos, [B_KING])
    let bk1 = m.pos_attacks(pos, bk0.singleSquare()!)

    let wk0 = m.get_pieces_bb(pos, [W_KING])
    let wk1 = m.pos_attacks(pos, wk0.singleSquare()!)

    let wr0 = m.get_pieces_bb(pos, [W_ROOK])
    let wr1 = m.pos_attacks(pos, wr0.singleSquare()!)

    let w1 = wk1.union(wr1)

    let w1bk1 = w1.intersect(bk1)
    let w1dbk1 = bk1.diff(w1)

    let r1s = [...wr1].map(_ => m.attacks(W_ROOK, _, m.get_pieces_bb(pos, ALL_PIECES)))

    let bka = bk1.union(bk0)

    let bknK = bka.diff(wk1)

    let kr1s = r1s.map(_ => _.intersect(bknK)).filter(_ => !_.isEmpty())

    let akr1s = kr1s.filter(_ => _.size() === bknK.size())

    let occ = m.pos_occupied(pos)

    let bka1 = get_a1(B_KING, bk0.singleSquare()!, occ, m)
    let bka2 = get_a2(bka1, m)


    let occsra1 = bka2.map(a2 => {
        let ra1 = get_a1(W_ROOK, wr0.singleSquare()!, a2.occupied, m)
        let ka1 = get_a1(W_KING, wk0.singleSquare()!, a2.occupied, m)

        return [ra1.attack.has(a2.from), ka1.attack.has(a2.from)]
    })
    return occsra1
}
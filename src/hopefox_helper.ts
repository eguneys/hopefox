import { Chess, Position } from "./chess"
import { makeFen, parseFen } from "./fen"
import { makeSan } from "./san"
import { Move, Square } from "./types"
import { makeUci, opposite } from "./util"

export function move_to_san2(_: any) {
    return move_to_san(_[0].pos, _[2])
}

function move_to_san(pos: Position, move: Move) {
    return makeSan(pos, move)
}

function move_to_uci(move: Move) {
    return makeUci(move)
}


export class Hopefox {

    static from_fen = (fen: string) => {
        return new Hopefox(Chess.fromSetup(parseFen(fen).unwrap()).unwrap())
    }

    constructor(readonly pos: Position) {
    }

    get fen() {
        return makeFen(this.pos.toSetup())
    }

    get h_captures() {
        return this.captures.map(_ => this.apply_move(_))
    }

    get h2_dests(): [Hopefox, Hopefox, Move][] {
        return this.h_dests.flatMap(([h, h2, d]) => h2.dests.map(d2 => [h2, h2.apply_move(d2), d2] as [Hopefox, Hopefox, Move]))
    }

    get h_and_h2_dests(): [[Hopefox, Hopefox, Move], [Hopefox, Hopefox, Move][]][] {
        return this.h_dests.map(([h, h2, d]) =>
            [[h, h2, d],
            h2.dests.map(d2 =>
                [h2, h2.apply_move(d2), d2] as [Hopefox, Hopefox, Move]
            )
            ]
        )
    }



    get h_dests() {
        return this.dests.map(_ => [this, this.apply_move(_), _] as [Hopefox, Hopefox, Move])
    }

    _d_cache: Move[]
    get dests() {
        if (this._d_cache) {
            return this._d_cache
        }
        let res = []
        let froms = this.pos.board[this.pos.turn]

        for (let from of froms) {
            for (let to of this.pos.dests(from)) {

                if (to < 8 || to >= 56) {
                    if (this.pos.board.get(from)?.role === 'pawn') {
                        res.push({ from, to, promotion: 'queen'})
                        res.push({ from, to, promotion: 'knight'})
                        continue
                    }
                }
                let move = { from, to }
                res.push(move)
            }
        }
        this._d_cache = res
        return res
    }

    dests_from(from: Square) {
        let res = []

        for (let to of this.pos.dests(from)) {
            if (to < 8 || to >= 56) {
                if (this.pos.board.get(from)?.role === 'pawn') {
                    res.push({ from, to, promotion: 'queen' })
                    res.push({ from, to, promotion: 'knight' })
                    continue
                }
            }
            let move = { from, to }
            res.push(move)
        }

        return res
    }

    get turn() {
        return this.pos.turn
    }

    get captures() {
        return this.dests.filter(_ => !!this.pos.board.get(_.to))
    }

    get skip_turn() {
        let p2 = this.pos.clone()
        p2.turn = opposite(p2.turn)
        return new Hopefox(p2)
    }

    apply_move(move: Move) {
        let pos = this.pos.clone()
        pos.play(move)
        return new Hopefox(pos)
    }

    piece(sq: Square) {
        return this.pos.board.get(sq)
    }

    color(sq: Square) {
        return this.pos.board.get(sq)?.color
    }

    role(sq: Square) {
        return this.pos.board.get(sq)?.role
    }

    get is_checkmate() {
        return this.pos.isCheckmate()
    }

    get is_check() {
        return this.pos.isCheck()
    }

    get is_stalemate() {
        return this.pos.isStalemate()
    }
}


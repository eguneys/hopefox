import { Chess, Position } from "./chess"
import { makeFen, parseFen } from "./fen"
import { makeSan } from "./san"
import { Move } from "./types"
import { makeUci } from "./util"









export function bestsan(fen: string) {

    let h = Hopefox.from_fen(fen)

    return move_to_san(h.pos, eval_h(h))
}



function move_to_san(pos: Position, move: Move) {
    return makeSan(pos, move)
}

function move_to_uci(move: Move) {
    return makeUci(move)
}


class Hopefox {

    static from_fen = (fen: string) => {
        return new Hopefox(Chess.fromSetup(parseFen(fen).unwrap()).unwrap())
    }

    constructor(readonly pos: Position) {
    }

    get fen() {
        return makeFen(this.pos.toSetup())
    }

    get dests() {
        let res = []
        let froms = this.pos.board[this.pos.turn]

        for (let from of froms) {
            for (let to of this.pos.dests(from)) {
                let move = { from, to }
                res.push(move)
            }
        }
        return res
    }

    apply_move(move: Move) {
        let pos = this.pos.clone()
        pos.play(move)
        return new Hopefox(pos)
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

function eval_h(h: Hopefox) {
    return h.dests.map(d => {
        return [d, h_score(d, h.apply_move(d))] as [Move, number]
    }).sort((a, b) => a[1] - b[1])[0][0]
}


function h_score(d: Move, h: Hopefox): number {

    let dests = h.dests
    let i = 0

    if (h.is_checkmate) return i

    i++

    let space = dests.length
    i+= space

    if (space < 1) {
        let h2s = dests.map(d2 => h.apply_move(d2))

        return Math.max(...h2s.map(h2 => Math.min(...h2.dests.map(d3 => {
            let h3 = h2.apply_move(d3)
            return h_score(d3, h3)
        }))))

    }
    i+= 100

    let d_captures = h.dests.filter(d2 => d2.to === d.to)

    i += d_captures.length

    if (h.is_check) {


        return i
    }

    i+=10

    return i
}
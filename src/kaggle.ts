import { Http2ServerRequest } from "http2"
import { Chess, Position } from "./chess"
import { makeFen, parseFen } from "./fen"
import { makeSan } from "./san"
import { Move, Square } from "./types"
import { makeUci, opposite } from "./util"






export function pnode(fen: string, rules: string) {

    let h = Hopefox.from_fen(fen)
    return parse_rules3(rules)(h)
}


export function bestsan(fen: string, rules: string) {

    let h = Hopefox.from_fen(fen)
    return h_bestmove(h, rules)
}


function move_to_san2(_: any) {
    return move_to_san(_[0].pos, _[2])
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

    get h_captures() {
        return this.captures.map(_ => this.apply_move(_))
    }

    get h2_dests(): [Hopefox, Hopefox, Move][] {
        return this.h_dests.flatMap(([h, h2, d]) => h2.dests.map(d2 => [h2, h2.apply_move(d2), d2] as [Hopefox, Hopefox, Move]))
    }

    get h_dests() {
        return this.dests.map(_ => [this, this.apply_move(_), _] as [Hopefox, Hopefox, Move])
    }

    get dests() {
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
        return res
    }

    get captures() {
        return this.dests.filter(_ => !!this.pos.board.get(_.to))
    }

    apply_move(move: Move) {
        let pos = this.pos.clone()
        pos.play(move)
        return new Hopefox(pos)
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

type RuleContext = any
type Rule = (h: Hopefox, ha: Hopefox, da: Move, ctx: RuleContext) => boolean


/*

r + =x
  k
    r +
      k =x
        q +
          r
            q + =x
             k
               q +
                 k
                   q +
                     k 
          k
            q +
              k
                q#
                .

b
  n
    b =x
      n =x
    q
      q
        q =x
      n
        b =x
      p
        b + =x
          b
  b =x
    p =x
      p
        r =x
          q =x
            b =x
    
p
  r =x
    q =x
      b =x
    b =x
      p =x
        q =x
          b =x




n + =x
 p =x
 k
  n =x

*/

export type SanScore = {
    san: string,
    score: number
}

export class Node {

    static get Root() { return new Node(0, 'root', [], undefined, undefined) }

    constructor(
        public depth: number,
        public rule: string,
        public children: Node[],
        public parent: Node | undefined,
        public score: SanScore | undefined,
    ) {}


    add_children(children: Node[]) {
        children.forEach(_ => _.parent = this)
        this.children.push(...children)
    }


    get max(): number {
        if (this.children.length === 0) {
            return -this.score!.score
        }
        return -this.score!.score + Math.max(...this.children.map(_ => _.min))
    }

    get min(): number {
        if (this.children.length === 0) {
            return this.score!.score
        }
        return this.score!.score + Math.min(...this.children.map(_ => _.max))
    }
}


function parse_rule1(str: string) {
    let ss = str.split(' ')
    return (h: Hopefox, ha: Hopefox, da: Move) => {
        let from_role = h.role(da.from)

        if (ss.includes('n')) {
            if (from_role !== 'knight') {
                return undefined
            }
        }
        if (ss.includes('b')) {
            if (from_role !== 'bishop') {
                return undefined
            }
        }
        if (ss.includes('q')) {
            if (from_role !== 'queen') {
                return undefined
            }
        }
        if (ss.includes('r')) {
            if (from_role !== 'rook') {
                return undefined
            }
        }
        if (ss.includes('k')) {
            if (from_role !== 'king') {
                return undefined
            }
        }
        if (ss.includes('p')) {
            if (from_role !== 'pawn') {
                return undefined
            }
        }
        if (ss.includes('+')) {
            if (!ha.is_check) {
                return undefined
            }
        }
        if (ss.includes('#')) {
            if (!ha.is_checkmate) {
                return undefined
            } else {
                return 999
            }
        }

        if (ss.includes('o')) {
            if (h.role(da.to) !== undefined) {
                return undefined
            }
        }

        if (ss.includes('=x')) {
            let to_role = h.role(da.to)

            if (to_role === 'pawn') {
                return 1
            }

            if (to_role === 'bishop') {
                return 4
            }
            if (to_role === 'knight') {
                return 3
            }
            if (to_role === 'rook') {
                return 5
            }
            if (to_role === 'queen') {
                return 9
            }
            return undefined
        }
        return 0
    }
}



function parse_rules3(str: string) {

    let ss = str.trim().split('\n')

    let root = Node.Root
    const stack = [root]

    ss.forEach(line => {
        const rule = line.trim()
        if (!rule) return

        const depth = line.search(/\S/)

        const node = new Node(depth, rule, [], undefined, undefined)

        while (stack.length > depth + 1) {
            stack.pop()
        }

        stack[stack.length - 1].add_children([node])
        stack.push(node)
    })
    root.children.forEach(_ => _.parent = undefined)
    let nodes = root.children


    return (h: Hopefox) => {
        function deep(ns: Node[], h: Hopefox) {
            let res: Node[] = []
            h.h_dests.map(haa => {
                ns.forEach(_ => {
                    let score = parse_rule1(_.rule)(...haa)
                    if (score !== undefined) {

                        let children: Node[] = []
                        let san = move_to_san2(haa)
                    if (_.children.length > 0) {
                        let cc = deep(_.children, haa[1])
                        if (cc === undefined) {
                            return
                        } else {
                            children = cc
                        }
                    } else {

                    }

                        let nm = new Node(_.depth, _.rule, [], undefined, { san, score })
                        nm.add_children(children)
                        res.push(nm)
                    }
                })
            })
            if (res.length === 0) {
                return undefined
            }
            return res
        }

        let ns = deep(nodes, h)

        if (!ns || ns.length === 0) {
            return undefined
        }

        //console.log('root min', ns.map(_ => [_.rule,_.score, _.min, _.max]))

        //console.log('Rf6 max', ns.find(_ => _.score!.san === 'Rf6')!.children.map(_ => [_.rule, _.score, _.min, _.max]))
        //console.log('Rf6 Bxg2 min', ns.find(_ => _.score!.san === 'Rf6')!.children[0].children.map(_ => [_.rule, _.score, _.min, _.max]))
        //console.log('Rf6 Bxg2 Qxe7 max', ns.find(_ => _.score!.san === 'Rf6')!.children[0].children[1]?.children.map(_ => [_.rule, _.score, _.min, _.max]))

        //console.log('Nb2', ns.find(_ => _.score?.san === 'Nb2')?.children.map(_ => [_.rule,_.score, _.min, _.max]))
        //console.log('Kxd4', ns.find(_ => _.score?.san === 'Kxd4')?.children.map(_ => [_.rule,_.score, _.min, _.max]))

        //console.log(ns.find(_ => _.score!.san === 'c5')?.min)
        //console.log(ns.find(_ => _.score!.san === 'a5')?.min)
        //console.log(ns.find(_ => _.score!.san === 'a5')?.children.map(_ => [_.score?.san, _.max]))
        //return ns.sort((a, b) => b.min - a.min)[0].score!.san
        return ns

    }
}

let rules = ``

rules += `
q =x
n + =x
 p =x
 k
  n =x

k =x
 k
  n
   k =x
   .
n
 k =x
 .



k =x
  q =x
    b =x

q =x
  b =x

b =x
k =x

q =x
 n =x
  q =x
`

rules += `
p =x

q =x
  b =x
    p =x

q =x
 r =x
 n =x
  q =x
`


rules += `
r +
 r
  r + =x
   q =x
    b =x

r + =x
 q =x
  b =x
`

rules += `
n +
 k
  n =x
n =x

`

function h_bestmove(h: Hopefox, rules: string) {

    let ns = parse_rules3(rules)(h)
    return ns?.sort((a, b) => b.min - a.min)[0].score!.san ?? move_to_san2(h.h_dests[0])
}
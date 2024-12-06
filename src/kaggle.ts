import { Http2ServerRequest } from "http2"
import { Chess, Position } from "./chess"
import { makeFen, parseFen } from "./fen"
import { makeSan } from "./san"
import { Move, Square } from "./types"
import { makeUci, opposite } from "./util"









export function bestsan(fen: string) {

    let h = Hopefox.from_fen(fen)

    return h_bestmove(h)
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


/*

o#
x#
o+ [^kx]=y =y
o+=y k=y +
xq
xn
xb
xr
. x=y [^=y]

o+ k x[bpnq]

*/

type RuleContext = any
type Rule = (h: Hopefox, ha: Hopefox, da: Move, ctx: RuleContext) => boolean

function parse_rule2(str: string) {

    let rules: Record<string, [number, Rule]> = {}

    str.trim().split('\n').map(line => {
        let [score, name, ...rest] = line.split(' ')

        let rr = [parseInt(score), parse_rules(rest)] as [number, Rule]
        name.split('"').filter(_ => _ !== "").forEach(name => {
            rules[name] = rr
        })

    })

    return (h: Hopefox) => {
        let rr = Object.values(rules)
        return h.h_dests.map(_ => {
            let nmax = rr.map(r => [r[0], r[1](..._, {})] as [number, boolean])
                .filter(_ => _[1])
                .sort((a, b) => a[0] - b[0])[0]?.[0] ?? 1

            //console.log(nmax, move_to_san2(_))
            return [nmax, _[2]] as [number, Move]
        }).sort((a, b) => a[0] - b[0])[0][1] ?? h.dests[0]
    }

    function parse_rules(rest: string[]): Rule {

        let rr = rest.map(_ => parse_rule1(_))

        return (h: Hopefox, ha: Hopefox, da: Move, ctx: RuleContext) => {
            if (move_to_san2([h, ha, da]) === 'Ne2+') {

                //console.log(h.fen, move_to_san2([h, ha, da]))
                //console.log("begin", rest.length, move_to_san2([h, ha, da]))
            }
            function deep(h: Hopefox, ha: Hopefox, da: Move, i_r: number, _ctx: RuleContext) {
                let r = rr[i_r]

                if (move_to_san2([h, ha, da]) === 'Nxd4') {
                }
                let c = r(h, ha, da, _ctx)
                if (!c) {
                    return false
                }
                if ((i_r + 1) >= rr.length) {
                    return true
                }
                let dd = ha.h_dests.filter(_ => {
                    let ctx = { ..._ctx }
                    let ll = move_to_san2([h, ha, da])
                    if (ll === 'Ne2+' || ll.includes('K') || ll === 'Nxd4') {
                        //console.log(i_r, 'getting deep', move_to_san2([h, ha, da]), move_to_san2(_))
                    }
                    let t = deep(..._, i_r + 1, ctx)
                    if (ll) {
                    //console.log(i_r, 'out of deep', t)
                    }
                    if (t) {
                        return true
                    }
                })
                return dd.length > 0
            }

            return deep(h, ha, da, 0, ctx)
        }
    }

    function parse_rule1(str: string) {
        return (h: Hopefox, ha: Hopefox, da: Move, ctx: RuleContext): boolean => {
            //if (str.includes("ncheck") && str.includes(""))
            //console.log(str, move_to_san2([h, ha, da]))
            let f_role = h.role(da.from)
            let to_role = h.role(da.to)

            if (str[0] === "\"") {
                return rules[str.slice(1)][1](h, ha, da, ctx)
            }


            if (str.includes('=')) {
                let [from, to] = str.split('=')

                if (to.includes('b')) {
                    if (to_role !== 'bishop') {
                        return false
                    }
                }



                if (to.includes('p')) {
                    if (to_role !== 'pawn') {
                        return false
                    }
                }

                if (to.includes('r')) {
                    if (to_role !== 'rook') {
                        return false
                    }
                }

                if (to.includes('q')) {
                    if (to_role !== 'queen') {
                        return false
                    }
                }
                if (to.includes('n')) {
                    if (to_role !== 'knight') {
                        return false
                    }
                }


                if (to.includes('y')) {
                    if (ctx.y) {
                        if (da.to !== ctx.y) {
                            return false
                        }
                    } else {
                        ctx.y = da.to
                    }
                }

                return parse_rule1(from)(h, ha, da, ctx)
            } else {
            if (str.includes('#')) {
                if (!ha.is_checkmate) {
                    return false
                }
            }
            if (str.includes('+')) {
                if (!ha.is_check) {
                    return false
                }
            }
            if (str.includes('x')) {
                if (to_role === undefined) {
                    return false
                }
            }
            if (str.includes('o')) {
                if (to_role !== undefined) {
                    return false
                }
            }

            if (str.includes('q')) {
                if (f_role !== 'queen') {
                    return false
                }
            }
            if (str.includes('n')) {
                if (f_role !== 'knight') {
                    return false
                }
            }
            if (str.includes('b')) {
                if (f_role !== 'bishop') {
                    return false
                }
            }

            if (str.includes('p')) {
                if (f_role !== 'pawn') {
                    return false
                }
            }

            if (str.includes('k')) {
                if (f_role !== 'king') {
                    return false
                }
            }



            }
            return true
        }
    }



}

const rass = parse_rule2(`
-10 "mate #
2 "nundefendp"defend no "ktakesp
-2 "nforkq"fork "ncheck "kflee "ntakesq
-1 "nforkr"fork "ncheck "kflee "ntakesr
3 "nforkrbad"badfork "ncheck "ptakesn
3 "hangqueeno"hang o "qtakesq
3 "hangqueenx"hang x "qtakesq
1 "kflee"king k
0 "ncheck"check n+
-1 "btakesq"capture bx=q
-3 "ntakesq"capture nx=q
-2 "ntakesr"capture nx=r
-1 "ntakesb"capture nx=b
-1 "ntakesn"capture nx=n
1 "ntakesp"capture nx=p
0 "rtakesr"capture rx=r
0 "qtakesb"capture qx=b
0 "qtakesq"capture qx=q
0 "qtakesn"capture qx=n
0 "ktakesn"capture kx=n
0 "ktakesp"capture kx=p
0 "ptakesb"capture px=b
0 "ptakesn"capture px=n
`)

const mates = parse_rule2(`
-1 "mate #
`)



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

type SanScore = {
    san: string,
    score: number
}

class Node {

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
            return this.score!.score
        }
        return this.score!.score + Math.min(...this.children.map(_ => _.min))
    }

    get min(): number {
        if (this.children.length === 0) {
            return -this.score!.score
        }
        return -this.score!.score + Math.max(...this.children.map(_ => _.max))
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
            return move_to_san2(h.h_dests[0])
        }

        //console.log(ns.map(_ => [_.score, _.max]))

        return ns.sort((a, b) => b.max - a.max)[0].score!.san

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

function h_bestmove(h: Hopefox) {

    return parse_rules3(rules)(h)
}
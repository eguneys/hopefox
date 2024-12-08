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
    return alpha_beta_search(fen, rules)
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
type Rule = (h: Hopefox, ha: Hopefox, da: Move, ctx: RuleContext) => number | undefined


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

    static get Root() { return new Node(-1, -1, 'root', [], undefined, undefined) }

    constructor(
        public depth: number,
        public line: number,
        public rule: string,
        public children: Node[],
        public parent: Node | undefined,
        public score: SanScore | undefined,
    ) {}


    get root_node(): Node {
        if (!this.parent) {
            return this
        }

        return this.parent.root_node
    }

    best_match(line: number) {
        if (line === -1) {
            return undefined
        }
        let lines = this.find_line(line)

        if (line === 160) {
            //debugger
        }
        let parent_san = lines[0]?.root_node.best_match(lines[0]!.parent!.line)?.node ?? this.root_node
        //console.log(line, lines, parent_san)
        lines = lines.filter(_ => _.parent === parent_san)

        let res = lines.sort((a, b) => a.depth % 2 === 0 ? (b.min - a.min) : (a.max - b.max))

        if (res.length === 0) {
            return undefined
        }

        return {
          san: res[0].score!.san,
          score: res[0].depth % 2 === 0 ? res[0].min : res[0].max,
          node: res[0]
        }
    }

    get is_parent_best_node() {
        if (!this.parent) {
            return true
        } else {
            return this.parent.is_best_node
        }
    }

    get is_best_node() {
        if (this.parent) {
            return this.parent.best_child === this
        } else {
            return true
        }
    }

    get best_child() {
        if (this.depth % 2 === 0) {
            return this.children.sort((a, b) => b.min - a.min)[0]
        } else {
            return this.children.sort((a, b) => a.max - b.max)[0]
        }
    }

    find_line(line: number): Node[] {
        if (this.line === line) {
            return [this]
        } else {
            return this.children.flatMap(_ => _.find_line(line))
        }
    }

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

        if (ss.includes('#')) {
            if (!ha.is_checkmate) {
                return undefined
            } else {
                return 999
            }
        } else {
            if (ha.is_checkmate) {
                return undefined
            }
        }



        if (ss.includes('+')) {
            if (!ha.is_check) {
                return undefined
            }
        } else {
            if (ha.is_check) {
                return undefined
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
        } else {
            if (h.role(da.to) !== undefined) {
                return undefined
            }
        }
        return 0
    }
}



function parse_rules3(str: string) {

    let ss = str.trim().split('\n')

    let root = Node.Root
    const stack = [root]

    ss.forEach((line, i) => {
        const rule = line.trim()
        if (!rule) return

        const depth = line.search(/\S/)

        const node = new Node(depth, i, rule, [], undefined, undefined)

        while (stack.length > depth + 1) {
            stack.pop()
        }

        stack[stack.length - 1].add_children([node])
        stack.push(node)
    })
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

                        let nm = new Node(_.depth, _.line, _.rule, [], undefined, { san, score })
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

        let res = Node.Root

        if (ns) {
          res.add_children(ns)
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


        //return ns

        return res
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

    let root = parse_rules3(rules)(h)
    return root.best_child?.score!.san ?? move_to_san2(h.h_dests[0])
}

export class AlphaBetaRuleNode {

    static get Root() { return new AlphaBetaRuleNode(0, -1, '', [], undefined) }

    static parse_rules(str: string) {
        let ss = str.trim().split('\n')

        let root = AlphaBetaRuleNode.Root
        const stack = [root]

        ss.forEach((line, i) => {
            const rule = line.trim()
            if (!rule) return

            const depth = line.search(/\S/)

            const node = new AlphaBetaRuleNode(depth, i, rule, [], undefined)

            while (stack.length > depth + 1) {
                stack.pop()
            }

            stack[stack.length - 1].add_children([node])
            stack.push(node)
        })
        return root
    }

    constructor(readonly depth: number, readonly line: number, readonly rule: string, readonly children: AlphaBetaRuleNode[], public parent?: AlphaBetaRuleNode) {
        this._rr = parse_rule1(this.rule)
    }

    _rr: Rule

    san_score: SanScore[] = []

    get best_san_score() {
        return this.san_score.sort((a, b) => b.score - a.score)[0]
    }

    get best_child(): AlphaBetaRuleNode | undefined {
        return this.children.sort((a, b) => {
            if (a.best_san_score === undefined) {
                return 1
            } else if (b.best_san_score === undefined) {
                return -1
            } else {
                return b.best_san_score.score - a.best_san_score.score
            }
        })[0]
    }

    get full_rule(): string {
        return this.rule + '\n' + this.children.map(_ => _.full_rule.split('\n').map(_ => ' ' + _).join('\n')).join('\n')
    }

    get parent_at_depth0(): AlphaBetaRuleNode {
        if (!this.parent) {
            return this
        }

        if (this.parent.depth === 0) {
            return this.parent
        }
        return this.parent.parent_at_depth0
    }

    run(haa: [Hopefox, Hopefox, Move], ctx: RuleContext) {
        return this._rr(...haa, ctx)
    }

    save_score(haa: [Hopefox, Hopefox, Move], score: number) {
        let san = move_to_san2(haa)
        //console.log('save score', san, score, this.rule, this.depth)
        this.san_score.push({ san, score })
    }

    add_children(nodes: AlphaBetaRuleNode[]) {
        nodes.forEach(_ => _.parent = this)
        this.children.push(...nodes)
    }
}

function alpha_beta_search(fen: string, rules: string) {
    console.log(fen, rules)
    let res = AlphaBetaNode.search(fen, rules)

    console.log('Qh5', res.children.map(_ => _.san_score))
    return res.best_child?.best_san_score?.san
}

export class AlphaBetaNode {

    static search(fen: string, rules: string) {

        let h = Hopefox.from_fen(fen)
        let res = AlphaBetaRuleNode.parse_rules(rules)
        let ctx = {}

        alphabeta(new AlphaBetaNode(h, ctx, res), 0)

        return res
    }

    constructor(readonly h: Hopefox, readonly ctx: RuleContext, readonly rule: AlphaBetaRuleNode) {}

    get is_terminal() {
        return !!this.rule
    }

    score(h: Hopefox, da: Move) {
        if (this.rule) {
            return this.rule.run([h, this.h, da], this.ctx)
        }
    }

    get children() {
        let ctx = { ... this.ctx }
        return this.rule.children.flatMap(rule => this.h.h_dests.map(_ => [new AlphaBetaNode(_[1], ctx, rule), _[2]] as [AlphaBetaNode, Move]))
    }

    save_score(h: Hopefox, da: Move, value: number) {
        this.rule.save_score([h, this.h, da], value)
    }
}


function alphabeta(node: AlphaBetaNode, depth: number, alpha = -Infinity, beta = +Infinity, maximizingPlayer = true) {

    let children = node.children

    if (children.length === 0) {
        return 0
    }

    if (maximizingPlayer) {

        let max_child = undefined
        let value = -Infinity

        for (let [child, da] of children) {
            let a = move_to_san2([node.h, child.h, da])

            let score = child.score(node.h, da)
            if (score === undefined) {
                continue
            }

            if (a === 'g6') {
               //console.log('in g6', depth)
            }
            let v = alphabeta(child, depth - 1, alpha, beta, false)
            if (v === undefined) {
                continue
            }
            v += score
            if (a === 'Qxc3') {
              //console.log(depth, 'out Qxc3', score, v, value)
            }

            //console.log('|' + '-'.repeat(- depth), 'amax', a, v, value)
            if (v > value) {
                if (depth === -2) {
                    console.log('|' + '-'.repeat(- depth), 'max', a, v, score, value)
                }
                max_child = [child, da] as [AlphaBetaNode, Move]
            }
            value = Math.max(value, v)
            if (value > beta) {
                break
            }
            alpha = Math.max(alpha, value)
        }
        if (max_child) {
            if (depth === -2) {
                //console.log('save max', value)
            }
            max_child[0].save_score(node.h, max_child[1], value)
            return value
        }
        return undefined
    } else {
        let min_child = undefined
        let value = +Infinity

        for (let [child, da] of children) {

            let a = move_to_san2([node.h, child.h, da])
            let score = child.score(node.h, da)
            if (score === undefined) {
                continue
            }
            let v = alphabeta(child, depth - 1, alpha, beta, true)
            if (v === undefined) {
                continue
            }
            v = -score + v

            if (a === 'gxf6') {
                //console.log('in gxf6', depth, score, v, value, node.h.fen)
            }
            if (depth === -3) {
                //console.log('|' + '-'.repeat(3 - depth), 'amin', a, v, value, child.h.fen)
            }

            if (v < value) {

                if (depth === -1) {
                    console.log('|' + '-'.repeat(3 - depth), 'min', a, v, value, child.h.fen)
                }
                min_child = [child, da] as [AlphaBetaNode, Move]
            }
            value = Math.min(value, v)
            if (value < alpha) {
                //console.log("break", value, alpha, a)
                break
            }
            beta = Math.min(beta, value)
        }
        if (min_child) {
            if (depth === -1) {
                console.log('save min', value)
            }
            min_child[0].save_score(node.h, min_child[1], value)
            return value
        }
        return undefined
    }
}

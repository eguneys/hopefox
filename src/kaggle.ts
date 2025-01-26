import { Http2ServerRequest } from "http2"
import { Chess, Position } from "./chess"
import { makeFen, parseFen } from "./fen"
import { makeSan } from "./san"
import { Move, Square } from "./types"
import { makeUci, opposite } from "./util"

export function bestsan2(fen: string) {

    let h = Hopefox.from_fen(fen)


    let mates = h.h_dests.filter(_ => _[1].is_checkmate)

    let m = mates[0]
    if (m) {
        return move_to_san2(m)
    }

}


export function bestsan(fen: string, rules: string) {
    return alpha_beta_search(fen, rules)
}


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

type RuleContext = any
type Rule = (h: Hopefox, ha: Hopefox, da: Move, ctx: RuleContext) => [number, boolean] | undefined


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


function parse_rule1(str: string): Rule {
    let ss = str.split(' ')
    return (h: Hopefox, ha: Hopefox, da: Move) => {

        let is_break = false
        if (ss.includes('1')) {
            is_break = true
        }

        let mm = ss.find(_ => _.includes('%'))

        if (mm) {
            let a = move_to_san2([h, ha, da])
            if (mm !== '%' + a) {
                return undefined
            }
        }

        let mn = ss.filter(_ => _.includes('!'))

        if (mn.length > 0) {
            let a = move_to_san2([h, ha, da])
            if (mn.find(_ => _ === '!' + a)) {
                return undefined
            }
        }

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
                return [999, false]
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
            let to_color = h.color(da.to)
            let f_color = h.color(da.from)

            // castles
            if (to_color === f_color) {
                return undefined
            }
            if (to_role === 'pawn') {
                return [1, is_break]
            }

            if (to_role === 'bishop') {
                return [4, is_break]
            }
            if (to_role === 'knight') {
                return [3, is_break]
            }
            if (to_role === 'rook') {
                return [5, is_break]
            }
            if (to_role === 'queen') {
                return [9, is_break]
            }
            return undefined
        } else {
            /*
            if (h.role(da.to) !== undefined) {
                return undefined
            }
                */
        }
        return [0, is_break]
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

export class AlphaBetaRuleNode {

    static get Root() { return new AlphaBetaRuleNode(0, -1, '', [], undefined) }

    static parse_rules(str: string) {
        let ss = str.trim().split('\n')

        let root = AlphaBetaRuleNode.Root
        const stack = [root]

        let skip_depth = false
        let is_only = false
        ss.forEach((line, i) => {
            const rule = line.trim()
            if (!rule) return

            if (rule === 'O') {
                is_only = true
                return
            }

            if (rule === '!') {
                skip_depth = true
                return
            }

            const depth = line.search(/\S/)

            const node = new AlphaBetaRuleNode(depth, i, rule, [], undefined)
            node.is_only = is_only
            is_only = false

            node.skip_depth = skip_depth
            skip_depth = false

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

    skip_depth: boolean = false
    is_only: boolean = false

    get is_only_children() {
        let cc = this.children.filter(_ => _.is_only)
        if (cc.length > 0) {
            return cc.filter(_ => !_.skip_depth)
        }
        return this.children.filter(_ => !_.skip_depth)
    }

    nb_visits: number = 0

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
    //console.log(fen, rules)
    let res = AlphaBetaNode.search(fen, rules)

    //console.log('Qh5', res.children.map(_ => _.san_score))
    return res.best_child?.best_san_score?.san
}

export class AlphaBetaNode {

    static search(fen: string, rules: string) {

        let h = Hopefox.from_fen(fen)
        let res = AlphaBetaRuleNode.parse_rules(rules)
        let ctx = {}

        let vv = alphabeta(new AlphaBetaNode(h, ctx, res), 0)

        if (vv) {
            let [v, nb_visits, max_child] = vv

            //console.log(max_child)
            max_child.forEach(([h, child, da, value]) => {
                child.save_score(h, da, value)
            })
        }

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

    children(rule: AlphaBetaRuleNode) {
        let ctx = { ... this.ctx }
        return this.h.h_dests.map(_ => [new AlphaBetaNode(_[1], ctx, rule), _[2]] as [AlphaBetaNode, Move])
    }

    save_score(h: Hopefox, da: Move, value: number) {
        this.rule.save_score([h, this.h, da], value)
    }
}


function alphabeta(node: AlphaBetaNode, depth: number, alpha = -Infinity, beta = +Infinity, maximizingPlayer = true): [number, number, [Hopefox, AlphaBetaNode, Move, number][]] | undefined {
    if (node.rule.is_only_children.length === 0) {
        return [0, 1, []]
    }

    if (maximizingPlayer) {

        let nb_visits = 0

        let max_child = undefined
        let value = -Infinity

        for (let rule of node.rule.is_only_children) {

            for (let [child, da] of node.children(rule)) {
                let a = move_to_san2([node.h, child.h, da])

                let ss = child.score(node.h, da)
                //console.log(a, ss)
                if (ss === undefined) {
                    continue
                }
                let [score, is_break] = ss

                let vv = alphabeta(child, depth - 1, alpha, beta, false)

                if (depth === 0 && a === 'Rb1') {
                    //console.log("out Rb1")
                }

                if (vv === undefined) {
                    continue
                }

                let [v, _nb_visits, mm_child] = vv

                rule.nb_visits += _nb_visits
                nb_visits += _nb_visits

                v += score

                if (depth === -8) {
                    //console.log('|' + '-'.repeat(- depth), 'amax', a, v, value, nb_visits)
                }
                if (v > value) {
                    if (depth === -8) {
                        //console.log('|' + '-'.repeat(- depth), 'max', a, v, score, value, child.h.fen, is_break)
                    }
                    //max_child = [child, da] as [AlphaBetaNode, Move]
                    mm_child.push([node.h, child, da, v])
                    max_child = mm_child
                }

                value = Math.max(value, v)
                if (value > beta) {
                    //console.log('beta break', value, beta)
                    break
                }
                alpha = Math.max(alpha, value)

                if (is_break) {
                    break
                }
            }
            if (max_child) {
                continue
            }
            if (rule.rule.includes('0')) {
                break
            }
        }
        if (max_child) {
            if (depth === -8) {
                //console.log('save max', value, max_child[max_child.length - 1][1].h.fen)
            }
            //max_child[0].save_score(node.h, max_child[1], value)

            return [value, nb_visits, max_child]
        }
        return undefined
    } else {

        let nb_visits = 0
        let min_child = undefined
        let value = +Infinity
        for (let rule of node.rule.is_only_children) {

            for (let [child, da] of node.children(rule)) {

                let a = move_to_san2([node.h, child.h, da])
                let ss = child.score(node.h, da)
                if (ss === undefined) {
                    continue
                }

                let [score, is_break] = ss

                if (depth === -7 && a === 'Qd1+') {
                    //console.log("going in Qd1+")
                }

                let vv = alphabeta(child, depth - 1, alpha, beta, true)


                if (vv === undefined) {
                    continue
                }

                let [v, _nb_visits, mm_child] = vv

                rule.nb_visits += _nb_visits
                nb_visits += _nb_visits

                v = -score + v

                if (depth === -7 && a === 'Qd1+') {
                    //console.log("out Qd1+", v, value)
                }



                if (depth === -7) {
                    //console.log('|' + '-'.repeat(-depth), 'amin', a, v, value, child.h.fen, nb_visits)
                }

                if (v < value) {

                    if (depth === -7) {
                        //console.log('|' + '-'.repeat(-depth), 'min', a, v, value, child.h.fen)
                    }
                    mm_child.push([node.h, child, da, v])
                    min_child = mm_child
                }
                value = Math.min(value, v)
                if (value < alpha) {
                    //console.log('break', value, alpha)
                    break
                }
                beta = Math.min(beta, value)
                if (is_break) {
                    break
                }
            }

            if (min_child) {
                continue
            }
            if (rule.rule.includes('0')) {
                break
            }
        }
            if (min_child) {
                if (depth === -7) {
                    //console.log('save min', value)
                    //console.log(min_child.map(_ => move_to_san(_[0].pos, _[2])))
                }
                return [value, nb_visits, min_child]
            }
        return undefined
    }

}

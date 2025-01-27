import { checkServerIdentity } from 'tls'
import { Hopefox, move_to_san2 } from './kaggle'
import { Color, Move, Role, Square } from './types'
import { opposite } from './util'
import { attacks, between, rookAttacks } from './attacks'
import { SquareSet } from './squareSet'
import { hasSubscribers } from 'diagnostics_channel'


class HMove {

    static from_h_with_context = (h: Hopefox) => {
        let { h_dests } = h
        return (ctx: RuleContext) => {
            return h_dests.map(_ => new HMove(..._, copy_ctx(ctx)))
        }
    }

    constructor(readonly h: Hopefox, readonly ha: Hopefox, readonly da: Move, readonly ctx: RuleContext) {}

    get san() {
        return move_to_san2([this.h, this.ha, this.da])
    }

    get clone() {
        return new HMove(this.h, this.ha, this.da, copy_ctx(this.ctx))
    }

    get from_piece() {
        return this.h.piece(this.da.from)!
    }
 
    get to_piece() {
        return this.h.piece(this.da.to)
    }

    get to_role() {
        return this.h.role(this.da.to)
    }

    get from_role() {
        return this.h.role(this.da.from)!
    }

    get is_checkmate() {
        return this.ha.is_checkmate
    }

    get h_dests() {
        return this.ha.h_dests.map(_ =>
            new HMove(..._, copy_ctx(this.ctx))
        )
    }
}





type RuleContext = Record<string, Square>


export const role_to_char = (role: Role) => role === 'knight' ? 'n' : role[0]

export const copy_ctx = (ctx: RuleContext) => {
    let res: RuleContext = {}
    for (let key of Object.keys(ctx)) {
        res[key] = ctx[key]
    }
    return res
}

export class RuleNode {

    static get Root() { return new RuleNode(-1, -1, '', [], undefined) }

    static parse_rules(str: string) {
        let ss = str.trim().split('\n')

        let root = RuleNode.Root
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

            const node = new RuleNode(depth, i, rule, [], undefined)
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

    constructor(readonly depth: number, readonly line: number, readonly rule: string, readonly children: RuleNode[], public parent?: RuleNode) {
        if (depth === -1) {
            return
        }

        let rsplit = this.rule.split(' ')
        let rr = this.rule
        if (rsplit[0] === '0') {
            this._is_neg_rule = true
            rr = rsplit.slice(1).join(' ')
        }

        this.rr = rr
    }

    rr: string
    skip_depth: boolean = false
    is_only: boolean = false

    get is_only_children() {
        let cc = this.children.filter(_ => _.is_only)
        if (cc.length > 0) {
            return cc.filter(_ => !_.skip_depth)
        }
        return this.children.filter(_ => !_.skip_depth)
    }

    san: string[] = []

    nb_visits: number = 0

    _is_neg_rule = false

    get full_rule(): string {
        return this.rule + '\n' + this.children.map(_ => _.full_rule.split('\n').map(_ => ' ' + _).join('\n')).join('\n')
    }

    get parent_at_depth0(): RuleNode {
        if (!this.parent) {
            return this
        }

        if (this.parent.depth === 0) {
            return this.parent
        }
        return this.parent.parent_at_depth0
    }

    add_children(nodes: RuleNode[]) {
        nodes.forEach(_ => _.parent = this)
        this.children.push(...nodes)
    }
}

export function bestsan3(fen: string, rules: string) {

    let node = RuleNode.parse_rules(rules)

    let h = Hopefox.from_fen(fen)

    return rule_search(h, node, {})?.[0]?.san
}

export function rule_search_tree(fen: string, rules: string) {

    let node = RuleNode.parse_rules(rules)

    let h = Hopefox.from_fen(fen)

    rule_search(h, node)

    return node
}

function rule_search(h: Hopefox, node: RuleNode, ctx: RuleContext = {}): HMove[] | undefined {

    let rules = node.is_only_children

    if (rules.length === 0) {
        return []
    }

    let no_rules = rules.filter(_ => _._is_neg_rule)
    let yes_rules = rules.filter(_ => !_._is_neg_rule)

    let res = []
    for (let r of yes_rules) {
        let rr = parse_rule4(r.rule, h, r.depth % 2 === 0, ctx)
        if (rr !== undefined) {
            let [cc, res_move] = rr

            let collect = []
            for (let c of cc) {
                let rest_r = rule_search(res_move.ha, r, c)

                if (rest_r !== undefined) {
                    collect.push(res_move)
                }
            }
            if (collect.length === 0) {
                return undefined
            }
            r.san.push(collect[0].san)
            res.push(collect[0])
        }
    }


    return res
}


function parse_rule4(rule: string, h: Hopefox, is_lowers_turn: boolean, ctx: RuleContext) {

    let rs = rule.split('|')

    let hms = HMove.from_h_with_context(h)

    let res_move
    let cc = [ctx]
    for (let r of rs) {
        
        let collect = []
        for (let c of cc) {
            for (let hm of hms(c)) {
                let rr = match_rule(r, hm, is_lowers_turn)
                if (rr === undefined) {
                    continue
                }
                if (res_move === undefined) {
                    res_move = hm
                }
                collect.push(...rr)
            }
        }
        if (collect.length === 0) {
            return undefined
        }
        cc = collect
    }

    if (!res_move) {
        return undefined
    }

    return [cc, res_move] as [RuleContext[], HMove]

    function match_rule(rule: string, hmove: HMove, is_lowers_turn: boolean): RuleContext[] | undefined {

        let [from, to] = rule.trim().split(' ').map(_ => _.trim())

        let is_lowers_rule = from.toLowerCase() === from

        if (is_lowers_turn) {
            if (is_lowers_rule) {
                if (from[0] !== role_to_char(hmove.from_role)) {
                    return undefined
                }

                hmove.ctx[from] = hmove.da.from
                return match_to(hmove.h.turn)
            } else {
                return undefined
            }
        } else {
            if (!is_lowers_rule) {
                if (from[0].toLowerCase() !== role_to_char(hmove.from_role)) {
                    return undefined
                }

                hmove.ctx[from] = hmove.da.from
                return match_to(opposite(hmove.ha.turn))
            } else {
                return undefined
            }
        }

        function match_to(lowers_color: Color) {
            let cc = [hmove.ctx]

            if (hmove.san === 'Rc1') {
                //console.log("here")
            }
            let res_from = from
            let blockH1, blockQ
            while (to.length > 0) {
                let [op, h1, Q, rest] = split_ops_h1_q(to)
                let collect = []
                let res
                for (let c of cc) {
                    switch (op) {
                        case '=':
                            res = match_takes(from, h1, Q, c, blockH1, blockQ)
                            if (res === undefined) {
                                continue
                            }
                            collect.push(...res)

                            if (h1) {
                                from = h1
                            }
                            if (Q) {
                                from = Q
                            }
                            blockH1 = undefined
                            blockQ = undefined
                            break
                        case '+':
                            res = match_checks(from, h1, Q, c, blockH1, blockQ)
                            if (res === undefined) {
                                continue
                            }
                            collect.push(...res)

                            if (h1) {
                                from = h1
                            }
                            if (Q) {
                                from = Q
                            }
                            blockH1 = undefined
                            blockQ = undefined
                            break
                        case '/':
                            blockH1 = h1
                            blockQ = Q
                            collect.push(c)
                            break
                    }
                }
                cc = collect
                to = rest
            }
            return cc

            function match_takes(from: string, h1: string | undefined, Q: string | undefined, ctx: RuleContext, blockH1: string | undefined, blockQ: string | undefined): RuleContext[] | undefined {

                let { to_piece } = hmove

                if (h1) {

                    if (to_piece !== undefined) {
                        return undefined
                    }

                    if (ctx[h1]) {
                        if (ctx[h1] !== hmove.da.to) {
                            return undefined
                        } else {
                            return [copy_ctx(ctx)]
                        }
                    } else {
                        let res = copy_ctx(ctx)
                        res[h1] = hmove.da.to
                        return [res]
                    }
                }

                if (Q) {
                    if (to_piece === undefined) {
                        return undefined
                    }

                    let to_color = Q.toLowerCase() === Q ? lowers_color : opposite(lowers_color)

                    if (to_color !== to_piece.color) {
                        return undefined
                    }


                    if (ctx[Q[0]]) {
                        if (ctx[Q[0]] !== hmove.da.to) {
                            return undefined
                        } else {
                            return [copy_ctx(ctx)]
                        }
                    } else {
                        let res = copy_ctx(ctx)
                        res[Q[0]] = hmove.da.to
                        return [res]
                    }
                }

                return undefined
            }

            function match_checks(from: string, h1: string | undefined, Q: string | undefined, c: RuleContext, blockH1: string | undefined, blockQ: string | undefined): RuleContext[] | undefined {

                let res = [c]

                if (hmove.san === 'Rc1') {
                    console.log("here")
                }



                if (h1) {

                    let from_piece = hmove.h.piece(hmove.da.from)!

                    let occupied = hmove.ha.pos.board.occupied

                    let collect = []
                    for (let toH1 of attacks(from_piece, c[from]!, occupied)) {

                        let toH1Square = hmove.ha.piece(toH1)

                        if (toH1Square) {
                            continue
                        }

                        for (let c of res) {
                            let ctx = copy_ctx(c)
                            if (ctx[h1] && ctx[h1] !== toH1Square) {
                                continue
                            }

                            ctx[h1] = toH1

                            collect.push(ctx)
                        }

                    }
                    if (collect.length === 0) {
                        return undefined
                    }
                    res = collect
                }

                if (Q) {

                    let from_piece = hmove.h.piece(hmove.da.from)!

                    let q_color = Q.toLowerCase() === Q ? lowers_color : opposite(lowers_color)

                    let bQ = SquareSet.empty()
                    if (blockQ) {
                        bQ.set(c[blockQ], true)
                    }
                    let occupied = hmove.ha.pos.board.occupied.diff(bQ)

                    let rres: RuleContext[] = []
                    for (let toQ of attacks(from_piece, c[from]!, occupied)) {

                        let toQPiece = hmove.ha.piece(toQ)

                        if (!toQPiece) {
                            continue
                        }

                        if (role_to_char(toQPiece.role) !== Q.toLowerCase() || toQPiece.color !== q_color) {
                            continue
                        }


                        let collect = []
                        for (let c of res) {
                            let ctx = copy_ctx(c)
                            if (ctx[Q] && ctx[Q] !== toQ) {
                                continue
                            }

                            ctx[Q] = toQ

                            collect.push(ctx)
                        }


                        if (collect.length === 0) {
                            return undefined
                        }
                        rres = collect
                    }
                    if (rres.length === 0) {
                        return undefined
                    }
                    res = rres

                }

                return res
            }
    }
    }
}


function split_ops_h1_q(to: string) {
    let op = to[0]
    let a = to.slice(1).indexOf('+')
    let b = to.slice(1).indexOf('=')
    let c = to.slice(1).indexOf('/')
    let i = Math.min(...[a === -1 ? 99 : a, b === -1 ? 99 : b, c === -1 ? 99 : c])

    let h1Q = i === 99 ? to.slice(1) : to.slice(1, i + 1)

    let h1 = h1Q.match(/([a-h][1|3-8])/)?.[1]
    let Q = h1Q.match(/([pqrbnkPQRBNK]2?)/)?.[1]

    return [op, h1, Q, i === 99 ? '' : to.slice(i + 1)] as [string, string | undefined, string | undefined, string]
}
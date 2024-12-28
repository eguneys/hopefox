import { checkServerIdentity } from 'tls'
import { Hopefox, move_to_san2 } from './kaggle'
import { Color, Move, Square } from './types'
import { opposite } from './util'
import { attacks, between, rookAttacks } from './attacks'
import { SquareSet } from './squareSet'

type Rule = (h: Hopefox, ha: Hopefox, da: Move, ctx: RuleContext) => RuleContext[] | undefined
type RuleContext = Record<string, Square[]>

const copy_ctx = (ctx: RuleContext) => {
    let res: RuleContext = {}
    for (let key of Object.keys(ctx)) {
        res[key] = [...ctx[key]]
    }
    return res
}

function parse_rule3(str: string) {
    let ss = str.split(' ')

    let [from, to1, to2] = ss

    if (to1 === undefined) {
        return undefined
    }

    let bg5 = to1.match(/\/([a-h1-8]{2})/)
    let bQ = to1.match(/\/(.{1})/)

    let ch5 = to1.match(/\+([a-h1-8]{2})/)
    let cK = to1.match(/\+(.{1})/)
    let eg5 = to1.match(/\=([a-h1-8]{2})/)
    let eK = to1.match(/\=(.{1})/)

    let mate = to1.includes('#')

    return (h: Hopefox, ha: Hopefox, da: Move, is_lowers_turn: boolean, ctx: RuleContext) => {

        let from_role = h.role(da.from)!

        if (mate) {
            if (!ha.is_checkmate) {
                return undefined
            }
        }

        if (is_lowers_turn) {
            if (from_role[0] !== from) {
                return undefined
            }


            if (ctx[from]) {
                if (!ctx[from].includes(da.from)) {
                    return undefined
                }
            }
            ctx[from] = [da.to]
            let res = check_tos(ctx, h, ha, da, h.turn)
            return res
        }

        if (from.toLowerCase() !== from) {
            if (from.toLowerCase() !== from_role[0]) {
                return undefined
            }

            if (ctx[from]) {
                if (!ctx[from].includes(da.from)) {
                    return undefined
                }
            }

            ctx[from] = [da.to]

            let res = check_tos(ctx, h, ha, da, ha.turn)
            return res
        }

        for (let key of Object.keys(ctx)) {
            let i = ctx[key].findIndex(_ => _ === da.from)
            if (i !== -1) {
                ctx[key].splice(i, 1, da.to)
            }
        }

        return ha.h_dests.flatMap(([h, ha, da]) => {
            let base_ctx = copy_ctx(ctx)

            if (move_to_san2([h, ha, da]) === 'Rxf2') {

                console.log('here')
            }

            let from_role = h.role(da.from)!

            if (from_role[0] !== from) {
                return []
            }

            if (base_ctx[from]) {
                if (!base_ctx[from].includes(da.from)) {
                    return []
                }
            }

            let res = check_tos(copy_ctx(base_ctx), h, ha, da, h.turn)
            
            if (!res) {
                return []
            }
            return res
        })
    }


    function check_tos(base_ctx: RuleContext, h: Hopefox, ha: Hopefox, da: Move, lowers_turn: Color) {

        let from_piece = h.piece(da.from)!


        function fill_blocks(ctx: RuleContext, toh5: Square) {
            if (bg5 !== null) {
                let [_, g5] = bg5

                let g5s = [...between(da.to, toh5)]

                if (g5s.length === 0) {
                    return false
                }

                if (ctx[g5]) {
                    ctx[g5] = g5s.filter(ig5 =>
                        ctx[g5].includes(ig5)
                    )
                } else {
                    ctx[g5] = g5s
                }
            }
            return true
        }

        let bQs = undefined
        if (bQ !== null) {

            bQs = SquareSet.empty()
            let [_, Q] = bQ

            let q_color = Q.toLowerCase() === Q ? lowers_turn : opposite(lowers_turn)

            for (let toQ of attacks(from_piece, da.to, ha.pos.board.occupied)) {
                let ctx = copy_ctx(base_ctx)

                let toQPiece = ha.piece(toQ)

                if (!toQPiece) {
                    continue
                }

                if (toQPiece.role[0] !== Q.toLowerCase() || toQPiece.color !== q_color) {
                    continue
                }

                if (ctx[Q] && !ctx[Q].includes(toQ)) {
                    continue
                }

                ctx[Q] = [toQ]

                bQs = bQs.set(toQ, true)
            }

            if (bQs.isEmpty()) {
                return undefined
            }
        }


        if (ch5 !== null) {
            let [_, h5] = ch5

            let res: RuleContext[] = []

            let occupied = ha.pos.board.occupied

            if (bQs !== undefined) {
                occupied = occupied.diff(bQs)
            }

            for (let toh5 of attacks(from_piece, da.to, occupied)) {
                let ctx = copy_ctx(base_ctx)

                if (bQs !== undefined) {
                    if (between(da.to, toh5).intersect(bQs).isEmpty()) {
                        continue
                    }
                }


                if (ctx[h5]) {
                    if (!ctx[h5].includes(toh5)) {
                        continue
                    } else {
                        ctx[h5] = [toh5]
                    }
                } else {
                    ctx[h5] = [toh5]
                }

                if (fill_blocks(ctx, toh5)) {
                    res.push(ctx)
                }
            }
            return res
        }

        if (cK !== null) {
            let [_, K] = cK
            let k_color = K.toLowerCase() === K ? lowers_turn : opposite(lowers_turn)

            let res: RuleContext[] = []
            let occupied = ha.pos.board.occupied

            if (bQs !== undefined) {
                occupied = occupied.diff(bQs)
            }



            for (let toK of attacks(from_piece, da.to, occupied)) {
                let ctx = copy_ctx(base_ctx)

                let toKPiece = ha.piece(toK)

                if (!toKPiece) {
                    continue
                }

                if (toKPiece.role[0] !== K.toLowerCase() || toKPiece.color !== k_color) {
                    continue
                }

                if (ctx[K] && !ctx[K].includes(toK)) {
                    continue
                }

                if (bQs !== undefined) {
                    if (between(da.to, toK).intersect(bQs).isEmpty()) {
                        continue
                    }
                }

                ctx[K] = [toK]

                if (fill_blocks(ctx, toK)) {
                    res.push(ctx)
                }
            }
            return res
        }


        if (eg5 !== null) {
            let [_, g5] = eg5

            let res: RuleContext[] = []
            let tog5 = da.to
            let ctx = copy_ctx(base_ctx)

            if (ctx[g5]) {
                if (!ctx[g5].includes(tog5)) {
                    return undefined
                } else {
                    ctx[g5] = [tog5]
                }
            } else {
                ctx[g5] = [tog5]
            }



            if (fill_blocks(ctx, tog5)) {
                res.push(ctx)
            }
            return res
        }

        if (eK !== null) {
            let [_, K] = eK

            let res: RuleContext[] = []
            let toK = da.to
            let ctx = copy_ctx(base_ctx)

            let k_color = K.toLowerCase() === K ? lowers_turn : opposite(lowers_turn)

            let toKPiece = h.piece(toK)

            if (!toKPiece) {
                return undefined
            } 
            
            if (toKPiece.role[0] !== K.toLowerCase() || toKPiece.color !== k_color) {
                return undefined
            }

            if (ctx[K] && !ctx[K].includes(toK)) {
                return undefined
            }

            ctx[K] = [toK]

            if (fill_blocks(ctx, toK)) {
                res.push(ctx)
            }

            return res
        }
    }
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
        let xx = parse_rule3(this.rule)
        this._rr = (h: Hopefox, ha: Hopefox, da: Move, ctx: RuleContext) => xx?.(h, ha, da, depth % 2 === 0, ctx)
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

    san?: string

    nb_visits: number = 0

    _rr: Rule

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

    run(haa: [Hopefox, Hopefox, Move], ctx: RuleContext) {
        return this._rr(...haa, ctx)
    }

    add_children(nodes: RuleNode[]) {
        nodes.forEach(_ => _.parent = this)
        this.children.push(...nodes)
    }
}

export function bestsan3(fen: string, rules: string) {

    let node = RuleNode.parse_rules(rules)

    let h = Hopefox.from_fen(fen)

    return rule_search(h, node, {})?.[0]
}

export function rule_search_tree(fen: string, rules: string) {

    let node = RuleNode.parse_rules(rules)

    let h = Hopefox.from_fen(fen)

    rule_search(h, node, {})

    return node
}

function rule_search(h: Hopefox, node: RuleNode, base_ctx: RuleContext) {

    let res: string[] = []

    let rules = node.is_only_children
    if (rules.length === 0) {
        return undefined
    }
    let rest: string[] = []
    h.h_dests.forEach(haa => {
        let ctx2 = copy_ctx(base_ctx)

        let a = move_to_san2(haa)

        if (a === 'Qf8+') {
            console.log('here')
        }
        let rule = rules.find(rule => {
            let ctx = copy_ctx(ctx2)
            let res = rule.run(haa, ctx)
            if (res === undefined) {
                return false
            }
            return res.find(ctx => {
                let res = rule_search(haa[1], rule, ctx)
                return res === undefined || res.length > 0
            })
        })

        

        if (!rule) {
            rest.push(a)
            return
        }

        rule.san = a
        //console.log(h.fen, a, rule.rule)
        res.push(a)
    })

    let rr = rules.find(_ => _.rule === '.')
    if (rr) {
        rr.san = rest[0]
        return undefined
    }

    return res
}
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

//parse_rule('x+ [^kx]=y =y')

function parse_rule(rule: string) {

    return (h: Hopefox) => {
    let moves: any = []
    let i = 0
    let sign = true
    let andor = 'and'
    let flag = false

    function parse() {
        let m = []
        for (; i < rule.length; i++) {
            if (rule[i] === ' ') {
                i++
                moves.push([sign, m, flag])
                flag = false
                sign = true
                andor = 'and'
                m = []
            }
            if (rule[i] === '#') {
                m.push([andor, (h: Hopefox, ha: Hopefox, da: Hopefox) => ha.is_checkmate])
            }
            if (rule[i] === 'o') {
                m.push([andor, (h: Hopefox, ha: Hopefox, da: Move) => !h.role(da.to)])
            }
            if (rule[i] === 'x') {
                m.push([andor, (h: Hopefox, ha: Hopefox, da: Move) => !!h.role(da.to)])
            }
            if (rule[i] === '+') {
                m.push([andor, (h: Hopefox, ha: Hopefox, da: Move) => ha.is_check])
            }
            if (rule[i] === 'k') {
                m.push([andor, (h: Hopefox, ha: Hopefox, da: Move) => h.role(da.from) === 'king'])
            }
            if (rule[i] === 'q') {
                m.push([andor, (h: Hopefox, ha: Hopefox, da: Move) => h.role(da.from) === 'queen'])
            }
            if (rule[i] === 'b') {
                m.push([andor, (h: Hopefox, ha: Hopefox, da: Move) => h.role(da.from) === 'bishop'])
            }
            if (rule[i] === 'n') {
                m.push([andor, (h: Hopefox, ha: Hopefox, da: Move) => h.role(da.from) === 'knight'])
            }
            if (rule[i] === 'r') {
                m.push([andor, (h: Hopefox, ha: Hopefox, da: Move) => h.role(da.from) === 'rook'])
            }
            if (rule[i] === 'p') {
                m.push([andor, (h: Hopefox, ha: Hopefox, da: Move) => h.role(da.from) === 'pawn'])
            }
            if (rule[i] === '.') {

            }

            if (rule[i] === '{') {
                flag = true
            }
            if (rule[i] === '[') {
                andor = 'or'
                if (rule[i + 1] === '^') {
                    i++
                    sign = false
                }
            }
            if (rule[i] === ']') {
                andor = 'and'
            }
            if (rule[i] === '=') {
                i++
                if (rule[i] === 'y') {
                    m.push([andor, (h: Hopefox, ha: Hopefox, da: Move, ctx?: any) => {
                        if (ctx.y) {
                            return ctx.y === da.to
                        }

                        ctx.y = da.to
                    }])
                } else if (rule[i] === 'q') {
                    m.push([andor, (h: Hopefox, ha: Hopefox, da: Move, ctx?: any) => {
                        return h.role(da.to) === 'queen'
                    }])
                } else if (rule[i] === 'r') {
                    m.push([andor, (h: Hopefox, ha: Hopefox, da: Move, ctx?: any) => {
                        return h.role(da.to) === 'rook'
                    }])
                } else if (rule[i] === 'n') {
                    m.push([andor, (h: Hopefox, ha: Hopefox, da: Move, ctx?: any) => {
                        return h.role(da.to) === 'knight'
                    }])
                } else if (rule[i] === 'b') {
                    m.push([andor, (h: Hopefox, ha: Hopefox, da: Move, ctx?: any) => {
                        return h.role(da.to) === 'bishop'
                    }])
                } 
            }
        }
        moves.push([sign, m, flag])
    }
    parse()

        function deep(dd: any, im: number, _ctx: any) {
            function log(...msg: any[]) {
                let res = '|' + '-'.repeat(im)
                //console.log(res, ...msg)
            }
            if (im >= moves.length) {
                return ['x']
            }
            let [sign, ms, flag] = moves[im]
            log('signmsflag', sign, ms, flag)

            let res = dd.filter((_: any) => {

                let ctx = { ..._ctx }
                let res = true
                for (let i = 0; i < ms.length; i++) {
                    let r = ms[i][1](..._, ctx)

                    if (i === 0) {
                        res = r ?? true
                    }

                    /*
                    if (move_to_san(_[0].pos, _[2]) === 'Qxd8+') {

                        if (i === 2) {

                            r = ms[i][1](..._, ctx)
                        }
                    }
                        */
                    if (r === undefined) {
                        continue
                    }
                    if (ms[i][0] === 'and') {
                        res = res && r
                    } else {
                        res = res || r
                    }
                    //console.log(ctx, res, r)
                }

                log(move_to_san2(_), im)
                log(res, 'sign', sign)

                if (!sign) {
                    res = !res
                }
                if (!res) {
                    return false
                }

                if (im >= moves.length) {
                    return true
                }
                log('going deep', im)
                if (deep(_[1].h_dests, im + 1, ctx).length === 0) {
                    log('fail', im)
                    return false
                }
                log('success', im)
                return true
            })

            log(dd.length, res.length, flag)
            if (flag) {
                if (res.length === dd.length) {
                    return res
                }
                return []
            }
            return res
        }

        return deep(h.h_dests, 0, {}).map((_: any) => _[2])
    }
}


const rh: any = [
    [-1, parse_rule('x=y {[^=y]')],
    [0, parse_rule('x')],
    [0, parse_rule('o')],
    [-1, parse_rule('xq+ x k=y {[^=y]')],
    [3, parse_rule('[bq]=y px=y')],
    [2, parse_rule('o=y x=y {[^=y]')],
    [2, parse_rule('x=y x=y {[^=y]')],
    [1, parse_rule('o x=y {[^=y]')],
    [1, parse_rule('x x=y {[^=y]')],
]

const rr: any = [
    [0, parse_rule('x#')],
    [0, parse_rule('o#')],
    [0, parse_rule('o+ k #')],
    [0, parse_rule('x+ k #')],
    [0, parse_rule('x+=y =y #=y')],
    [0, parse_rule('o+=y =y #=y')],
    [0, parse_rule('o+ [^kx]=y #=y')],
    [0, parse_rule('x+ [^kx]=y #=y')],
    [0, parse_rule('o+=y p=y o#')],
    [0, parse_rule('o+ k o#')],
    [0, parse_rule('o+ k x#')],
    [0, parse_rule('o+=y =y #')],
    [0, parse_rule('k o #')],
    [0, parse_rule('x=y =y o#')],
    [1, parse_rule('o+=y =y {[^=y]')],
    [1, parse_rule('x+=y xq=y {[^#]')],
    [1, parse_rule('x+=y xq=y {[^#]')],
    [1, parse_rule('x+=y k=y {[^#]')],
    [1, parse_rule('o+ k {[^#]')],
    [1, parse_rule('x =y {[^#]')],
]

const rrfork: any = [
    [0, parse_rule('r+ k rx=q')],
    [0, parse_rule('r+ k rx=b')],
    [0, parse_rule('b+ k bx=r')],
    [0, parse_rule('r+ k rx=n')],
    [-1, parse_rule('n+ k nx=b')],
    [-1, parse_rule('n+ k nx=r')],
    [-2, parse_rule('n+ k nx=q')],
    [-3, parse_rule('nx=q')],
    [-2, parse_rule('nx=r')],
    [-2, parse_rule('nx=b=y {[^x=y]')],
    [-2, parse_rule('rx=n')],
    [-2, parse_rule('rx=b')],
    [-3, parse_rule('rx=q')],
    [-2, parse_rule('bx=r')],
    [-2, parse_rule('bx=q')],
    [-2, parse_rule('qx=q')],
]

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
                .sort((a, b) => a[0] - b[0])[0]?.[0] ?? 0

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

                let c = r(h, ha, da, _ctx)
                if (!c) {
                    return false
                }
                if ((i_r + 1) >= rr.length) {
                    return true
                }
                let dd = ha.h_dests.filter(_ => {
                    let ctx = { ..._ctx }
                    let ll = move_to_san2([h, ha, da]) === 'Ne2+'
                    if (ll) {
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


                if (to.includes('q')) {
                    if (to_role !== 'queen') {
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


const rules = parse_rule2(`
-1 "nfork"fork "ncheck "kflee "ntakesq
0 "kflee"king k
0 "ncheck"check n+
-3 "ntakesq"capture nx=q
`)

const mates = parse_rule2(`
-1 "mate #
`)

function h_bestmove(h: Hopefox) {

    return move_to_san(h.pos, rules(h))
}
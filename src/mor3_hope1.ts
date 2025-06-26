import { Chess } from "./chess"
import { EMPTY_FEN, makeFen, parseFen } from "./fen"
import { color_c_opposite } from "./hopefox_c"
import { SquareSet } from "./squareSet"
import { Color, Piece, Role, Square } from "./types"
import { attacks, between, pawnAttacks } from "./attacks"
import { squareSet } from "./debug"
import { blocks } from "./hopefox_helper"

enum TokenType {
    ZERO = 'ZERO',
    PIECE_NAME = 'PIECE_NAME',
    OPERATOR_MOVE = 'OPERATOR_MOVE',
    OPERATOR_ATTACK = 'OPERATOR_ATTACK',
    OPERATOR_DEFEND = 'OPERATOR_DEFEND',
    OPERATOR_BLOCK = 'OPERATOR_BLOCK',
    OPERATOR_UNBLOCK = 'OPERATOR_UNBLOCK',
    PRECESSOR = 'PRECESSOR',
    EOF = 'EOF'
}

interface Token {
    type: TokenType
    value: string
}

const PIECE_NAMES = [
    'p', 'n', 'q', 'b', 'k', 'r',
    'P', 'N', 'Q', 'B', 'K', 'R',
    'p2', 'n2', 'b2', 'r2',
    'P2', 'N2', 'B2', 'R2',
]

const PRECESSORS = [
    'G', 'Z', 'A', 'E'
]

export type Pieces = typeof PIECE_NAMES[number]

export type Precessor = typeof PRECESSORS[number]

export class Lexer {
    private text: string
    private pos: number
    private current_char?: string

    private operators: Map<string, TokenType>

    constructor(text: string) {
        this.text = text
        this.pos = 0
        this.current_char = this.text[this.pos]

        this.operators = new Map([
            ['=', TokenType.OPERATOR_MOVE],
            ['+', TokenType.OPERATOR_ATTACK],
            ['-', TokenType.OPERATOR_DEFEND],
            ['/', TokenType.OPERATOR_BLOCK],
            ['|', TokenType.OPERATOR_UNBLOCK],
        ])
    }


    private advance() {
        this.pos++;
        this.current_char = this.text[this.pos]
    }

    private skip_whitespace() {
        while (this.current_char !== undefined && /\s/.test(this.current_char)) {
            this.advance()
        }
    }

    private is_alpha_num(char: string): boolean {
        return /[a-zA-Z0-9_]/.test(char)
    }

    private word() {
        let result = ''
        while (this.current_char !== undefined && this.is_alpha_num(this.current_char)) {
            result += this.current_char
            this.advance()
        }
        return result
    }



    public get_next_token(): Token {
        while (this.current_char !== undefined) {
            this.skip_whitespace()

            if (this.current_char === '0') {
                this.advance()
                return { type: TokenType.ZERO, value: '0' }
            }

            const word_str = this.word()
            if (PRECESSORS.includes(word_str)) {
                return { type: TokenType.PRECESSOR, value: word_str }
            }
            if (PIECE_NAMES.includes(word_str)) {
                return { type: TokenType.PIECE_NAME, value: word_str }
            }
            if (this.operators.has(this.current_char)) {
                let value = this.current_char
                let type = this.operators.get(this.current_char)!
                this.advance()
                return { type,  value }
            }
            if (this.current_char === undefined) {
                break
            }
            throw new LexerError(`Unexpected token ${this.current_char}`)
        }
        return { type: TokenType.EOF, value: '' }
    }
}

class LexerError extends Error {}
class ParserError extends Error {}


export class Parser {
    private lexer: Lexer
    private current_token: Token
    private lookahead_token: Token
    private lookahead2_token: Token

    constructor(lexer: Lexer) {
        this.lexer = lexer
        this.current_token = this.lexer.get_next_token()
        this.lookahead_token = this.lexer.get_next_token()
        this.lookahead2_token = this.lexer.get_next_token()
    }

    private error(expected_type?: TokenType) {

        if (expected_type) {
            throw new ParserError(`Expected ${expected_type} but got ${this.current_token.type} ('${this.current_token.value}')`)
        } else {
            throw new ParserError(`Unexpected token ${this.current_token.type} ('${this.current_token.value}')`)
        }
    }


    private advance_tokens() {
        this.current_token = this.lookahead_token
        this.lookahead_token = this.lookahead2_token
        this.lookahead2_token = this.lexer.get_next_token()
    }

    private eat(token_type: TokenType) {
        if (this.current_token.type === token_type) {
            this.advance_tokens()
        } else {
            this.error(token_type)
        }
    }

    private piece() {
        const token = this.current_token
        this.eat(TokenType.PIECE_NAME)
        return token.value
    }

    private precessor() {
        const token = this.current_token
        this.eat(TokenType.PRECESSOR)
        return token.value
    }

    parse_sentence(): ParsedSentence {

        const precessor = this.precessor()

        if (this.current_token.type === TokenType.EOF) {
            return { type: 'precessor', precessor }
        }
        
        if (this.current_token.type === TokenType.OPERATOR_MOVE) {
            const result = this.parse_capture(precessor)
            this.eat(TokenType.EOF)
            return result
        } else if (this.lookahead_token.type === TokenType.OPERATOR_MOVE) {
            const result = this.parse_move_attack(precessor)
            this.eat(TokenType.EOF)
            return result
        } else {
            const result = this.parse_attack(precessor)
            this.eat(TokenType.EOF)
            return result
        }
        
        throw this.error()
    }

    parse_capture(precessor: Precessor): CaptureSentence {
        this.eat(TokenType.OPERATOR_MOVE)
        let captured = this.piece()

        return { type: 'capture', precessor, captured }
    }

    parse_attack(precessor: Precessor): AttackSentence {
        let piece = this.piece()

        let to_attack: Pieces[] = []
        let to_defend: Pieces[] = []
        let zero_attack = false
        let zero_defend = false

        while (true) {
            let current_token_type = this.current_token.type
            if (current_token_type === TokenType.ZERO) {
                this.eat(TokenType.ZERO)
                if (this.current_token.type === TokenType.OPERATOR_ATTACK) {
                    this.eat(TokenType.OPERATOR_ATTACK)
                    zero_attack = true
                } else if (this.current_token.type === TokenType.OPERATOR_DEFEND) {
                    this.eat(TokenType.OPERATOR_DEFEND)
                    zero_defend = true
                }
            } else {
                break
            }
        }

        return {
            type: 'attack',
            precessor,
            piece,
            to_attack,
            to_defend,
            zero_attack,
            zero_defend
        }
    }

    // E b= +Q +R/Q
    parse_move_attack(precessor: Precessor): MoveAttackSentence {

        let move = this.piece()
        this.eat(TokenType.OPERATOR_MOVE)

        let attack = []
        let blocked: [Pieces, Pieces][] = []
        let unblocked: [Pieces, Pieces][] = []

        let captured: Pieces | undefined

        let zero_attack = false,
        zero_defend = false

        while (true) {

            let current_token_type = this.current_token.type
            let lookahead_token_type = this.lookahead_token.type

            if (current_token_type === TokenType.ZERO) {
                this.eat(TokenType.ZERO)
                if (this.current_token.type === TokenType.OPERATOR_ATTACK) {
                    this.eat(TokenType.OPERATOR_ATTACK)
                    zero_attack = true
                } else if (this.current_token.type === TokenType.OPERATOR_DEFEND) {
                    this.eat(TokenType.OPERATOR_DEFEND)
                    zero_defend = true
                }
            } else if (current_token_type === TokenType.OPERATOR_MOVE) {
                this.eat(TokenType.OPERATOR_MOVE)
                let piece = this.piece()

                captured = piece


            } else if (lookahead_token_type === TokenType.OPERATOR_ATTACK) {
                let piece = this.piece()
                this.eat(TokenType.OPERATOR_ATTACK)

                if (this.current_token.type === TokenType.OPERATOR_UNBLOCK) {
                    this.eat(TokenType.OPERATOR_UNBLOCK)
                    let piece2 = this.piece()

                    unblocked.push([piece, piece2])
                }

            } else if (current_token_type === TokenType.OPERATOR_ATTACK) {

                this.eat(TokenType.OPERATOR_ATTACK)
                let attack1 = this.piece()
                current_token_type = this.current_token.type
                if (current_token_type === TokenType.OPERATOR_BLOCK) {
                    this.eat(TokenType.OPERATOR_BLOCK)
                    let blocked1 = this.piece()

                    blocked.push([attack1, blocked1])
                    continue
                }
                attack.push(attack1)
            } else {
                break
            }
        }

        return {
            type: 'move_attack',
            precessor,
            move,
            captured,
            attack,
            blocked,
            unblocked,
            zero_attack,
            zero_defend
        }
    }
}

type ParsedSentence = MoveAttackSentence
| AttackSentence
| PrecessorSentence
| CaptureSentence

type CaptureSentence = {
    type: 'capture',
    precessor: Precessor,
    captured: Pieces
}

type PrecessorSentence = {
    type: 'precessor',
    precessor: Precessor
}

type MoveAttackSentence = {
    type: 'move_attack'
    precessor: Precessor
    move: Pieces
    captured: Pieces | undefined
    attack: Pieces[]
    blocked: [Pieces, Pieces][]
    unblocked: [Pieces, Pieces][]
    zero_attack: boolean
    zero_defend: boolean
}


type AttackSentence = {
    type: 'attack'
    precessor: Precessor
    piece: Pieces
    to_attack: Pieces[]
    to_defend: Pieces[]
    zero_attack: boolean
    zero_defend: boolean
}

function move_attack_constraint(res: MoveAttackSentence) {

    let move = parse_piece(res.move)
    let attacks1 = res.attack.map(parse_piece)
    let blocked = res.blocked.map(([a, b]) => [parse_piece(a), parse_piece(b)])
    let unblocked = res.unblocked.map(([a, b]) => [parse_piece(a), parse_piece(b)])

    return (q: QBoard) => {
        let res1 = SquareSet.empty()
        let res2 = attacks1.map(_ => SquareSet.empty())
        let res3 = blocked.map(_ => [SquareSet.empty(), SquareSet.empty()])
        let res4 = unblocked.map(_ => [SquareSet.empty(), SquareSet.empty()])

        let occupied = q_occupied(q)
        for (let m1 of q[res.move]) {
            move: for (let m2 of attacks(move, m1, occupied)) {

                let a2s = attacks(move, m2, occupied.without(m1))

                for (let i =0; i < res.attack.length; i++) {
                    let a1 = res.attack[i]

                    //let ayay = squareSet(a2s.intersect(q[a1]))
                    let skipped = true
                    for (let aa1 of a2s.intersect(q[a1])) {
                        res1 = res1.set(m1, true)
                        res2[i] = res2[i].set(aa1, true)
                        skipped = false
                    }

                    if (skipped) {
                        continue move
                    }
                }



                for (let i =0; i < res.blocked.length; i++) {
                    let [a3, a2] = res.blocked[i]

                    let skipped = true
                    for (let aa2 of a2s.intersect(q[a2])) {

                        let a3s = attacks(move, m2, occupied.without(m1).without(aa2))
                        for (let aa3 of a3s.intersect(q[a3])) {
                            if (!between(m2, aa3).has(aa2)) {
                                continue
                            }

                            res1 = res1.set(m1, true)
                            res3[i][0] = res3[i][0].set(aa3, true)
                            res3[i][1] = res3[i][1].set(aa2, true)
                            skipped = false
                        }
                    }

                    if (skipped) {
                        continue move
                    }
                }

                for (let i =0; i < res.unblocked.length; i++) {
                    let [u3, u2] = res.unblocked[i]

                    for (let u3s of q[u3]) {
                        let a3s = attacks(unblocked[i][0], u3s, occupied.without(m1))

                        for (let u2s of q[u2]) {
                            if (a3s.has(u2s) && between(u3s, u2s).has(m1)) {
                                res1 = res1.set(m1, true)
                                res4[i][0] = res4[i][0].set(u3s, true)
                                res4[i][1] = res4[i][1].set(u2s, true)
                            }
                        }
                    }
                }

            }
        }


        q[res.move] = res1

        for (let i = 0; i < res.attack.length; i++) {
            q[res.attack[i]] = res2[i]
        }

        for (let i = 0; i < res.blocked.length; i++) {
            q[res.blocked[i][0]] = res3[i][0]
            q[res.blocked[i][1]] = res3[i][1]
        }


        for (let i = 0; i < res.unblocked.length; i++) {
            q[res.unblocked[i][0]] = res4[i][0]
            q[res.unblocked[i][1]] = res4[i][1]
        }
    }
}


export type Line = {
    depth: number
    rule: string
    children: Line[]
    m: M[]
    long: boolean
    no_c: boolean
    sentence: ParsedSentence
}

export type M = {
    board: QBoard
 }

export function parse_rules(str: string): Line {
    let ss = str.trim().split('\n')

    let root = { depth: -1, rule: '*', children: [], m: [], long: false, no_c: false, cc: no_constraint }
    const stack: Line[] = [root]

    for (let i = 0; i < ss.length; i++) {
        let line = ss[i]
        let rule = line.trim()
        if (!rule) continue

        const depth = line.search(/\S/)

        let no_c = false
        let long = false
        if (rule[rule.length - 1] === '5') {
            long = true
            rule = rule.slice(0, -1).trim()
        }

        if (rule[rule.length - 1] === 'P') {
            no_c = true
            rule = rule.slice(0, -1).trim()
        }



        let node: Line  = { depth, rule, children: [], m: [], long, no_c, cc: no_constraint }

        while (stack.length > depth + 1) {
            stack.pop()
        }

        stack[stack.length - 1].children.push(node)
        stack.push(node)
    }
    return root
}

function parse_line_recur(node: Line) {
    let p = new Parser(new Lexer(node.rule))

    let res = p.parse_sentence()

    node.sentence = res

    node.children.map(parse_line_recur)
}

function cc_recur(node: Line) {
    return (q: QBoard) => {
        let cc = resolve_cc(node.sentence)
        cc(q)
        for (let child of node.children) {
            cc_recur(child)(q)
        }
    }
}

export function mor3(text: string) {

    let root = parse_rules(text)
    root.children.forEach(parse_line_recur)


    const f = (q: QBoard) => {

        cc_recur(root)(q)

        qc_dedup(q)

        qc_kings(q)
    }

    let q = q_board()

    let qq = qc_pull2o(q, ['b', 'B', 'Q', 'k', 'K'], f)

    return qq?.map(qc_fen_singles)
}

const no_constraint = (q: QBoard) => {}
function resolve_cc(res: ParsedSentence) {
    if (res.type === 'move_attack') {
        return move_attack_constraint(res)
    }
    if (res.type === 'attack') {

    }

    return no_constraint
}

type QConstraint = (q: QBoard) => void

const Pieces = PIECE_NAMES

type QBoard = Record<Pieces, SquareSet>


function q_board(): QBoard {
    let res: QBoard = {}

    for (let piece of Pieces) {
        res[piece] = SquareSet.full()
    }

    return res
}

function q_equals(a: QBoard, b: QBoard) {
    for (let p of Pieces) {
        if (!a[p].equals(b[p])) {
            return false
        }
    }
    return true
}

function q_clone(a: QBoard) {
    return { ...a }
}

function qc_put(q: QBoard, pieces: Pieces, square: Square) {
    q[pieces] = q[pieces].intersect(SquareSet.fromSquare(square))
}


function qc_take(q: QBoard, pieces: Pieces) {
    q[pieces] = SquareSet.empty()
}

function qc_kings(q: QBoard) {

    let K = q['K'].singleSquare()
    if (K) {
        q['k'] = q['k'].intersect(attacks(parse_piece('K'), K, SquareSet.empty()).complement())
    }

    let k = q['k'].singleSquare()
    if (k) {
        q['K'] = q['K'].intersect(attacks(parse_piece('k'), k, SquareSet.empty()).complement())
    }
}

function qc_dedup(q: QBoard) {

    for (let p of Pieces) {

        if (q[p].size() === 1) {
            for (let p2 of Pieces) {
                if (p !== p2) {
                    q[p2] = q[p2].without(q[p].singleSquare()!)
                }
            }
        }
    }
}

function q_occupied(a: QBoard) {
    let res = SquareSet.empty()

    for (let p of Pieces) {
        if (a[p].singleSquare()) {
            res = res.union(a[p])
        }
    }
    return res
}

function qc_pull2o(q: QBoard, pieces: Pieces[], cc: (q: QBoard) => void) {

    let res: QBoard[] = []
    let limit = 0

    function dfs(q: QBoard) {

        //if (limit ++ > 100) return
        //console.log(qc_fen_singles(q))
        let q2 = { ...q }
        let q3 = q2


        while (true) {
            cc(q3)
            if (q_equals(q2, q3)) {
                break
            }

            q2 = q3
            q3 = { ...q3 }
        }

        for (let piece of pieces) {
            if (q3[piece].isEmpty()) {
                //console.log('blow', piece)
                return
            }
        }

        let all_single = true
        for (let piece of pieces) {
            if (q3[piece].singleSquare() === undefined) {
                all_single = false
                break
            }
        }

        if (all_single) {
            res.push(q3)
            return
        }

        for (let piece of pieces) {
            if (q3[piece].singleSquare() !== undefined) {
                continue
            }
            let count = q3[piece].size()
            for (let skip = 0; skip < count; skip++) {
                let q_next = { ...q3 }
                /*
                if (piece === 'King' && skip === 50) {
                    debugger
                }
                    */

                qc_pull1(q_next, piece, skip)
                dfs(q_next)
                if (res.length >= 10) {
                    return
                }
            }
            //console.log('out pull', piece)
            break
        }
    }

    dfs(q)
    return res
}

function qc_pull1(q: QBoard, pieces: Pieces, skip: number = 0) {
    for (let i = 0; i < skip; i++) {
        q[pieces] = q[pieces].withoutFirst()
    }

    let f = q[pieces].first()
    if (f === undefined) {
        return false
    }
    q[pieces] = SquareSet.fromSquare(f)

    return true
}

function qc_fen_singles(q: QBoard) {
    let res = Chess.fromSetupUnchecked(parseFen(EMPTY_FEN).unwrap())

    for (let p of Pieces) {
        let sq = q[p].singleSquare()
        if (sq !== undefined) {

            if (parse_piece_and_squares(p) === undefined) {
                continue
            }
            res.board.set(sq, parse_piece(p))
        }
    }
    return makeFen(res.toSetup())
}

function parse_piece_and_squares(pieces: Pieces): Piece | undefined {

    if (pieces.includes('quare')) {
        return undefined
    }
    return parse_piece(pieces)
}

function parse_piece(pieces: Pieces): Piece {
    const color_pieces = (p: Pieces): Color => p.toLowerCase() === p ? 'white': 'black'

    const pieces_to_role: Record<string, Role> = {
        'r': 'rook',
        'n': 'knight',
        'b': 'bishop',
        'p': 'pawn',
        'q': 'queen',
        'k': 'king',
    }

    if (pieces === 'app') {
        return { color: 'black', role: 'pawn' }
    }
    if (pieces === 'APP') {
        return { color: 'white', role: 'pawn' }
    }
    let color = color_pieces(pieces)
    let role = pieces_to_role[pieces.replace(/2/, '').toLowerCase()]
    return {
        color,
        role
    }
}
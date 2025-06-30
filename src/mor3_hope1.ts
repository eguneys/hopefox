import { Chess } from "./chess"
import { EMPTY_FEN, makeFen, parseFen } from "./fen"
import { color_c_opposite, piece_c_color_of, piece_to_c, PositionManager } from "./hopefox_c"
import { SquareSet } from "./squareSet"
import { Color, Piece, Role, Square } from "./types"
import { between, pawnAttacks } from "./attacks"
import { squareSet } from "./debug"
import { blocks } from "./hopefox_helper"
import { chdir, execArgv, execPath, ppid } from "process"
import { makeSan } from "./san"
import { spawnSync } from "child_process"
import { opposite } from "./util"

enum TokenType {
    MATE = 'MATE',
    ZERO = 'ZERO',
    PIECE_NAME = 'PIECE_NAME',
    SQUARE_NAME = 'SQUARE_NAME',
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

const PLAYER_PIECE_NAMES = [
    'p', 'n', 'q', 'b', 'k', 'r',
    'p2', 'n2', 'b2', 'r2',
]
const OPPONENT_PIECE_NAMES = [
    'P', 'N', 'Q', 'B', 'K', 'R',
    'P2', 'N2', 'B2', 'R2',
]

export const PIECE_NAMES = PLAYER_PIECE_NAMES.concat(OPPONENT_PIECE_NAMES)

const PRECESSORS = [
    'G', 'Z', 'A', 'E', '.'
]

const SQUARE_NAMES = [
    'f7', 'f2'
]

export type Pieces = typeof PIECE_NAMES[number]

export type Precessor = typeof PRECESSORS[number]

export type Squares = typeof SQUARE_NAMES[number]

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

            if (this.current_char === '#') {
                this.advance()
                return { type: TokenType.MATE, value: '#' }
            }

            if (this.current_char === '0') {
                this.advance()
                return { type: TokenType.ZERO, value: '0' }
            }

            if (this.current_char === '.') {
                this.advance()
                return { type: TokenType.PRECESSOR, value: '.' }
            }

            const word_str = this.word()
            if (PRECESSORS.includes(word_str)) {
                return { type: TokenType.PRECESSOR, value: word_str }
            }
            if (PIECE_NAMES.includes(word_str)) {
                return { type: TokenType.PIECE_NAME, value: word_str }
            }
            if (SQUARE_NAMES.includes(word_str)) {
                return { type: TokenType.SQUARE_NAME, value: word_str }
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

        let move_to: Squares | undefined

        if (this.current_token.type === TokenType.SQUARE_NAME) {
            move_to = this.current_token.value
            this.advance_tokens()
        }

        let attack = []
        let blocked: [Pieces, Pieces][] = []
        let unblocked: [Pieces, Pieces][] = []

        let attacked_by = []

        let captured: Pieces | undefined

        let zero_attack = false,
        zero_defend = false

        let is_mate = false

        while (true) {

            let current_token_type = this.current_token.type
            let lookahead_token_type = this.lookahead_token.type

            if (current_token_type === TokenType.MATE) {
                this.eat(TokenType.MATE)
                is_mate = true
            } else if (current_token_type === TokenType.ZERO) {
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
                } else {
                    attacked_by.push(piece)
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
            zero_defend,
            attacked_by,
            is_mate
        }
    }
}

type UndefinedSentence = { type: 'undefined', precessor: 'E' }

type ParsedSentence = 
UndefinedSentence
| MoveAttackSentence
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
    attacked_by: Pieces[]
    is_mate: boolean
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

    let root: Line = { depth: -1, rule: '*', children: [], m: [], long: false, no_c: false, sentence: { type: 'undefined', precessor: 'E' } }
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

        if (rule[rule.length - 1] === 'M') {
            no_c = true
            rule = rule.slice(0, -1).trim()
        }



        let node: Line  = { depth, rule, children: [], m: [], long, no_c, sentence: { type: 'undefined', precessor: 'E' } }

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

/*
function cc_recur(node: Line) {
    return (q: QBoard) => {
        let cc = resolve_cc(node.sentence)
        cc(q)
        for (let child of node.children) {
            cc_recur(child)(q)
        }
    }
}
    */


type QNode = {
    sentence: ParsedSentence
    children: QNode[]
    res: QExpansionNode[]
    children_resolved: boolean
    line: Line
}

type QExpansionNode = {
    parent?: QExpansionNode
    turn: Color
    data: QExpansion
}

function q_node(root: Line): QNode {
    let sentence = root.sentence
    let board = q_board()
    let children = root.children.map(q_node)

    return {
        sentence,
        children,
        res: [],
        children_resolved: false,
        line: root
    }
}

function qe_id(q: QExpansion): QExpansion[] {
    return [{ before: q.before, after: q.after, move: q.move }]
}

function qnode_expand(node: QNode, pieces: Pieces[], qq_parent: QExpansionNode[], parent_turn: Color) {

    let turn = node.sentence.precessor === 'E' ? opposite(parent_turn) :
        node.sentence.precessor === 'A' ? opposite(parent_turn) :
            parent_turn

 
    let sub_res: QExpansionNode[] = []
    let res: QExpansionNode[] = node.res

    //let pcc = make_cc(node, pieces)
    let cc = resolve_cc(node.sentence)

    for (let q_parent of qq_parent) {
        let q = q_parent.data.after

        let eqq = node.sentence.precessor === 'E' ? qe_all_player(q, pieces) :
            node.sentence.precessor === 'A' ? qe_all_opponent(q, pieces) :
                qe_id(q_parent.data)

        out: while (eqq.length !== 0) {

            eqq = eqq.filter(cc)

            for (let ex of eqq) {
                /*
                if (q_fen_singles(ex.before) === '8/8/8/8/8/8/R7/k1K5 w - - 0 1') {
                    console.log('yay')
                }
                    */

                //qc_move_cause(ex)

                qc_dedup(ex)

                qc_safety(ex.before, turn)
                qc_safety(ex.after, opposite(turn))
            }

            for (let piece of pieces) {
                eqq = eqq.filter(_ => {
                    return (_.after[piece] === undefined || !_.after[piece].isEmpty()) &&
                        (_.before[piece] === undefined || !_.before[piece].isEmpty())
                })
            }


            let aqq = []
            for (let eq of eqq) {
                let aq = pick_piece(eq, pieces)
                if (aq.length === 0) {

                    /*
                    if (qc_fen_singles(eq.before, 'white').includes("8/8/8/8/8/8/8")) {
                        console.log(qc_fen_singles(eq.before, 'white'))
                    }


                    if (qc_fen_singles(eq.after, 'black').includes("6rk/7Q")) {

                        console.log('yay')
                        console.log(qcc_is_mate(eq))
                        console.log(qc_fen_singles(eq.after))
                        //console.log(Chess.fromSetup(parseFen(qc_fen_singles(eq.after)).unwrap()).unwrap().isCheckmate())
                        console.log('no')
                    }
                        */
                    if (node.sentence.type === 'move_attack' && node.sentence.is_mate) {

                        if (!qcc_is_mate(eq)) {
                            continue
                        }
                    }


                    if (res.length >= 70000) {
                        break out
                    }

                    res.push({
                        parent: q_parent,
                        data: eq,
                        turn
                    })


                    if (res.length >= 30000) {
                        break out
                    }

                } else {
                    aqq.push(...aq)
                }
            }
            eqq = aqq
        }



    }


    if (node.sentence.precessor === 'E') {
        let lqq = res
        for (let c of node.children) {
            let eqq = qnode_expand(c, pieces, lqq, turn)

            lqq = lqq.filter(p => !eqq.find(_ => _ === p || _.parent === p))
        }
        if (node.children.length === 0 || lqq.length < qq_parent.length) {
            node.children_resolved = true
        }
    } else if (node.sentence.precessor === 'A') {
        let lqq = res
        for (let c of node.children) {
            let eqq = qnode_expand(c, pieces, lqq, turn)

            lqq = lqq.filter(p => !eqq.find(_ => _ === p || _.parent === p))
        }
        if (node.children.length === 0 || lqq.length === 0) {
            node.children_resolved = true
        }
    } else if (node.sentence.precessor === '.') {
        node.children_resolved = true
    } else if (node.sentence.precessor === 'G') {
        node.children_resolved = true
    }


    return res
}

let m: PositionManager

export function set_m(p: PositionManager) {
    m = p
}

/*

* ? <>
└─ E q= OK <2r3k1/5pp1/Qq6/b1N5/2nP1P2/8/5K2/2B1N3 w - - 0 1 Qxc4..8>

*/
export function find_san_mor(fen: string, rule: string) {
    let a = mor3(rule, fen)

    let m = a.trim().split('\n')[1].match(/<[^\s]* [^\s]* [^\s]* [^\s]* [^\s]* [^\s]* ([^>]*)/)

    let res = m?.[1]

    if (res?.includes('.')) {
        return res.slice(0, res.indexOf('.'))
    } else {
        return res
    }
}

function qcc_is_mate(eq: QExpansion) {
    let fen = q_fen_singles(eq.after, 'black')

    let pos = m.create_position(fen)

    let res = m.is_checkmate(pos)

    m.delete_position(pos)
    return res
}

function pick_piece(q: QExpansion, pieces: Pieces[]) {
    let res: QExpansion[] = []

    for (let p of pieces) {
        if (q.move && q.move[0] === p) {
            continue
        }
        let iq = { ... q.before}
        let limit = 2
        while (iq[p] !== undefined && iq[p].singleSquare() === undefined) {
            if (limit-- === 0) {
                break
            }
            let aq = {...iq}
            qc_pull1(aq, p)

            let before = aq
            let after = {...q.after}

            after[p] = before[p]

            let move = q.move
            res.push({
                before,
                after,
                move
            })
            qcc_exclude(iq, p, aq[p]!.singleSquare()!)
        }
        if (res.length > 0) {
            break
        }
    }
    return res
}

function qcc_exclude(q: QBoard, p: Pieces, sq: Square) {
    q[p] = q[p]?.without(sq)
}

/*
function qnode_pull2o(node: QNode, pieces: Pieces[]) {

    let res: QExpansion[] = []
    let limit = 0

    let cc = resolve_cc(node.sentence)

    let q = node.board
    let qq = node.sentence.precessor === 'E' ? qe_all_player(q, pieces) : qe_all_opponent(q, pieces)


    function dfs(qq: QExpansion[]) {

        //if (limit++ >  100) return false
        //console.log(qc_fen_singles(q))

        while (true) {
            let expanded = qq.slice(0)

            expanded = expanded.filter(_ => cc(_))

            for (let ex of expanded) {

                qc_move_cause(ex)

                qc_dedup(ex.before)
                qc_kings(ex.before)

                qc_dedup(ex.after)
                qc_kings(ex.after)

            }

            for (let piece of pieces) {
                expanded = expanded.filter(_ => {
                    return (_.after[piece] === undefined || !_.after[piece].isEmpty()) && 
                    (_.before[piece] === undefined || !_.before[piece].isEmpty())
                })
            }

            let stable = false
            if (expanded.length === qq.length) {
                stable = true
                for (let i = 0; i < expanded.length; i++) {
                    if (!q_equals(expanded[i].after, qq[i].after)) {
                        stable = false
                        break
                    }
                }
            }
            if (stable) {

                qq5: for (let q5 of qq) {


                    let matched_child = node.children.length === 0
                    for (let child of node.children) {
                        child.board = { ...q5.after }
                        let res = qnode_pull2o(child, pieces)

                        if (child.sentence.precessor === 'Z') {
                            if (res.length === 0) {
                                matched_child = true
                                break
                            }
                        } else if (res.length > 0) {
                            matched_child = true
                            break
                        }
                    }

                    if (!matched_child) {
                        if (node.sentence.precessor === 'A') {
                            return
                        }
                    } else {
                        {
                            let all_single = true
                            for (let piece of pieces) {

                                if (q5.before[piece] !== undefined && !q5.before[piece].isEmpty() && q5.before[piece].singleSquare() === undefined) {
                                    all_single = false
                                    break
                                }
                            }

                            if (all_single) {
                                res.push({
                                    before: {...q5.before},
                                    after: {...q5.after},
                                    move: q5.move
                                })
                                qq.splice(qq.indexOf(q5), 1)
                                if (res.length >= 1) {
                                    return
                                }
                            }
                        }
                    }
                }

                break


            }

            qq = expanded
        }


        for (let q3 of qq) {
            for (let piece of pieces) {

                let q3_piece = q3.after[piece]
                if (q3_piece === undefined || q3_piece!.singleSquare() !== undefined) {
                    continue
                }


                let count = q3_piece!.size()
                for (let skip = 0; skip < count; skip++) {
                    let q_next = q3.before
                    qc_pull1(q_next, piece, skip)

                    q3.after[piece] = q_next[piece]

                    if (node.sentence.precessor !== 'A') {
                        console.log(3)
                    }
                    dfs(qq)
                    if (res.length >= 1) {
                        return true
                    }
                }
                break
            }
        }
    }

    dfs(qq)

    return res
}
    */

/*
function q_node_pull(node: QNode, pieces: Pieces[]) {

    let res: QBoard[] = []
    let limit = 0

    let q = node.board

    function dfs(q: QBoard) {
        let cc = resolve_cc(node.sentence)

        //if (limit ++ > 100) return false
        // console.log(qc_fen_singles(q))
        let q3 = { ...q }

        //if (qc_fen_singles(q) === "8/8/8/8/8/3Bk3/3pb3/q1R5 w - - 0 1") {
        let df = qc_fen_singles(q)
        if (df.includes("8/8/8/8/8/8/2p5/qBRbk3 w - - 0 1")) {
            console.log('here', df)
        }
        let q_captured_first
        while (true) {
            let { before: q4, after: q5, captured: q_captured } = cc(q3)

            let qff = qc_fen_singles(q4)
            let qffaf = qc_fen_singles(q5)
            q_captured_first = q_captured_first ?? q_captured

            qc_dedup(q4)
            qc_kings(q4)

            for (let piece of pieces) {
                if (q4[piece].isEmpty()) {
                    if (q_captured_first[piece].isEmpty()) {

                        return true
                    }
                }
                if (q5[piece].isEmpty()) {
                    if (q_captured_first[piece].isEmpty()) {
                        return true
                    }
                }
            }



            if (q_equals(q3, q4)) {

                let child_ok = node.children.every(child => {
                    let q_child = child.board

                    child.board = { ...q5 }
                    q_node_pull(child, pieces)

                    if (child.sentence.precessor === 'E') {
                        return child.res.length > 0
                    }
                    if (child.sentence.precessor === 'Z') {
                        return child.res.length === 0
                    }
                    return child.res.length > 0
                })


                if (child_ok) {

                    {
                        let all_single = true
                        for (let piece of pieces) {

                            if (!q3[piece].isEmpty() && q3[piece].singleSquare() === undefined) {
                                all_single = false
                                break
                            }
                        }

                        if (all_single) {
                            // console.log(qc_fen_singles(q3))
                            res.push(q3)
                            return true
                        }
                    }
                }
                break
            }
            q3 = q4
        }


        for (let piece of pieces) {
            if (q3[piece].singleSquare() !== undefined) {
                continue
            }


            if (node.sentence.type === 'move_attack' && node.sentence.unblocked.length > 0) {
                if (q3['Q'].singleSquare() === 0) {

                    if (q3['b'].singleSquare() === 1) {
                        if (q3['r'].singleSquare() === 2) {
                            //console.log(qc_fen_singles(q3))
                        }
                    }
                }
            }
            let count = q3[piece].size()
            for (let skip = 0; skip < count; skip++) {
                let q_next = { ...q3 }

                //console.log('pull', piece, skip)
                qc_pull1(q_next, piece, skip)

                let reached = dfs(q_next)
                if (!reached) {
                    return true
                }
                if (res.length >= 10) {
                    return true
                }

            }
            //console.log('out pull', piece)
            break
        }

    }

    dfs(q)

    node.res = res
    return res
}
    */

export type FEN = string
export function mor3(text: string, fen?: FEN, pieces?: Pieces[]) {

    let root = parse_rules(text)
    root.children.forEach(parse_line_recur)

    let res = q_node(root)

    //let qq = qnode_pull2o(res.children[0], ['b', 'Q', 'r', 'B'])

    let q_root: QExpansionNode = {
        data: {
            before: q_board(),
            after: q_board()
        },
        turn: 'white'
    }

    if (fen) {
        q_collapse_fen(q_root.data, fen)
    }

    //console.log(q_fen_singles(q_root.data.before))

    if (pieces === undefined) {
        pieces = extract_pieces(text)
    }

    qnode_expand(res.children[0], pieces, [q_root], 'black')

    //console.log(print_node(res))
    return print_node(res)
}

function q_collapse_fen(q: QExpansion, fen: string) {

    let twos: Record<Pieces, number> = {}
    let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()

    for (let sq of SquareSet.full()) {

        let piece = pos.board.get(sq)
        if (piece) {
            let p1 = piece2_pieces(piece)

            if (twos[p1] === 1) {
                twos[p1] = 2
                p1 += '2'
            } else {
                twos[p1] = 1
            }

            q.before[p1] = SquareSet.fromSquare(sq)
            q.after[p1] = SquareSet.fromSquare(sq)
        }
    }

}




function piece2_pieces(piece: Piece) {

    const role_to_pieces: Record<Role, Pieces> = {
        'knight': 'n',
        'rook': 'r',
        'bishop': 'b',
        'king': 'k',
        'queen': 'q',
        'pawn': 'p',
    }

    if (piece.color === 'white') {
        return role_to_pieces[piece.role].toLowerCase()
    } else {
        return role_to_pieces[piece.role].toUpperCase()
    }
}

const no_constraint: QConstraint = (q: QExpansion) => true

function resolve_cc(res: ParsedSentence): QConstraint {
    if (res.type === 'move_attack') {
        //return move_attack_constraint(res)
        return qcc_move_attack(res)
    }
    if (res.type === 'capture') {
        return qcc_move_capture(res)
    }
    if (res.type === 'attack') {

    }
    if (res.type === 'precessor') {
        if (res.precessor === 'A') {
            //return move_A_legals
        }
    }

    return no_constraint
}

const player_piece_names = (pieces: Pieces[]) => pieces.filter(_ => _.toLowerCase() === _)
const opponent_piece_names = (pieces: Pieces[]) => pieces.filter(_ => _.toLowerCase() !== _)

type QExpansion = {
    before: QBoard
    after: QBoard
    move?: [Pieces, Square, Square]
}

const qe_all_player = (q: QBoard, pieces: Pieces[]) => {

    let occupied = q_occupied(q)
    let expanded: QExpansion[] = []
    for (let p1 of player_piece_names(pieces)) {
        if (q[p1] === undefined) {
            continue
        }


        let q2 = { ...q }
        qc_take(q2, p1)
        for (let p1s of q[p1]) {

            let q_before = { ...q }
            qc_put(q_before, p1, p1s)

            for (let a1s of attacks(parse_piece(p1), p1s, occupied)) {
                let q3 = { ...q2 }
                qc_put(q3, p1, a1s)

                expanded.push({
                    before: q_before,
                    after: q3, 
                    move: [p1, p1s, a1s]
                })
            }
        }
    }


    return expanded
}



const qe_all_opponent = (q: QBoard, pieces: Pieces[]) => {

    let occupied = q_occupied(q)
    let expanded: QExpansion[] = []

    for (let p1 of opponent_piece_names(pieces)) {
        if (q[p1] === undefined) {
            continue
        }

        let q2 = { ...q }
        qc_take(q2, p1)
        for (let p1s of q[p1]) {

            let q_before = { ...q }
            qc_put(q_before, p1, p1s)

            for (let a1s of attacks(parse_piece(p1), p1s, occupied)) {
                let q3 = { ...q2 }
                qc_put(q3, p1, a1s)

                expanded.push({
                    before: q_before,
                    after: q3, 
                    move: [p1, p1s, a1s]
                })
            }
        }
    }


    return expanded
}

function qcc_move_capture(res: CaptureSentence): QConstraint {
    return (q: QExpansion) => {

        let move = q.move

        if (!move) {
            return false
        }

        if (q.before[res.captured]?.has(move[2])) {
            q.after[res.captured] = undefined
            return true
        }

        return false
    }
}

function qcc_move_attack(res: MoveAttackSentence): QConstraint {


    let move = parse_piece(res.move)
    let attacks1 = res.attack.map(parse_piece)
    let blocked = res.blocked.map(([a, b]) => [parse_piece(a), parse_piece(b)])
    let unblocked = res.unblocked.map(([a, b]) => [parse_piece(a), parse_piece(b)])

    let captured = res.captured ? parse_piece(res.captured) : undefined

    let attacked_by = res.attacked_by.map(parse_piece)

    let zero_defend = res.zero_defend

    let is_mate = res.is_mate

    return (qexp: QExpansion) => {
        if (!qexp.move) {
            return false
        }

        if (qexp.move[0] !== res.move) {
            return false
        }

        if (res.captured) {
            if (qexp.before[res.captured]?.has(qexp.move[2])) {
                if (res.move === qexp.move[0]) {
                    qexp.after[res.captured] = undefined
                } else {
                    return false
                }
            } else {
                return false
            }
        }



        let q_before = qexp.before
        let q = qexp.after
        let [mp1, m1, m2] = qexp.move

        /*
        if (qc_fen_singles(q_before) === "8/8/8/8/8/8/8/BqR5 w - - 0 1") {
            console.log('here')
        }
            */

        let occupied = q_occupied(q)


        if (zero_defend) {
            for (let d1 of pieces_of_color(move.color)) {
                if (q[d1] === undefined) {
                    continue
                }
                let res = SquareSet.empty()

                let pd1 = parse_piece(d1)
                for (let d1s of q[d1]) {
                    if (!attacks(pd1 ,d1s, occupied).has(m2)) {
                        res = res.set(d1s, true)
                    }
                }
                q[d1] = res
            }
        }

        let res1_before = SquareSet.empty()
        let res1_after = SquareSet.empty()
        let res2 = attacks1.map(_ => SquareSet.empty())
        let res3 = blocked.map(_ => [SquareSet.empty(), SquareSet.empty()])
        let res4 = unblocked.map(_ => [SquareSet.empty(), SquareSet.empty()])

        let res5 = SquareSet.empty()


        let res6 = attacked_by.map(_ => SquareSet.empty())

        let q_res_move = q[res.move]

        let a2s = attacks(move, m2, occupied)

        let q3 = q

        for (let i = 0; i < res.attack.length; i++) {
            let a1 = res.attack[i]
            if (q[a1] === undefined) {
                return false
            }

            let skipped = true
            for (let aa1 of a2s.intersect(q[a1])) {
                res2[i] = res2[i].set(aa1, true)
                skipped = false
            }

            if (skipped) {
                return false
            }
        }


        for (let i = 0; i < res.blocked.length; i++) {
            let [a3, a2] = res.blocked[i]

            if (q[a2] === undefined || q[a3] === undefined) {
                return false
            }

            let skipped = true
            for (let aa2 of a2s.intersect(q[a2])) {

                let a3s = attacks(move, m2, occupied.without(m1).without(aa2))
                for (let aa3 of a3s.intersect(q[a3])) {
                    if (!between(m2, aa3).has(aa2)) {
                        continue
                    }
                    res3[i][0] = res3[i][0].set(aa3, true)
                    res3[i][1] = res3[i][1].set(aa2, true)
                    skipped = false
                }
            }

            if (skipped) {
                return false
            }
        }

        for (let i = 0; i < res.unblocked.length; i++) {
            let [u3, u2] = res.unblocked[i]

            if (q[u2] === undefined || q[u3] === undefined) {
                return false
            }

            let skipped = true
            for (let u3s of q[u3]) {
                let a3s = attacks(unblocked[i][0], u3s, occupied.without(m1))

                for (let u2s of q[u2]) {
                    if (a3s.has(u2s) && between(u3s, u2s).has(m1)) {
                        res4[i][0] = res4[i][0].set(u3s, true)
                        res4[i][1] = res4[i][1].set(u2s, true)
                        skipped = false
                    }
                }
            }
            if (skipped) {
                return false
            }
        }


        for (let i = 0; i < res.attacked_by.length; i++) {
            let a1 = res.attacked_by[i]
            if (q[a1] === undefined) {
                return false
            }

            let skipped = true
            for (let a1s of q[a1]) {
                let a3s = attacks(attacked_by[i], a1s, occupied)

                if (a3s.has(m2)) {
                    res6[i] = res6[i].set(a1s, true)
                    skipped = false
                }
            }
            if (skipped) {
                return false
            }
        }



        for (let i = 0; i < res.attacked_by.length; i++) {
            q3[res.attacked_by[i]] = res6[i]

            q_before[res.attacked_by[i]] = res6[i]
        }



        for (let i = 0; i < res.attack.length; i++) {
            q3[res.attack[i]] = res2[i]

            q_before[res.attack[i]] = res2[i]
        }

        for (let i = 0; i < res.blocked.length; i++) {
            q3[res.blocked[i][0]] = res3[i][0]
            q3[res.blocked[i][1]] = res3[i][1]


            q_before[res.blocked[i][0]] = res3[i][0]
            q_before[res.blocked[i][1]] = res3[i][1]
        }


        for (let i = 0; i < res.unblocked.length; i++) {
            q3[res.unblocked[i][0]] = res4[i][0]
            q3[res.unblocked[i][1]] = res4[i][1]


            q_before[res.unblocked[i][0]] = res4[i][0]
            q_before[res.unblocked[i][1]] = res4[i][1]
        }


        /*
        if (qc_fen_singles(q3, 'black').includes("6rk/7Q")) {
            console.log('ok')
            is_mate = true
        }
            */

        if (is_mate) {
            if (q3['K'] === undefined) {
                return false
            }

            let res_k = SquareSet.empty()
            for (let k1s of q3['K']) {
                if (attacks(move, qexp.move[2], occupied).has(k1s)) {
                    res_k = res_k.set(k1s, true)
                }
            }
            q3['K'] = res_k
            q_before['K'] = res_k
        }


        return true
    }
}


/*
function move_attack_constraint(res: MoveAttackSentence): QConstraint {

    let move = parse_piece(res.move)
    let attacks1 = res.attack.map(parse_piece)
    let blocked = res.blocked.map(([a, b]) => [parse_piece(a), parse_piece(b)])
    let unblocked = res.unblocked.map(([a, b]) => [parse_piece(a), parse_piece(b)])

    let captured = res.captured ? parse_piece(res.captured) : undefined

    return (q: QBoard) => {

        let q_captured = q_board_zero()
        let q2 = { ... q }
        let q3 = { ... q }

        let occupied = q_occupied(q)

        let res1_before = SquareSet.empty()
        let res1_after = SquareSet.empty()
        let res2 = attacks1.map(_ => SquareSet.empty())
        let res3 = blocked.map(_ => [SquareSet.empty(), SquareSet.empty()])
        let res4 = unblocked.map(_ => [SquareSet.empty(), SquareSet.empty()])

        let res5 = SquareSet.empty()

        for (let m1 of q[res.move]) {
            let m1_valid = false
            let res1_after_m1 = SquareSet.empty()
            move: for (let m2 of attacks(move, m1, occupied)) {


                let a2s = attacks(move, m2, occupied.without(m1))


                if (res.captured) {
                    res5 = res5.union(a2s.intersect(q[res.captured]))
                    if (res5.isEmpty()) {
                        continue move
                    }
                }

                for (let i =0; i < res.attack.length; i++) {
                    let a1 = res.attack[i]

                    //let ayay = squareSet(a2s.intersect(q[a1]))
                    let skipped = true
                    for (let aa1 of a2s.intersect(q[a1])) {
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

                    let skipped = true
                    for (let u3s of q[u3]) {
                        let a3s = attacks(unblocked[i][0], u3s, occupied.without(m1))

                        for (let u2s of q[u2]) {
                            if (a3s.has(u2s) && between(u3s, u2s).has(m1)) {
                                res4[i][0] = res4[i][0].set(u3s, true)
                                res4[i][1] = res4[i][1].set(u2s, true)
                                skipped = false
                            }
                        }
                    }
                    if (skipped) {
                        continue move
                    }
                }

                res1_after_m1 = res1_after_m1.set(m2, true)
            }

            if (!res1_after_m1.isEmpty()) {
                res1_before = res1_before.set(m1, true)
                res1_after = res1_after.union(res1_after_m1)
            }
        }

        if (res.captured) {
            //q2[res.captured] = res5
            //q3[res.captured] = res5

            q2[res.captured] = SquareSet.empty()
            q3[res.captured] = SquareSet.empty()

            q_captured[res.captured] = res5
        }

        q2[res.move] = res1_before
        q3[res.move] = res1_after

        for (let i = 0; i < res.attack.length; i++) {
            q2[res.attack[i]] = res2[i]
            q3[res.attack[i]] = res2[i]
        }

        for (let i = 0; i < res.blocked.length; i++) {
            q2[res.blocked[i][0]] = res3[i][0]
            q2[res.blocked[i][1]] = res3[i][1]


            q3[res.blocked[i][0]] = res3[i][0]
            q3[res.blocked[i][1]] = res3[i][1]
        }


        for (let i = 0; i < res.unblocked.length; i++) {
            q2[res.unblocked[i][0]] = res4[i][0]
            q2[res.unblocked[i][1]] = res4[i][1]

            q3[res.unblocked[i][0]] = res4[i][0]
            q3[res.unblocked[i][1]] = res4[i][1]
        }

        return {
            before: q2,
            after: q3,
            captured: q_captured
        }
    }
}
    */



/*
function move_A_legals(q: QBoard) {

    let occupied = q_occupied(q)
    for (let p of Pieces) {
        for (let p1 of q[p]) {
            for (let a1 of attacks(parse_piece(p), p1, occupied)) {
                q[p].set(a1, true)
            }
        }
    }
}
    */


type QConstraint = (q: QExpansion) => boolean


const Pieces = PIECE_NAMES

type QBoard = Record<Pieces, SquareSet | undefined>

function q_board_zero(): QBoard {
    let res: QBoard = {}

    for (let piece of Pieces) {
        res[piece] = SquareSet.empty()
    }

    return res
}

function q_board(): QBoard {
    let res: QBoard = {}

    for (let piece of Pieces) {
        res[piece] = SquareSet.full()
    }

    return res
}

function q_equals(a: QBoard, b: QBoard) {
    for (let p of Pieces) {
        if (a[p] === undefined) {
            if (b[p] !== undefined) {
                return false
            }
        } else if (b[p] === undefined) {
            return false
        } else if (!a[p].equals(b[p])) {
            return false
        }
    }
    return true
}

function q_clone(a: QBoard) {
    return { ...a }
}

function qc_put(q: QBoard, pieces: Pieces, square: Square) {
    q[pieces] = SquareSet.fromSquare(square)
}


function qc_take(q: QBoard, pieces: Pieces) {
    q[pieces] = SquareSet.empty()
}

function qc_safety(q: QBoard, turn: Color) {

    let occupied = q_occupied(q)
    let k = piece2_pieces({ color: opposite(turn), role: 'king' })

    let ks = q[k]?.singleSquare()
    if (ks !== undefined) {

        for (let p1 of pieces_of_color(turn)) {
            let p = parse_piece(p1)
            if (q[p1] === undefined) {
                continue
            }
            let res = q[p1]
            for (let p1s of q[p1]) {

                if (attacks(p, p1s, occupied).has(ks)) {
                    res = res.without(p1s)
                }
            }
            q[p1] = res
        }
    }
}

function qc_kings(q: QBoard) {

    let K = q['K']!.singleSquare()
    if (K) {
        q['k'] = q['k']!.intersect(attacks(parse_piece('K'), K, SquareSet.empty()).complement())
    }

    let k = q['k']!.singleSquare()
    if (k) {
        q['K'] = q['K']!.intersect(attacks(parse_piece('k'), k, SquareSet.empty()).complement())
    }
}

function qc_dedup(q: QExpansion) {

    for (let p of Pieces) {

        // capture
        if (q.move) {
            if (q.move[0] !== p) {
                if (q.after[p]?.has(q.move[2])) {
                    q.after[p] = undefined
                    continue
                }
            }
        }

        if (q.before[p]?.size() === 1) {
            for (let p2 of Pieces) {
                if (p !== p2) {
                    if (q.before[p2]) {
                        q.before[p2] = q.before[p2].without(q.before[p].singleSquare()!)
                    }
                }
            }
        }

        if (q.after[p]?.size() === 1) {
            for (let p2 of Pieces) {
                if (p !== p2) {
                    if (q.after[p2]) {
                        q.after[p2] = q.after[p2].without(q.after[p].singleSquare()!)
                    }
                }
            }
        }
    }
}

function qc_move_cause(q: QExpansion) {
    if (!q.move) {
        return
    }

    if (!q.before[q.move[0]]?.has(q.move[1]) ||
    !q.after[q.move[0]]?.has(q.move[2])) {
        q.before[q.move[0]] = SquareSet.empty()
        q.after[q.move[0]] = SquareSet.empty()
    }


    let occupied = q_occupied(q.before)

    if (!attacks(parse_piece(q.move[0]), q.move[1], occupied).has(q.move[2])) {
        q.before[q.move[0]] = SquareSet.empty()
        q.after[q.move[0]] = SquareSet.empty()
    }

}

function q_occupied(a: QBoard) {
    let res = SquareSet.empty()

    for (let p of Pieces) {
        if (a[p]?.singleSquare() !== undefined) {
            res = res.union(a[p])
        }
    }
    return res
}

/***
function qc_pull2o(q: QBoard, pieces: Pieces[], cc: (q: QBoard) => void) {

    let res: QBoard[] = []
    let limit = 0

    function dfs(q: QBoard) {

        if (limit ++ > 100) return
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

                //console.log('pull', piece, skip)
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
***/

function qc_pull1(q: QBoard, pieces: Pieces, skip: number = 0) {
    if (q[pieces] === undefined) {
        return false
    }
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

function q_fen_singles(q: QBoard, turn: Color = 'white') {
    let res = Chess.fromSetupUnchecked(parseFen(EMPTY_FEN).unwrap())
    res.turn = turn

    for (let p of Pieces) {
        let sq = q[p]?.singleSquare()
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


export function print_m(e: QExpansionNode, turn: Color) {

    if (!e.data.move) {
        return ''
    }

    let fen = q_fen_singles(e.data.before, turn)
    let pos = Chess.fromSetupUnchecked(parseFen(fen).unwrap())

    let move = {
        from: e.data.move[1],
        to: e.data.move[2]
    }

    let san = makeSan(pos, move)

    if (!e.parent) {
        return `${fen} ${san}`
    }


    let sans = []
    let i: QExpansionNode = e
    while (i.parent !== undefined) {

        if (!i.data.move) {
            continue
        }

        fen = q_fen_singles(i.data.before, i.turn)

        let pos = Chess.fromSetupUnchecked(parseFen(fen).unwrap())

        let move = {
            from: i.data.move[1],
            to: i.data.move[2],
        }

        let san = makeSan(pos, move)

        sans.push(san)
        i = i.parent
    }

    sans.reverse()
    return `${fen} ${sans.join(' ')}`
}

export function print_node(n: QNode): string {
    let l = n.line

    let res = ''
    let ind = " ".repeat(l.depth + 1)

    let long = l.long ? 150 : 1

    //let m = l.no_c ? l.p_m : l.m
    //let m = l.no_c ? l.m : l.m

    let m = l.no_c ? n.res : n.res

    let turn: Color = l.depth % 2 === 1 ? 'black': 'white'
    let ms = m.slice(0, long).map(_ => print_m(_, turn)).join(', ')

    if (m.length > 1) {
        ms += ' ..' + m.length
    }

    let pass = n.children_resolved

    res += " " + l.rule + (pass ? " OK" : " ?") + " <" + (ms ?? "?") + ">" + "\n"

    let children = n.children.map((c, i) => {
        if (i === n.children.length - 1) {
            res += ind + "└─"
        } else if (i === 0) {
            res += ind + "├─"
        } else {
            res += ind + "│ "
        }
        res += print_node(c)
    }).join('')

    return res
}


function pieces_of_color(turn: Color) {
    if (turn === 'white') {
        return PLAYER_PIECE_NAMES
    } else {
        return OPPONENT_PIECE_NAMES
    }
}

export function extract_pieces(text: string) {
  let res = []
  for (let a = 0; a < text.length; a++) {
    if (PIECE_NAMES.includes(text[a + 0] + text[a + 1])) {

      res.push(text[a + 0] + text[a + 1])
      a += 2
    }
    if (PIECE_NAMES.includes(text[a + 0])) {
      res.push(text[a + 0])
    }
  }
  return res
} 


const attacks = (piece: Piece, square: Square, occupied: SquareSet): SquareSet => {
    return m.attacks(piece_to_c(piece), square, occupied)
}
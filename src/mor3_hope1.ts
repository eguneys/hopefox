import { Chess } from "./chess"
import { EMPTY_FEN, makeFen, parseFen } from "./fen"
import { color_c_opposite } from "./hopefox_c"
import { SquareSet } from "./squareSet"
import { Color, Piece, Role, Square } from "./types"
import { attacks, between, pawnAttacks } from "./attacks"
import { squareSet } from "./debug"
import { blocks } from "./hopefox_helper"

enum TokenType {
    PIECE_NAME = 'PIECE_NAME',
    OPERATOR_MOVE = 'OPERATOR_MOVE',
    OPERATOR_ATTACK = 'OPERATOR_ATTACK',
    OPERATOR_BLOCK = 'OPERATOR_BLOCK',
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

export type Pieces = typeof PIECE_NAMES[number]

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
            ['/', TokenType.OPERATOR_BLOCK],
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

            const word_str = this.word()
            if (PIECE_NAMES.includes(word_str)) {
                return { type: TokenType.PIECE_NAME, value: word_str }
            }
            if (this.operators.has(this.current_char)) {
                let value = this.current_char
                let type = this.operators.get(this.current_char)!
                this.advance()
                return { type,  value }
            }
        }
        return { type: TokenType.EOF, value: '' }
    }
}

class ParserError extends Error {}


export class Parser {
    private lexer: Lexer
    private current_token: Token
    private lookahead_token: Token

    constructor(lexer: Lexer) {
        this.lexer = lexer
        this.current_token = this.lexer.get_next_token()
        this.lookahead_token = this.lexer.get_next_token()
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
        this.lookahead_token = this.lexer.get_next_token()
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

    parse_sentence(): ParsedSentence {
        
        const result = this.parse_move_attack()
        this.eat(TokenType.EOF)
        return result

        throw this.error()
    }


    // E b= +Q +R/Q
    parse_move_attack(): MoveAttackSentence {

        let move = this.piece()
        this.eat(TokenType.OPERATOR_MOVE)

        let attack = []
        let attack_blocked: [Pieces, Pieces][] = []

        let current_token_type = this.current_token.type
        while (current_token_type === TokenType.OPERATOR_ATTACK) {

            this.eat(TokenType.OPERATOR_ATTACK)
            let attack1 = this.piece()
            current_token_type = this.current_token.type
            if (current_token_type === TokenType.OPERATOR_BLOCK) {
                this.eat(TokenType.OPERATOR_BLOCK)
                let blocked1 = this.piece()

                attack_blocked.push([attack1, blocked1])
                continue
            }
            attack.push(attack1)
        }

        return {
            type: 'move_attack',
            move,
            attack,
            attack_blocked
        }
    }
}

type ParsedSentence = MoveAttackSentence

type MoveAttackSentence = {
    type: 'move_attack'
    move: Pieces
    attack: Pieces[]
    attack_blocked: [Pieces, Pieces][]
}
function move_attack_constraint(res: MoveAttackSentence) {

    let move = parse_piece(res.move)
    let attacks1 = res.attack.map(parse_piece)
    let attacks_blocked = res.attack_blocked.map(([a, b]) => [parse_piece(a), parse_piece(b)])

    return (q: QBoard) => {
        let res1 = SquareSet.empty()
        let res2 = attacks1.map(_ => SquareSet.empty())
        let res3 = attacks_blocked.map(_ => [SquareSet.empty(), SquareSet.empty()])

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



                for (let i =0; i < res.attack_blocked.length; i++) {
                    let [a3, a2] = res.attack_blocked[i]

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



            }
        }


        q[res.move] = res1

        for (let i = 0; i < res.attack.length; i++) {
            q[res.attack[i]] = res2[i]
        }

        for (let i = 0; i < res.attack_blocked.length; i++) {
            q[res.attack_blocked[i][0]] = res3[i][0]
            q[res.attack_blocked[i][1]] = res3[i][1]
        }
    }
}

export function mor3(text: string) {

    let p = new Parser(new Lexer(text))
    let res = p.parse_sentence()

    let cc: QConstraint[] = [move_attack_constraint(res)]

    const f = (q: QBoard) => {
        cc.forEach(_ => _(q))
        qc_dedup(q)
    }

    let q = q_board()

    let qq = qc_pull2o(q, ['b', 'Q', 'R'], f)

    return qq?.map(qc_fen_singles)
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
                //console.log('pull', piece, skip)
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
    const color_pieces = (p: Pieces): Color => p.toLowerCase() === p ? 'black': 'white'

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
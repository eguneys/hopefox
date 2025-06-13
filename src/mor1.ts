import { attacks } from "./attacks"
import { Chess } from "./chess"
import { EMPTY_FEN, makeFen, parseFen } from "./fen"
import { PositionManager } from "./hopefox_c"
import { blocks } from "./hopefox_helper"
import { setupClone } from "./setup"
import { SquareSet } from "./squareSet"
import { Piece } from "./types"

enum TokenType {
    PIECE_NAME = 'PIECE_NAME',
    KEYWORD_BLOCKS = 'KEYWORD_BLOCKS',
    KEYWORD_ALIGNMENT = 'KEYWORD_ALIGNMENT',
    EOF = 'EOF',
}

interface Token {
    type: TokenType
    value: string
}

class Lexer {
    private text: string
    private pos: number
    private current_char?: string

    private keywords: Map<string, TokenType>
    private piece_names: Map<string, TokenType>

    constructor(text: string) {
        this.text = text
        this.pos = 0
        this.current_char = this.text[this.pos]

        this.keywords = new Map([
            ['blocks', TokenType.KEYWORD_BLOCKS],
            ['alignment', TokenType.KEYWORD_ALIGNMENT],
        ])


        this.piece_names = new Map([
            ['knight', TokenType.PIECE_NAME],
            ['queen', TokenType.PIECE_NAME],
            ['bishop', TokenType.PIECE_NAME],
            ['rook', TokenType.PIECE_NAME],
            ['pawn', TokenType.PIECE_NAME],
            ['king', TokenType.PIECE_NAME],
            ['Knight', TokenType.PIECE_NAME],
            ['Queen', TokenType.PIECE_NAME],
            ['Bishop', TokenType.PIECE_NAME],
            ['Rook', TokenType.PIECE_NAME],
            ['Pawn', TokenType.PIECE_NAME],
            ['King', TokenType.PIECE_NAME],
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
        return /[a-zA-Z0-9]/.test(char)
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
            if (/\s/.test(this.current_char)) {
                this.skip_whitespace()
                continue
            }
            const word_str = this.word()
            if (this.keywords.has(word_str)) {
                return { type: this.keywords.get(word_str)!, value: word_str }
            } else if (this.piece_names.has(word_str)) {
                return { type: TokenType.PIECE_NAME, value: word_str }
            }
        }
        return { type: TokenType.EOF, value: '' }
    }
}


interface ParsedSentence {
    action: 'blocks_alignment'
    blocker: string
    aligned1: string
    aligned2: string
}

class ParserError extends Error {
}

class Parser {
    private lexer: Lexer
    private current_token: Token

    constructor(lexer: Lexer) {
        this.lexer = lexer
        this.current_token = this.lexer.get_next_token()
    }

    private error(expected_type?: TokenType) {

        if (expected_type) {
            throw new ParserError(`Expected ${expected_type} but got ${this.current_token.type} ('${this.current_token.value}')`)
        } else {
            throw new ParserError(`Unexpected token ${this.current_token.type} ('${this.current_token.value}')`)
        }
    }

    private eat(token_type: TokenType) {
        if (this.current_token.type === token_type) {
            this.current_token = this.lexer.get_next_token()
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
        const blocker = this.piece()
        this.eat(TokenType.KEYWORD_BLOCKS)
        const aligned1 = this.piece()
        const aligned2 = this.piece()
        this.eat(TokenType.KEYWORD_ALIGNMENT)
        this.eat(TokenType.EOF)

        return {

            action: 'blocks_alignment',
            blocker,
            aligned1,
            aligned2
        }
    }
}

function parse_piece(str: string): Piece {
    const m: Record<string, Piece> = {
        'queen': { role: 'queen', color: 'black' },
        'bishop': { role: 'bishop', color: 'black' },
        'rook': { role: 'rook', color: 'black' },
        'king': { role: 'king', color: 'black' },
        'knight': { role: 'knight', color: 'black' },
        'pawn': { role: 'pawn', color: 'black' },
        'Queen': { role: 'queen', color: 'white' },
        'Bishop': { role: 'bishop', color: 'white' },
        'Rook': { role: 'rook', color: 'white' },
        'King': { role: 'king', color: 'white' },
        'Knight': { role: 'knight', color: 'white' },
        'Pawn': { role: 'pawn', color: 'white' },
    }
    console.log(str, m[str])
    return m[str]
}

export function mor1(text: string) {

    let conds = text.trim().split('\n').filter(_ => !_.startsWith(':'))

    let x = conds.slice(0, 1).map(line => {
        let a = new Parser(new Lexer(line)).parse_sentence()
        return a
    })[0]

    let aligned1 = parse_piece(x.aligned1)
    let aligned2 = parse_piece(x.aligned2)
    let blocker = parse_piece(x.blocker)

    let pos = Chess.fromSetupUnchecked(parseFen(EMPTY_FEN).unwrap())

    let res = []
    for (let aligned1_square of SquareSet.full()) {
        for (let aligned2_square of attacks(aligned1, aligned1_square, pos.board.occupied)) {

            for (let blocker_square of SquareSet.full()) {

                let p2 = pos.clone()
                p2.board.set(aligned1_square, aligned1)
                p2.board.set(aligned2_square, aligned2)

                p2.board.set(blocker_square, blocker)

                let bb = blocks(aligned1, aligned1_square, p2.board.occupied)

                if (bb.length >= 2) {

                    if (bb[0].has(blocker_square) && bb[1].has(aligned2_square)) {
                        res.push(p2)
                    }
                }
            }
        }
    }

    return res.map(_ => makeFen(_.toSetup()))
}
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

        this.eat(TokenType.OPERATOR_ATTACK)
        let attack = this.piece()

        this.eat(TokenType.OPERATOR_ATTACK)
        let attack_blocked1 = this.piece()
        this.eat(TokenType.OPERATOR_BLOCK)
        let attack_blocked2 = this.piece()

        return {
            type: 'move_attack',
            move,
            attack: [attack],
            attack_blocked: [[attack_blocked1, attack_blocked2]]
        }
    }
}

type ParsedSentence = MoveAttackSentence

type MoveAttackSentence = {
    type: 'move_attack'
    move: string
    attack: string[]
    attack_blocked: [string, string][]
}

export function mor3(text: string) {

    let p = new Parser(new Lexer(text))
    let res = p.parse_sentence()

    return res
}
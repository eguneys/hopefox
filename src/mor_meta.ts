
class Parser {

    private lexer: Lexer
    private current_token: Token
    private lookahead_token: Token
    private lookahead2_token: Token
    private lookahead3_token: Token

    constructor(lexer: Lexer) {
        this.lexer = lexer
        this.current_token = this.lexer.get_next_token()
        this.lookahead_token = this.lexer.get_next_token()
        this.lookahead2_token = this.lexer.get_next_token()
        this.lookahead3_token = this.lexer.get_next_token()
    }

    private error(expected_type?: TokenType) {
        if (expected_type) {
            return new ParserError(`Expected ${expected_type} but got ${this.current_token.type} ('${this.current_token.value}')`)
        } else {
            return new ParserError(`Unexpected token ${this.current_token.type} ('${this.current_token.value}')`)
        }
    }


    private advance_tokens() {
        this.current_token = this.lookahead_token
        this.lookahead_token = this.lookahead2_token
        this.lookahead2_token = this.lookahead3_token
        this.lookahead3_token = this.lexer.get_next_token()
    }

    private eat(token_type: TokenType) {
        if (this.current_token.type === token_type) {
            this.advance_tokens()
        } else {
            this.error(token_type)
        }
    }


    private pair() {
        const token = this.current_token
        this.eat(TokenType.PAIR_NAME)
        return token.value
    }



    private piece() {
        const token = this.current_token
        this.eat(TokenType.PIECE_NAME)
        return token.value
    }

    private app_piece() {
        const token = this.current_token
        this.eat(TokenType.APP_PIECE_NAME)
        return token.value
    }

    private square() {
        const token = this.current_token
        this.eat(TokenType.SQUARE_NAME)
        return token.value
    }


    private subject() {
        const token = this.current_token
        this.eat(TokenType.SUBJECT_NAME)
        return token.value
    }

    private object() {
        const token = this.current_token
        this.eat(TokenType.OBJECT_NAME)
        return token.value
    }




    parse_sentence(): ParsedSentence {
        if (this.current_token.type === TokenType.BEGIN_DEF) {
            const result = this.parse_begin_def()
            this.eat(TokenType.EOF)
            return result
        }

        if (this.lookahead_token.type === TokenType.KEYWORD_MOVES) {
            const result = this.parse_moves()
            this.eat(TokenType.EOF)
            return result
        }

        if (this.lookahead_token.type === TokenType.KEYWORD_CAPTURES) {
            const result = this.parse_captures()
            this.eat(TokenType.EOF)
            return result
        }

        if (this.lookahead_token.type === TokenType.KEYWORD_IS_EYING) {
            const result = this.parse_is_eying()
            this.eat(TokenType.EOF)
            return result
        }



        throw this.error()
    }

    parse_begin_def(): BeginDefSentence {
        this.eat(TokenType.BEGIN_DEF)


        let res: Token[] = []
        while (this.current_token.type !== TokenType.BEGIN_DEF) {
            if (this.current_token.type === TokenType.SUBJECT_NAME) {
                res.push(this.current_token)
                this.eat(TokenType.SUBJECT_NAME)
            } else if (this.current_token.type === TokenType.KEYWORD_ACTION) {
                res.push(this.current_token)
                this.eat(TokenType.KEYWORD_ACTION)
            } else if (this.current_token.type === TokenType.KEYWORD) {
                res.push(this.current_token)
                this.eat(TokenType.KEYWORD)
            } else if (this.current_token.type === TokenType.OBJECT_NAME) {
                res.push(this.current_token)
                this.eat(TokenType.OBJECT_NAME)
            } else {
                throw this.error(TokenType.BEGIN_DEF)
            }
        }

        return { type: 'begin_def_sentence', res }
    }

    parse_moves(): MovesSentence {
        let subject = this.subject()
        this.eat(TokenType.KEYWORD_MOVES)

        return { type: 'moves', subject }
    }


    parse_captures(): CapturesSentence {
        let subject = this.subject()
        this.eat(TokenType.KEYWORD_CAPTURES)

        return { type: 'captures', subject }
    }

    parse_is_eying(): IsEyingSentence {
        let subject = this.subject()
        this.eat(TokenType.KEYWORD_IS_EYING)

        let object = this.object()

        let before = true

        if (this.current_token.type === TokenType.KEYWORD_AFTER) {
            this.eat(TokenType.KEYWORD_AFTER)
            before = false
        }


        return { type: 'is_eying', subject, object, before }
    }


}

class ParserError extends Error {}

type ParsedSentence = BeginDefSentence
| MovesSentence
| CapturesSentence
| IsEyingSentence

type BeginDefSentence = {
    type: 'begin_def_sentence',
    res: Token[]
}

type MovesSentence = {
    type: 'moves',
    subject: string
}

type CapturesSentence = {
    type: 'captures',
    subject: string
}

type IsEyingSentence = {
    type: 'is_eying',
    subject: string
    object: string
    before: boolean
}

enum TokenType {
    PAIR_NAME = 'PAIR_NAME',
    PIECE_NAME = 'PIECE_NAME',
    APP_PIECE_NAME = 'APP_PIECE_NAME',
    SQUARE_NAME = 'SQUARE_NAME',


    MOBILITY_NAME = 'MOBILITY_NAME',

    BEGIN_DEF = 'BEGIN_DEF',

    SUBJECT_NAME = 'SUBJECT_NAME',
    OBJECT_NAME = 'OBJECT_NAME',

    KEYWORD = 'KEYWORD',

    KEYWORD_CAPTURES = 'KEYWORD_CAPTURES',
    KEYWORD_MOVES = 'KEYWORD_MOVES',
    KEYWORD_IS_EYING = 'KEYWORD_IS_EYING',
    KEYWORD_AFTER = 'KEYWORD_AFTER',
    KEYWORD_BEFORE = 'KEYWORD_BEFORE',
    KEYWORD_BLOCKED_BY = 'KEYWORD_BLOCKED_BY',
    KEYWORD_ACTION = 'KEYWORD_ACTION',
    KEYWORD_NEW_BRANCH = 'KEYWORD_NEW_BRANCH',
    KEYWORD_UP_BRANCH = 'KEYWORD_UP_BRANCH',

    EOF = 'EOF',
}

interface Token {
    type: TokenType
    value: string
}

export class Lexer {
    private text: string
    private pos: number
    private current_char?: string

    private keywords: Map<string, TokenType>
    private piece_names: Map<string, TokenType>
    private pair_names: Map<string, TokenType>
    private app_piece_names: Map<string, TokenType>
    private square_names: Map<string, TokenType>
    private mobility_names: Map<string, TokenType>
    private subject_names: Map<string, TokenType>
    private object_names: Map<string, TokenType>

    constructor(text: string) {
        this.text = text
        this.pos = 0
        this.current_char = this.text[this.pos]

        this.keywords = new Map([
            ['captures', TokenType.KEYWORD_CAPTURES],
            ['moves', TokenType.KEYWORD_MOVES],
            ['is_eying', TokenType.KEYWORD_IS_EYING],
            ['before', TokenType.KEYWORD_BEFORE],
            ['after', TokenType.KEYWORD_AFTER],
            ['blocked_by', TokenType.KEYWORD_BLOCKED_BY],
            ['action', TokenType.KEYWORD_ACTION],
            ['-new_branch', TokenType.KEYWORD_NEW_BRANCH],
            ['-up_branch', TokenType.KEYWORD_UP_BRANCH],
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

            ['knight2', TokenType.PIECE_NAME],
            ['bishop2', TokenType.PIECE_NAME],
            ['rook2', TokenType.PIECE_NAME],
            ['pawn2', TokenType.PIECE_NAME],
            ['Knight2', TokenType.PIECE_NAME],
            ['Bishop2', TokenType.PIECE_NAME],
            ['Rook2', TokenType.PIECE_NAME],
            ['Pawn2', TokenType.PIECE_NAME],
            ['King', TokenType.PIECE_NAME],
        ])

        this.pair_names = new Map([
            ['rooks', TokenType.PAIR_NAME],
            ['bishops', TokenType.PAIR_NAME],
            ['knights', TokenType.PAIR_NAME],
            ['Rooks', TokenType.PAIR_NAME],
            ['Bishops', TokenType.PAIR_NAME],
            ['Knights', TokenType.PAIR_NAME]
        ])

        this.app_piece_names = new Map([
            ['APP', TokenType.APP_PIECE_NAME],
            ['app', TokenType.APP_PIECE_NAME]
        ])

        this.square_names = new Map([
            ['Queening_Square', TokenType.SQUARE_NAME],
            ['queening_square', TokenType.SQUARE_NAME]
        ])

        this.mobility_names = new Map([
            ['push', TokenType.MOBILITY_NAME],
            ['escape', TokenType.MOBILITY_NAME]
        ])


        this.subject_names = new Map([
            ['Subject', TokenType.SUBJECT_NAME],
            ['subject', TokenType.SUBJECT_NAME]
        ])
        this.object_names = new Map([
            ['Object', TokenType.OBJECT_NAME],
            ['object', TokenType.OBJECT_NAME],
            ['object1', TokenType.OBJECT_NAME],
            ['object2', TokenType.OBJECT_NAME]
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

    private is_comma(char: string): boolean {
        return char === ','
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
            if (this.current_char === ':') {
                this.advance()
                return { type: TokenType.BEGIN_DEF, value: ':' }
            }
            const word_str = this.word()
            if (this.keywords.has(word_str)) {
                return { type: this.keywords.get(word_str)!, value: word_str }
            } else if (this.piece_names.has(word_str)) {
                return { type: TokenType.PIECE_NAME, value: word_str }
            } else if (this.pair_names.has(word_str)) {
                return { type: TokenType.PAIR_NAME, value: word_str }
            } else if (this.app_piece_names.has(word_str)) {
                return { type: TokenType.APP_PIECE_NAME, value: word_str }
            } else if (this.mobility_names.has(word_str)) {
                return { type: TokenType.MOBILITY_NAME, value: word_str }
            } else if (this.square_names.has(word_str)) {
                return { type: TokenType.SQUARE_NAME, value: word_str }
            } else if (this.subject_names.has(word_str)) {
                return { type: TokenType.SUBJECT_NAME, value: word_str }
            } else if (this.object_names.has(word_str)) {
                return { type: TokenType.OBJECT_NAME, value: word_str }
            } else {
                return { type: TokenType.KEYWORD, value: word_str }
            }
        }
        return { type: TokenType.EOF, value: '' }
    }
}

export function mor_meta1(text: string) {

    let defs = text.trim().split('\n\n')
    for (let def of defs)
    for (let line of def.trim().split('\n')) {

        let p = new Parser(new Lexer(line))
        let ss = p.parse_sentence()
        console.log(ss)
    }
}



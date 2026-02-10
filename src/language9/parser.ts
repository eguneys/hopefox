/*
Rule      := Atom (":-" AtomList)? "."
AtomList  := Atom ("," Atom)*
Atom      := IDENT "(" TermList ")"
TermList  := Term ("," Term)*
Term      := Variable | Constant
Variable  := [A-Z][A-Za-z0-9_]*
Constant  := number | "string"
Relation  := IDENT | "$"IDENT
*/

import { Atom, Rule, Term } from "./language9"

export enum TokenType {
    Ident = 'Ident',
    Lparen = 'Lparen',
    Variable = 'Variable',
    Comma = 'Comma',
    Rparen = 'RParen',
    Colon_dash = 'Colon_dash',
    Unanonymous = 'Unanonymous',
    Eof = 'Eof',
    Relation = 'Relation',
    Word = 'Word',
    Not = 'Not',
    Dot = 'Dot'
}


class ParserError extends Error {}
class LexerError extends Error {}

type Token = {
    type: TokenType
    value: string
}

class Lexer {
    
    private text: string
    private pos: number
    private current_char?: string

    constructor(text: string) {
        this.text = text
        this.pos = 0
        this.current_char = this.text[this.pos]
    }

    private advance() {
        this.current_char = this.text[++this.pos]
    }

    skip_whitespace() {
        while (this.current_char !== undefined && /\s/.test(this.current_char)) {
            this.advance()
        }
    }

    private is_lowercase_num(char: string): boolean {
        return /[a-z0-9_]/.test(char)
    }
    private is_uppercase_num(char: string): boolean {
        return /[A-Z0-9]/.test(char)
    }

    private word() {
        let result = ''
        while (this.current_char !== undefined && this.is_lowercase_num(this.current_char)) {
            result += this.current_char
            this.advance()
        }
        return result
    }


    private WORD() {
        let result = ''
        while (this.current_char !== undefined && this.is_uppercase_num(this.current_char)) {
            result += this.current_char
            this.advance()
        }
        return result
    }

    public get_next_token(): Token {

        while (this.current_char !== undefined) {

            this.skip_whitespace()

            if (this.current_char === '.') {
                this.advance()
                return { type: TokenType.Dot, value: '.'}
            }

            if (this.current_char === '_') {
                this.advance()
                return { type: TokenType.Unanonymous, value: `_${this.pos}` }
            }

            if (this.current_char === '(') {
                this.advance()
                return { type: TokenType.Lparen, value: '(' }
            }
            if (this.current_char === ')') {
                this.advance()
                return { type: TokenType.Rparen, value: ')' }
            }
            if (this.current_char === ',') {
                this.advance()
                return { type: TokenType.Comma, value: ',' }
            }

            let current_char = this.current_char
            if (current_char === ':') {
                this.advance()
                if (this.current_char === '-') {
                    this.advance()
                    return { type: TokenType.Colon_dash, value: ':-' }
                } else {
                    throw `Unexpected character ${this.current_char}`
                }
            }

            if (this.current_char === '$') {
                this.advance()
                const word = this.word()

                return { type: TokenType.Relation, value: `$${word}`}
            }

            let WORD = this.WORD()

            if (WORD === 'NOT') {
                return { type: TokenType.Not, value: 'not' }
            }

            if (WORD !== '') {
                return { type: TokenType.Variable, value: WORD }
            }


            const word = this.word()


            if (word !== '') {
                return { type: TokenType.Ident, value: word }
            }

            if (this.current_char === undefined) {
                break
            }

            throw new LexerError(`Unexpected token: ${this.current_char}`)
        }

        return { type: TokenType.Eof, value: '' }
    }
}


class Parser {
    private lexer: Lexer

    private current_token: Token
    private lookahead_token: Token

    constructor(lexer: Lexer) {
        this.lexer = lexer
        this.current_token = this.lexer.get_next_token()
        this.lookahead_token = this.lexer.get_next_token()
    }


    private advance_tokens() {
        this.current_token = this.lookahead_token
        this.lookahead_token = this.lexer.get_next_token()
    }


    private eat(token_type: TokenType) {
        if (this.current_token.type === token_type) {
            let res = this.current_token.value
            this.advance_tokens()
            return res
        } else {
            throw this.error(token_type)
        }
    }


    private error(expected_type?: TokenType) {
        if (expected_type) {
            return new ParserError(`Expected ${expected_type} but got ${this.current_token.type} ('${this.current_token.value}')`)
        } else {
            return new ParserError(`Unexpected token ${this.current_token.type} ('${this.current_token.value}')`)
        }
    }

    private parse_term(): Term {
        if (this.current_token.type === TokenType.Variable) {
            let name = this.eat(TokenType.Variable)
            return {
                type: 'variable',
                name
            }
        }
        if (this.current_token.type === TokenType.Unanonymous) {
            let name = this.eat(TokenType.Unanonymous)
            return {
                type: 'variable',
                name: this.current_token.value
            }
        }
        let value = this.eat(TokenType.Word)
        return {
            type: 'constant',
            value
        }
    }
 
    private parse_atom(): Atom {

        let isNegated
        if (this.current_token.type === TokenType.Not) {
            isNegated = true
            this.eat(TokenType.Not)
        }

        let relation
        if (this.current_token.type === TokenType.Relation) {
            relation = this.eat(TokenType.Relation)
        } else {
            relation = this.eat(TokenType.Ident)
        }

        this.eat(TokenType.Lparen)
        let terms = []
        while (true) {
            terms.push(this.parse_term())
            if (this.current_token.type === TokenType.Rparen) {
                break
            }
            this.eat(TokenType.Comma)
        }
        this.eat(TokenType.Rparen)
        return {
            relation,
            terms,
            isNegated
        }
    }

    parse_rule(): Rule {
        let head = this.parse_atom()
        this.eat(TokenType.Colon_dash)
        let body = []
        while (this.current_token.type !== TokenType.Dot) {
            body.push(this.parse_atom())
        }
        this.eat(TokenType.Dot)

        return {
            head,
            body
        }
    }

    parse_rules(): Rule[] {
        let res = []
        while (this.current_token.type !== TokenType.Eof) {
            res.push(this.parse_rule())
        }
        return res
    }
}


export function parse_program9(text: string) {
    let p = new Parser(new Lexer(text))
    return p.parse_rules()
}
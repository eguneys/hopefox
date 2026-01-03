class ParserError extends Error {}
class LexerError extends Error {}

enum TokenType {
    Different,
    Equal,
    BeginFact,
    BeginIdea,
    Alias,
    Line,
    Word,
    Dot,
    Eof
}

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
        this.lookahead_nb_newlines = this.skip_whitespace()
    }

    private skip_whitespace() {
        let nb_newlines = 0
        while (this.current_char !== undefined && /\s/.test(this.current_char)) {
            if (this.current_char === '\n') {
                nb_newlines++
            }
            this.advance()
        }
        return nb_newlines
    }

    private is_lowercase_num(char: string): boolean {
        return /[a-z0-9_]/.test(char)
    }

    private word() {
        let result = ''
        while (this.current_char !== undefined && this.is_lowercase_num(this.current_char)) {
            result += this.current_char
            this.advance()
        }
        return result
    }

    lookahead_nb_newlines = 0

    public get_next_token(): Token {
        while (this.current_char !== undefined) {
            this.skip_whitespace()

            let current_char = this.current_char
            if (current_char === '!') {
                this.advance()
                if (this.current_char === '=') {
                    this.advance()
                    return { type: TokenType.Different, value: '!=' }
                }
            }
            if (this.current_char === '=') {
                this.advance()
                return { type: TokenType.Equal, value: '=' }
            }


            if (this.current_char === '.') {
                this.advance()
                return { type: TokenType.Dot, value: '.' }
            }

            const word = this.word()

            if (word === 'fact') {
                return { type: TokenType.BeginFact, value: 'fact' }
            }

            if (word === 'idea') {
                return { type: TokenType.BeginIdea, value: 'fact' }
            }

            if (word === 'alias') {
                return { type: TokenType.Alias, value: 'alias' }
            }

            if (word === 'line') {
                return { type: TokenType.Line, value: 'line' }
            }



            if (word !== undefined) {
                return { type: TokenType.Word, value: word }
            }

            if (this.current_char === undefined) {
                break
            }

            throw new LexerError(`Unexpected token ${this.current_char}`)
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
    
    private parse_assigns() {
        this.eat(TokenType.Dot)
        let path = this.word()
        this.eat(TokenType.Equal)
        let path2 = this.path()

        return { [path]: path2 }
    }

    private parse_match() {
        let column_a = this.eat(TokenType.Word)
        let param_a = this.eat(TokenType.Word)
        this.eat(TokenType.Equal)

        let column_b = this.eat(TokenType.Word)
        let param_b = this.eat(TokenType.Word)

        return { column_a, param_a, column_b, param_b }
    }

    private parse_alias() {
        this.eat(TokenType.Alias)
        let alias = this.word()
        let column = this.word()
        return { alias, column }
    }

    private parse_line() {
        this.eat(TokenType.Line)
        let res = []
        while (this.lexer.lookahead_nb_newlines === 0) {
            res.push(this.word())
        }
        return res
    }

    private word() {
        return this.eat(TokenType.Word)
    }

    private path() {
        let res = ''
        while (true) {
            res += this.word()
            if (this.lexer.lookahead_nb_newlines > 0) {
                break
            }
            this.eat(TokenType.Dot)
            if (this.lexer.lookahead_nb_newlines > 0) {
                break
            }
        }
        return res
    }

    private parse_fact() {
        let lookahead_token = this.lookahead_token
        if (lookahead_token.type === TokenType.BeginFact) {
            this.eat(TokenType.BeginFact)
            let name = this.eat(TokenType.Word)

            let aliases = []

            while (this.lookahead_token.type !== TokenType.Dot) {
                aliases.push(this.parse_alias())
            }

            let assigns = []
            while (this.current_token.type === TokenType.Dot) {
                assigns.push(this.parse_assigns())
            }

            let matches: Matches[] = []

            while (this.lexer.lookahead_nb_newlines <= 1) {
                matches.push(this.parse_match())
            }

            return {
                name,
                assigns,
                matches,
                aliases
            }
        }
    }

    private parse_idea() {
        let lookahead_token = this.lookahead_token
        if (lookahead_token.type === TokenType.BeginFact) {
            this.eat(TokenType.BeginFact)
            let name = this.eat(TokenType.Word)


            let aliases = []

            while (this.lookahead_token.type !== TokenType.Dot) {
                aliases.push(this.parse_alias())
            }

            let line = this.parse_line()

            let assigns = []
            while (this.current_token.type === TokenType.Dot) {
                assigns.push(this.parse_assigns())
            }

            let matches: Matches[] = []

            while (this.lexer.lookahead_nb_newlines <= 1) {
                matches.push(this.parse_match())
            }

            return {
                name,
                assigns,
                matches,
                aliases
            }
        }

    }


    public parse_program() {
        let facts = []
        let ideas = []
        while (this.current_token.type !== TokenType.Eof) {
            let fact = this.parse_fact()
            if (fact) {
                facts.push(fact)
            }

            let idea = this.parse_idea()
            if (idea) {
                ideas.push(idea)
            }
        }

        return {
            facts,
            ideas
        }
    }

}

type Path = string
type Assignment = Record<Path, Path>

type MatchesEqual = {
    is_different?: true
    column_a: string
    param_a: string
    column_b: string
    param_b: string
}

type MatchesBetween = {
    column_a: string
    param_a: string
    path_b: Path
    path_c: Path
}

type Matches = MatchesEqual | MatchesBetween

type Alias = {
    alias: string
    column: string
}

type Fact = {
    name: string,
    assigns: Assignment[]
    matches: Matches[]
    aliases: Alias[]
}

type Idea = {
    name: string
    line: string[]
    assigns: Assignment[]
    matches: Matches[]
    aliases: Alias[]
}

type Program = {
    ideas: Idea[]
    facts: Fact[]
}
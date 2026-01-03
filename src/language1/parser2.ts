class ParserError extends Error {}
class LexerError extends Error {}

enum TokenType {
    Different = 'Different',
    Equal = 'Equal',
    BeginFact = 'BeginFact',
    BeginIdea = 'BeginIdea',
    Alias = 'Alias',
    Line = 'Line',
    Word = 'Word',
    Dot = 'Dot',
    Between = 'Between',
    Newline = 'Newline',
    Eof = 'Eof'
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
    }

    skip_whitespace() {
        let has_newline = false
        while (this.current_char !== undefined && /\s/.test(this.current_char)) {
            if (this.current_char === '\n') {
                has_newline = true
                this.advance()
                break
            }
            this.advance()
        }
        return has_newline
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

    public get_next_token(): Token {
        while (this.current_char !== undefined) {
            let has_newline = this.skip_whitespace()
            if (has_newline) {
                return { type: TokenType.Newline, value: '\n' }
            }

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

            if (word === 'between') {
                return { type: TokenType.Between, value: 'between' }
            }

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
        let path = this.path()
        this.eat(TokenType.Equal)
        let path2 = this.path()

        return { [path]: path2 }
    }

    private parse_match(): Matches {
        let path_a = this.path()

        if (this.current_token.type === TokenType.Between) {
            this.eat(TokenType.Between)

            let path_b = this.path()

            let path_c = this.path()

            return { path_a, path_b, path_c }
        }

        if (this.current_token.type === TokenType.Different) {
            this.eat(TokenType.Different)
            let path_b = this.path()
            return { path_a, path_b, is_different: true }
        }

        this.eat(TokenType.Equal)
        let path_b = this.path()

        return { path_a, path_b }
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
        while (this.current_token.type !== TokenType.Newline) {
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
            if (this.current_token.type === TokenType.Dot) {
                this.eat(TokenType.Dot)
                res += '.'
            } else {
                break
            }
        }
        return res
    }

    private parse_fact() {
        let current_token = this.current_token
        if (current_token.type === TokenType.BeginFact) {
            this.eat(TokenType.BeginFact)
            let name = this.eat(TokenType.Word)

            this.eat(TokenType.Newline)
            let aliases = []

            while (this.current_token.type === TokenType.Alias) {
                aliases.push(this.parse_alias())
                this.eat(TokenType.Newline)
            }

            let assigns = []
            while (this.current_token.type === TokenType.Dot) {
                assigns.push(this.parse_assigns())
                this.eat(TokenType.Newline)
            }

            let matches: Matches[] = []

            while (true) {
                matches.push(this.parse_match())
                if (this.current_token.type === TokenType.Newline) {
                    this.advance_tokens()
                }
                if (this.current_token.type === TokenType.Newline) {
                    break
                }
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
        let current_token = this.current_token
        if (current_token.type === TokenType.BeginIdea) {
            this.eat(TokenType.BeginIdea)
            let name = this.eat(TokenType.Word)

            this.eat(TokenType.Newline)
            let aliases = []

            while (this.current_token.type === TokenType.Alias) {
                aliases.push(this.parse_alias())
                this.eat(TokenType.Newline)
            }

            if (this.current_token.type === TokenType.Newline) {
                this.eat(TokenType.Newline)
            }
            let line = this.parse_line()
            this.eat(TokenType.Newline)

            let assigns = []
            while (this.current_token.type === TokenType.Dot) {
                assigns.push(this.parse_assigns())
                this.eat(TokenType.Newline)
            }

            let matches: Matches[] = []

            while (true) {
                matches.push(this.parse_match())
                if (this.current_token.type === TokenType.Newline) {
                    this.advance_tokens()
                }
                if (this.current_token.type === TokenType.Newline) {
                    break
                }
                if (this.current_token.type === TokenType.Eof) {
                    break
                }
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

            while (this.current_token.type === TokenType.Newline) {
                this.advance_tokens()
            }

            let fact = this.parse_fact()
            if (fact) {
                facts.push(fact)
                continue
            }

            let idea = this.parse_idea()
            if (idea) {
                ideas.push(idea)
                continue
            }
            
            throw new ParserError('Fact or Idea expected.')
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
    path_a: Path
    path_b: Path
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

export function parse_program(text: string) {
    let p = new Parser(new Lexer(text))
    return p.parse_program()
}
class ParserError extends Error {}
class LexerError extends Error {}

enum TokenType {
    Different = 'Different',
    Equal = 'Equal',
    BeginFact = 'BeginFact',
    BeginIdea = 'BeginIdea',
    BeginMotif = 'BeginMotif',
    Legal = 'Legal',
    Alias = 'Alias',
    Line = 'Line',
    Word = 'Word',
    Const = 'Const',
    Dot = 'Dot',
    Between = 'Between',
    Newline = 'Newline',
    Eof = 'Eof'
}

type Token = {
    type: TokenType
    value: string
}

enum Constants {
    KING = 'KING'
}

const All_Constants: Constants[] = [Constants.KING]

function is_constant(s: string): s is Constants {
    return All_Constants.includes(s as Constants)
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

    private constant() {
        let result = ''
        while (this.current_char !== undefined && this.is_uppercase_num(this.current_char)) {
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

            let constant = this.constant()

            if (is_constant(constant)) {
                return { type: TokenType.Const, value: constant }
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

            if (word === 'motif') {
                return { type: TokenType.BeginMotif, value: 'motif' }
            }



            if (word === 'alias') {
                return { type: TokenType.Alias, value: 'alias' }
            }

            if (word === 'line') {
                return { type: TokenType.Line, value: 'line' }
            }

            if (word === 'legal') {
                return { type: TokenType.Legal, value: 'legal' }
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

        let path_a = this.path_or_constant()

        if (this.current_token.type === TokenType.Between) {
            this.eat(TokenType.Between)

            let path_b = this.path_or_constant()

            let path_c = this.path_or_constant()

            return { path_a, path_b, path_c }
        }

        if (this.current_token.type === TokenType.Different) {
            this.eat(TokenType.Different)
            let path_b = this.path_or_constant()
            return { path_a, path_b, is_different: true }
        }

        this.eat(TokenType.Equal)
        let path_b = this.path_or_constant()

        return { path_a, path_b }
    }

    private parse_alias() {
        this.eat(TokenType.Alias)
        let alias = this.path()
        let column = this.path()
        return { alias, column }
    }

    private parse_line() {
        this.eat(TokenType.Line)
        let res = []
        while (this.current_token.type !== TokenType.Newline) {
            if (this.current_token.type === TokenType.Eof) {
                break
            }
            res.push(this.path())
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

    private path_or_constant() {
        if (this.current_token.type === TokenType.Const) {
            return this.eat(TokenType.Const)
        } else {
            return this.path()  
        }
    }

    private parse_fact(): Fact | undefined {
        let current_token = this.current_token
        if (current_token.type === TokenType.BeginFact) {
            this.eat(TokenType.BeginFact)
            let name = this.path()

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

    private parse_idea(): Idea | undefined {
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
            if (this.current_token.type === TokenType.Eof) {
                return {
                    name,
                    line,
                    assigns: [],
                    matches: [],
                    aliases
                }
            }
            this.eat(TokenType.Newline)

            let assigns = []
            while (this.current_token.type === TokenType.Dot) {
                assigns.push(this.parse_assigns())
                this.eat(TokenType.Newline)
            }

            let matches: Matches[] = []

            while (true) {
                let current_token = this.current_token
                if (current_token.type === TokenType.Eof) {
                    break
                }
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
                line,
                assigns,
                matches,
                aliases
            }
        }

    }


    private parse_motif(): Motif | undefined {
        let current_token = this.current_token
        if (current_token.type === TokenType.BeginMotif) {
            this.eat(TokenType.BeginMotif)
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
                line,
                assigns,
                matches,
                aliases
            }
        }

    }




    public parse_program(): Program {
        let facts = new Map()
        let ideas = new Map()
        let legals = []
        let motives = []

        let current_token = this.current_token
        while (current_token.type !== TokenType.Eof) {

            while (this.current_token.type === TokenType.Newline) {
                this.advance_tokens()
            }

            if (this.current_token.type === TokenType.Eof) {
                break
            }

            if (this.current_token.type === TokenType.Legal) {
                this.eat(TokenType.Legal)
                legals.push(this.word())
                continue
            }

            let fact = this.parse_fact()
            if (fact) {
                facts.set(fact.name, fact)
                continue
            }

            let idea = this.parse_idea()
            if (idea) {
                ideas.set(idea.name, idea)
                continue
            }

            let motif = this.parse_motif()
            if (motif) {
                motives.push(motif)
                continue
            }


            
            throw new ParserError('Fact or Idea expected.')
        }

        return {
            facts,
            ideas,
            motives,
            legals
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
    path_a: Path
    path_b: Path
    path_c: Path
}

type Matches = MatchesEqual | MatchesBetween

export function is_matches_between(m: Matches): m is MatchesBetween {
    return (m as MatchesBetween).path_c !== undefined
}

export type Alias = {
    alias: string
    column: string
}

export type Fact = {
    name: string,
    assigns: Assignment[]
    matches: Matches[]
    aliases: Alias[]
}

export type Idea = {
    name: string
    line: string[]
    assigns: Assignment[]
    matches: Matches[]
    aliases: Alias[]
}


export type Motif = {
    name: string
    line: string[]
    assigns: Assignment[]
    matches: Matches[]
    aliases: Alias[]
}

export type Program = {
    ideas: Map<string, Idea>
    facts: Map<string, Fact>
    legals: string[]
    motives: Motif[]
}

export function parse_program(text: string) {
    let p = new Parser(new Lexer(text))
    return p.parse_program()
}
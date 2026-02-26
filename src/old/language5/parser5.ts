class ParserError extends Error {}
class LexerError extends Error {}


enum TokenType {
    Different = 'Different',
    Equal = 'Equal',
    BeginFact = 'BeginFact',
    BeginIdea = 'BeginIdea',
    Alias = 'Alias',
    And = 'And',
    Or = 'Or',
    Minus = 'Minus',
    Word = 'Word',
    Move = 'Move',
    Line = 'Line',
    Side = 'Side',
    Const = 'Const',
    Dot = 'Dot',
    NewlineDot = 'NewlineDot',
    Between = 'Between',
    NotBetween = 'NotBetween',
    Eof = 'Eof'
}


type Token = {
    type: TokenType
    value: string
}

export enum Constants {
    King = 'King',
    Queen = 'Queen',
    Bishop = 'Bishop',
    Rook = 'Rook',
    Knight = 'Knight',
    Pawn =  'Pawn'
}

const All_Constants: Constants[] = [Constants.King, Constants.Queen, Constants.Bishop, Constants.Rook, Constants.Knight, Constants.Pawn]

export function is_constant(s: string): s is Constants {
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
        if (this.current_char !== undefined && this.is_uppercase_num(this.current_char)) {
            result += this.current_char
            this.advance()
            while (this.current_char !== undefined && this.is_lowercase_num(this.current_char)) {
                result += this.current_char
                this.advance()
            }
        }
        return result
    }

    public get_next_token(): Token {
        while (this.current_char !== undefined) {
            let has_newline = this.skip_whitespace()
            let current_char = this.current_char

            if (current_char === '-') {
                this.advance()
                return { type: TokenType.Minus, value: '-' }
            }

            if (current_char === '!') {
                this.advance()
                return { type: TokenType.Different, value: '!' }
            }

            if (this.current_char === '=') {
                this.advance()
                return { type: TokenType.Equal, value: '=' }
            }


            if (this.current_char === '.') {
                this.advance()
                if (has_newline) {
                    return { type: TokenType.NewlineDot, value: "\n." }
                }
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
            if (word === 'not_between') {
                return { type: TokenType.NotBetween, value: 'notbetween' }
            }


            if (word === 'fact') {
                return { type: TokenType.BeginFact, value: 'fact' }
            }

            if (word === 'idea') {
                return { type: TokenType.BeginIdea, value: 'idea' }
            }

            if (word === 'alias') {
                return { type: TokenType.Alias, value: 'alias' }
            }

            if (word === 'move') {
                return { type: TokenType.Move, value: 'move' }
            }
            if (word === 'line') {
                return { type: TokenType.Line, value: 'line' }
            }



            if (word === 'side') {
                return { type: TokenType.Side, value: 'side' }
            }


            if (word === 'and') {
                return { type: TokenType.And, value: 'and' }
            }
            if (word === 'or') {
                return { type: TokenType.Or, value: 'or' }
            }



            if (word !== '') {
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
    private lookahead_token2: Token

    constructor(lexer: Lexer) {
        this.lexer = lexer
        this.current_token = this.lexer.get_next_token()
        this.lookahead_token = this.lexer.get_next_token()
        this.lookahead_token2 = this.lexer.get_next_token()
    }


    private advance_tokens() {
        this.current_token = this.lookahead_token
        this.lookahead_token = this.lookahead_token2
        this.lookahead_token2 = this.lexer.get_next_token()
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
 
    private word() {
        return this.eat(TokenType.Word)
    }

    private parse_definition(): Definition {
        let current_token = this.current_token
        let fact, idea
        if (current_token.type === TokenType.BeginFact) {
            this.eat(TokenType.BeginFact)
            fact = this.word()
        }
        if (current_token.type === TokenType.BeginIdea) {
            this.eat(TokenType.BeginIdea)

            if (this.current_token.type === TokenType.Word) {
                idea = this.word()
            }
        }

        let moves: Move[] = []
        let zeros: Zero[] = []
        let alias: Alias[] = []
        let matches: Match[] = []
        let assigns: Assign[] = []
        let sides: Move[] = []
        let lines: Move[] = []


        while (true) {
            if (this.current_token.type === TokenType.Side) {
                sides.push(this.parse_side())
                continue
            }
            if (this.current_token.type === TokenType.Line) {
                lines.push(this.parse_line())
                continue
            }
            if (this.current_token.type === TokenType.Move) {
                moves.push(this.parse_move())
                continue
            }
            if (this.current_token.type === TokenType.Different) {
                zeros.push(this.parse_zero())
                continue
            }
            if (this.current_token.type === TokenType.Alias) {
                alias.push(this.parse_alias())
                continue
            }

            if (this.current_token.type === TokenType.NewlineDot) {
                this.eat(TokenType.NewlineDot)
                assigns.push(this.parse_assign())
                continue
            } 

            if (this.current_token.type === TokenType.Eof) {
                break
            }

            if (this.current_token.type === TokenType.BeginFact || this.current_token.type === TokenType.BeginIdea) {
                break
            }
            
            let m = this.parse_match()
            if (m) {
                matches.push(m)
                continue
            }

            break
        }


        return {
            fact,
            idea,
            alias,
            matches,
            moves,
            lines,
            sides,
            zeros,
            assigns
}
    }


    parse_match(): Match | undefined {

        let left = this.parse_dotted_path()

        if (!left) {
            return undefined
        }

        let current_token = this.current_token
        if (current_token.type === TokenType.NotBetween) {
            this.eat(TokenType.NotBetween)
            let right = this.parse_dotted_path()!
            let right2 = this.parse_dotted_path()!

            return { left, right, right2, is_different: true }
        }
        if (current_token.type === TokenType.Between) {
            this.eat(TokenType.Between)
            let right = this.parse_dotted_path()!
            let right2 = this.parse_dotted_path()!
            return { left, right, right2, is_different: false }
        }
        if (current_token.type === TokenType.Different) {
            this.eat(TokenType.Different)
            this.eat(TokenType.Equal)
            if (this.current_token.type === TokenType.Const) {
                let right = this.eat(TokenType.Const) as Constants
                return { left, const: right, is_different: true }
            }

            let right = this.parse_dotted_path()!
            return { left, right, is_different: true }
        }

        this.eat(TokenType.Equal)
        if (this.current_token.type === TokenType.Const) {
            let right = this.eat(TokenType.Const) as Constants
            return { left, const: right, is_different: false }
        }

        let right = this.parse_dotted_path()!
        return { left, right, is_different: false }  
    }

    parse_assign(): Assign {
        let left = this.parse_dotted_path()!
        this.eat(TokenType.Equal)
        let right = this.parse_dotted_path()!
        return { left, right }
    }

    parse_alias(): Alias {
        this.eat(TokenType.Alias)
        let left = this.word()

        let right = this.parse_move_list_right()!

        return { left, right }

    }
    parse_zero(): Zero {
        this.eat(TokenType.Different)

        return this.parse_dotted_path()!
    }


    parse_dotted_path() {
        if (this.current_token.type === TokenType.Word) {
            let column = this.word()
            let current_token = this.current_token
            let columns = [column]
            while (current_token.type === TokenType.Dot) {
                this.eat(TokenType.Dot)
                columns.push(this.word())
                current_token = this.current_token
            }
            if (columns.length === 1) {
                return {
                    field: columns[0]
                }
            }
            if (columns.length === 2) {
                return {
                    column: columns[0],
                    field: columns[1]
                }
            }
            return {
                columns: columns.slice(0, -1),
                field: columns[columns.length - 1]
            }
        }
    }

    parse_side(): Move {
        this.eat(TokenType.Side)

        let left
        let right_only = this.parse_move_list_right()

        if (right_only !== undefined){ 
            
            if (right_only.type !== 'single') {
                return {
                    right: right_only
                }
            }

            left = right_only.a
        } else {
            left = this.parse_dotted_path()!
        }

        let right = this.parse_move_list_right()

        if (right === undefined)  {
            return {
                right: {
                    type: 'single',
                    a: left
                }
            }
        }

        return {
            left,
            right
        }
    }



    parse_line(): Move {
        this.eat(TokenType.Line)

        let left
        let right_only = this.parse_move_list_right()

        if (right_only !== undefined){ 
            
            if (right_only.type !== 'single') {
                return {
                    right: right_only
                }
            }

            left = right_only.a
        } else {
            left = this.parse_dotted_path()!
        }

        let right = this.parse_move_list_right()

        if (right === undefined)  {
            return {
                right: {
                    type: 'single',
                    a: left
                }
            }
        }

        return {
            left,
            right
        }
    }



    parse_move(): Move {
        this.eat(TokenType.Move)

        let left
        let right_only = this.parse_move_list_right()

        if (right_only !== undefined){ 
            
            if (right_only.type !== 'single') {
                return {
                    right: right_only
                }
            }

            left = right_only.a
        } else {
            left = this.parse_dotted_path()!
        }

        let right = this.parse_move_list_right()

        if (right === undefined)  {
            return {
                right: {
                    type: 'single',
                    a: left
                }
            }
        }

        return {
            left,
            right
        }
    }

    parse_move_list_right(): MoveListRight | undefined {
        let aa = []
        let type: any
        while (true) {
            let a = this.parse_dotted_path()

            if (a === undefined) {
                break
            }
            aa.push(a)

            if (this.current_token.type === TokenType.And) {
                type = 'and'
                this.eat(TokenType.And)
                continue
            }
            if (this.current_token.type === TokenType.Or) {
                type = 'or'
                this.eat(TokenType.Or)
                continue
            }
            if (this.current_token.type === TokenType.Minus) {
                type = 'minus'
                this.eat(TokenType.Minus)
                continue
            }
            break
        }

        if (aa.length === 0) {
            return undefined
        }
        if (aa.length === 1) {
            return {
                type: 'single',
                a: aa[0]
            }
        }

        return {
            type,
            aa
        }
    }

    public parse_definitions(): Definition[] {

        let res = []

        while (true) {

            let current_token = this.current_token
            if (current_token.type === TokenType.BeginFact ||
                current_token.type === TokenType.BeginIdea) {
                    res.push(this.parse_definition())
                    continue
            }

            break
        }

        return res
    }

}

type Alias = {
    left: string
    right: MoveListRight
 }

 type Match = Normal | Const
 type Normal = {
    left: DotedPath
    right: DotedPath
    is_different: boolean
    right2?: DotedPath
 } 
 
 export type Const = {
    left: DotedPath
    const: Constants
 }

 export function is_const_match(m: Match): m is Const {
    return (m as Const).const !== undefined
 }



export type DotedPath = Columns | Column | Field

type Columns = {
    columns: string[]
    field: string
}

type Column = {
    column: string
    field: string
}

export type Field = {
    field: string
}

export function is_columns(d: DotedPath): d is Columns {
    return (d as Columns).columns !== undefined
}
export function is_column(d: DotedPath): d is Column {
    return (d as Column).column !== undefined
}

export type MoveListRight = {
    type: 'single'
    a: DotedPath
} | {
    type: 'and',
    aa: DotedPath[]
} | {
    type: 'or',
    aa: DotedPath[]
} | {
    type: 'minus'
    aa: DotedPath[]
}

 type Move = {
    left?: DotedPath
    right: MoveListRight
 }

 type Zero = DotedPath

 type Assign = {
    left: DotedPath
    right: DotedPath
 }

export type Definition = {
    fact?: string
    idea?: string

    alias: Alias[]
    matches: Match[]
    moves: Move[]
    lines: Move[]
    sides: Move[]
    zeros: Zero[]
    assigns: Assign[]
}


export function parse_defs6(rules: string) {
    let lexer = new Lexer(rules)
    let parser = new Parser(lexer)
    return parser.parse_definitions()
}
import { pbkdf2 } from "crypto"
import { attacks } from "./attacks"
import { Chess, Position, pseudoDests } from "./chess"
import { EMPTY_FEN, makeFen, parseCastlingFen, parseFen } from "./fen"
import { PositionManager } from "./hopefox_c"
import { blocks } from "./hopefox_helper"
import { setupClone } from "./setup"
import { SquareSet } from "./squareSet"
import { Piece, Square } from "./types"
import { parseSquare } from "./util"
import { piece } from "./debug"



enum TokenType {
    PAIR_NAME = 'PAIR_NAME',
    PIECE_NAME = 'PIECE_NAME',
    KEYWORD_BLOCKS = 'KEYWORD_BLOCKS',
    KEYWORD_ALIGNMENT = 'KEYWORD_ALIGNMENT',
    KEYWORD_PROTECTED_BY = 'KEYWORD_PROTECTED_BY',
    KEYWORD_BATTERY_EYES = 'KEYWORD_BATTERY_EYES',
    KEYWORD_CAN_FORK = 'KEYWORD_CAN_FORK',
    KEYWORD_IF = 'KEYWORD_IF',
    KEYWORD_MOVES = 'KEYWORD_MOVES',
    KEYWORD_TAKES = 'KEYWORD_TAKES',
    KEYWORD_WITH_CHECK = 'KEYWORD_WITH_CHECK',
    KEYWORD_IS_UNPROTECTED = 'KEYWORD_IS_UNPROTECTED',
    KEYWORD_UNDEFENDED = 'KEYWORD_UNDEFENDED',
    KEYWORD_PREVENTING_MATE = 'KEYWORD_PREVENTING_MATE',
    KEYWORD_INTERMEZZO = 'KEYWORD_INTERMEZZO',
    KEYWORD_RECAPTURES = 'KEYWORD_RECAPTURES',
    KEYWORD_BEFORE = 'KEYWORD_BEFORE',

    KEYWORD_BOTH = 'KEYWORD_BOTH',
    KEYWORD_ARE_ALIGNED = 'KEYWORD_ARE_ALIGNED',
    KEYWORD_ON_THE_2ND_RANK = 'KEYWORD_ON_THE_2ND_RANK',
    KEYWORD_IS_AT_THE_BACKRANK = 'KEYWORD_IS_AT_THE_BACKRANK',
    KEYWORD_SO_THERE_IS_NO_MATE_THREAT = 'KEYWORD_SO_THERE_IS_NO_MATE_THREAT',
    KEYWORD_ON_BACKRANK = 'KEYWORD_ON_BACKRANK',
    KEYWORD_AROUND_THE_KING = 'KEYWORD_AROUND_THE_KING',
    KEYWORD_IS_ONTO = 'KEYWORD_IS_ONTO',
    KEYWORD_EYES = 'KEYWORD_EYES',
    KEYWORD_CAN_CHECK = 'KEYWORD_CAN_CHECK',
    KEYWORD_AND_THEN = 'KEYWORD_AND_THEN',
    KEYWORD_AND = 'KEYWORD_AND',
    KEYWORD_DELIVER_MATE = 'KEYWORD_DELIVER_MATE',
    KEYWORD_THE = 'KEYWORD_THE',
    KEYWORD_BUT = 'KEYWORD_BUT',
    KEYWORD_OR = 'KEYWORD_OR',
    KEYWORD_A = 'KEYWORD_A',

    COMMA = 'COMMA',
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
    private pair_names: Map<string, TokenType>

    constructor(text: string) {
        this.text = text
        this.pos = 0
        this.current_char = this.text[this.pos]

        this.keywords = new Map([
            ['blocks', TokenType.KEYWORD_BLOCKS],
            ['alignment', TokenType.KEYWORD_ALIGNMENT],
            ['protected_by', TokenType.KEYWORD_PROTECTED_BY],
            ['battery_eyes', TokenType.KEYWORD_BATTERY_EYES],
            ['can_fork', TokenType.KEYWORD_CAN_FORK],
            ['if', TokenType.KEYWORD_IF],
            ['moves', TokenType.KEYWORD_MOVES],
            ['takes', TokenType.KEYWORD_TAKES],
            ['with_check', TokenType.KEYWORD_WITH_CHECK],
            ['is_unprotected', TokenType.KEYWORD_IS_UNPROTECTED],

            ['preventing_mate', TokenType.KEYWORD_PREVENTING_MATE],
            ['intermezzo', TokenType.KEYWORD_INTERMEZZO],
            ['undefended', TokenType.KEYWORD_UNDEFENDED],
            ['recaptures', TokenType.KEYWORD_RECAPTURES],
            ['before', TokenType.KEYWORD_BEFORE],


            ['both', TokenType.KEYWORD_BOTH],
            ['are_aligned', TokenType.KEYWORD_ARE_ALIGNED],
            ['on_the_2nd_rank', TokenType.KEYWORD_ON_THE_2ND_RANK],
            ['is_at_the_backrank', TokenType.KEYWORD_IS_AT_THE_BACKRANK],
            ['so_there_is_no_mate_threat', TokenType.KEYWORD_SO_THERE_IS_NO_MATE_THREAT],
            ['on_backrank', TokenType.KEYWORD_ON_BACKRANK],
            ['around_the_king', TokenType.KEYWORD_AROUND_THE_KING],
            ['is_onto', TokenType.KEYWORD_IS_ONTO],
            ['eyes', TokenType.KEYWORD_EYES],
            ['can_check', TokenType.KEYWORD_CAN_CHECK],
            ['and_then', TokenType.KEYWORD_AND_THEN],
            ['and', TokenType.KEYWORD_AND],
            ['deliver_mate', TokenType.KEYWORD_DELIVER_MATE],
            ['the', TokenType.KEYWORD_THE],
            ['but', TokenType.KEYWORD_BUT],
            ['or', TokenType.KEYWORD_OR],
            ['a', TokenType.KEYWORD_A],

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

        this.pair_names = new Map([
            ['rooks', TokenType.PAIR_NAME],
            ['bishops', TokenType.PAIR_NAME],
            ['knights', TokenType.PAIR_NAME],
            ['Rooks', TokenType.PAIR_NAME],
            ['Bishops', TokenType.PAIR_NAME],
            ['Knights', TokenType.PAIR_NAME]
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
            if (this.is_comma(this.current_char)) {
                this.advance()
                return { type: TokenType.COMMA, value: ',' }
            }
            const word_str = this.word()
            if (this.keywords.has(word_str)) {
                return { type: this.keywords.get(word_str)!, value: word_str }
            } else if (this.piece_names.has(word_str)) {
                return { type: TokenType.PIECE_NAME, value: word_str }
            } else if (this.pair_names.has(word_str)) {
                return { type: TokenType.PAIR_NAME, value: word_str }
            }
        }
        return { type: TokenType.EOF, value: '' }
    }
}

interface AreAlignedSentence {
    type: 'are_aligned',
    piece1: string,
    piece2: string,
    rank?: number,
    around?: string
}


interface BlocksAlignmentSentence {
    type: 'blocks_alignment'
    blocker: string
    aligned1: string
    aligned2: string
}

interface ProtectedBySentence {
    type: 'protected_by'
    protected: string
    protector: string
}

interface BatteryEyesSentence {
    type: 'battery_eyes'
    back: string
    front: string
    eyes: string
}

interface BatteryEyesProtectedBySentence {
    type: 'battery_eyes_protected_by'
    back: string
    front: string
    eyes: string
    protector: string
}

interface CanForkSentence {
    type: 'can_fork'
    piece: string
    forked: string[]
    lines: Line[]
}

interface MovesSentence {
    type: 'moves'
    piece: string
}

interface TakesSentence {
    type: 'takes'
    taken: string
    taker: string
    with_check: boolean
}

interface BeforeSentence {
    type: 'before'
}

type LineSentence = MovesSentence | TakesSentence | BeforeSentence
type Line = LineSentence[]

interface IsUnprotectedSentence {
    type: 'is_unprotected',
    piece: string
}


type ParsedSentence = BlocksAlignmentSentence 
| ProtectedBySentence
| BatteryEyesSentence
| BatteryEyesProtectedBySentence
| CanForkSentence
| IsUnprotectedSentence
| AreAlignedSentence

function is_are_aligned(s: ParsedSentence): s is AreAlignedSentence {
    return s.type === 'are_aligned'
}

function is_blocks_alignment(s: ParsedSentence): s is BlocksAlignmentSentence {
    return s.type === 'blocks_alignment'
}
function is_protected_by(s: ParsedSentence): s is ProtectedBySentence {
    return s.type === 'protected_by'
}
function is_battery_eyes_protected_by(s: ParsedSentence): s is BatteryEyesProtectedBySentence {
    return s.type === 'battery_eyes_protected_by'
}
function is_can_fork(s: ParsedSentence): s is CanForkSentence {
    return s.type === 'can_fork'
}
function is_unprotected(s: ParsedSentence): s is IsUnprotectedSentence {
    return s.type === 'is_unprotected'
}

function is_moves(s: LineSentence): s is MovesSentence {
    return s.type === 'moves'
}
function is_takes(s: LineSentence): s is TakesSentence {
    return s.type === 'takes'
}
function is_before(s: LineSentence): s is BeforeSentence {
    return s.type === 'before'
}



class ParserError extends Error {
}

class Parser {
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


    parse_blocks_alignment(): BlocksAlignmentSentence {
        const blocker = this.piece()
        this.eat(TokenType.KEYWORD_BLOCKS)
        const aligned1 = this.piece()
        const aligned2 = this.piece()
        this.eat(TokenType.KEYWORD_ALIGNMENT)
        return {

            type: 'blocks_alignment',
            blocker,
            aligned1,
            aligned2
        }
    }

    parse_is_unprotected(): IsUnprotectedSentence {
        const piece = this.piece()
        this.eat(TokenType.KEYWORD_IS_UNPROTECTED)

        return {
            type: 'is_unprotected',
            piece
        }
    }



    parse_protected_by(): ProtectedBySentence {
        let protected_piece = this.piece()
        this.eat(TokenType.KEYWORD_PROTECTED_BY)
        let protector = this.piece()

        return {
            type: 'protected_by',
            protected: protected_piece,
            protector
        }
    }

    parse_battery_eyes(): BatteryEyesSentence | BatteryEyesProtectedBySentence {
        let back = this.piece()
        let front = this.piece()
        this.eat(TokenType.KEYWORD_BATTERY_EYES)
        let eyes = this.piece()

        if (this.current_token.type === TokenType.KEYWORD_PROTECTED_BY) {
            this.eat(TokenType.KEYWORD_PROTECTED_BY)
            let protector = this.piece()

        return {
            type: 'battery_eyes_protected_by',
            back,
            front,
            eyes,
            protector
        }

        }

        return {
            type: 'battery_eyes',
            back,
            front,
            eyes
        }
    }

    parse_can_fork(): CanForkSentence {
        let piece = this.piece()
        this.eat(TokenType.KEYWORD_CAN_FORK)

        let forked = []
        while (this.current_token.type === TokenType.PIECE_NAME) {
            forked.push(this.piece())
        }

        let lines: Line[] = []
        let line: Line = []

        while(true) {
            let current_token = this.current_token
            if (current_token.type === 'COMMA') {

                this.eat(TokenType.COMMA)

                if (this.current_token.type === 'KEYWORD_IF') {
                    this.eat(TokenType.KEYWORD_IF)
                    if (line.length > 0) {
                        lines.push(line)
                        line = []
                    }
                }

                if (this.current_token.type === 'KEYWORD_BEFORE') {
                    this.eat(TokenType.KEYWORD_BEFORE)
                    line.push({ type: 'before' })
                }

                if (this.lookahead_token.type === 'KEYWORD_MOVES') {
                    line.push(this.parse_moves())
                } else if (this.lookahead_token.type === 'KEYWORD_RECAPTURES' || this.lookahead_token.type === 'KEYWORD_TAKES' || this.lookahead2_token.type === 'KEYWORD_TAKES') {
                    line.push(this.parse_takes())
                } else if (this.current_token.type === 'KEYWORD_PREVENTING_MATE') {
                    this.eat(TokenType.KEYWORD_PREVENTING_MATE)
                }

            } else {
                break
            }
        }

        if (line.length > 0) {
            lines.push(line)
        }

        return {
            type: 'can_fork',
            piece,
            forked,
            lines
        }
    }


    parse_moves(): MovesSentence {
        let moves = this.piece()
        this.eat(TokenType.KEYWORD_MOVES)

        return {
            type: 'moves',
            piece: moves
        }
    }

    parse_takes(): TakesSentence {
        let taker = this.piece()

        if (this.current_token.type === 'KEYWORD_INTERMEZZO') {
            this.eat(TokenType.KEYWORD_INTERMEZZO)
        }


        if (this.current_token.type === 'KEYWORD_TAKES') {
            this.eat(TokenType.KEYWORD_TAKES)
        } else if (this.current_token.type === 'KEYWORD_RECAPTURES') {
            this.eat(TokenType.KEYWORD_RECAPTURES)
        }

        if (this.current_token.type === 'KEYWORD_UNDEFENDED') {
            this.eat(TokenType.KEYWORD_UNDEFENDED)
        }



        let taken = this.piece()

        let with_check = false
        if (this.current_token.type === TokenType.KEYWORD_WITH_CHECK) {
            this.eat(TokenType.KEYWORD_WITH_CHECK)
            with_check = true
        }

        return {
            type: 'takes',
            taker,
            taken,
            with_check,
        }
    }

    parse_are_aligned(): AreAlignedSentence {
        if (this.current_token.type === TokenType.KEYWORD_BOTH) {
            this.eat(TokenType.KEYWORD_BOTH)
        }

        let piece1 = '', piece2 = ''
        if (this.current_token.type === TokenType.PAIR_NAME) {
            [piece1, piece2] = pair_to_pieces(this.pair())
        }

        this.eat(TokenType.KEYWORD_ARE_ALIGNED)
        let rank
        if (this.current_token.type === TokenType.KEYWORD_ON_THE_2ND_RANK) {
            this.eat(TokenType.KEYWORD_ON_THE_2ND_RANK)
            rank = 1
        }

        return {
            type: 'are_aligned',
            piece1,
            piece2,
            rank

        }
    }


    parse_sentence(): ParsedSentence {

        if (this.lookahead2_token.type === TokenType.KEYWORD_ARE_ALIGNED) {
            const result = this.parse_are_aligned()
            this.eat(TokenType.EOF)
            return result
        }

        if (this.current_token.type !== TokenType.PIECE_NAME) {
            this.error(TokenType.PIECE_NAME)
        }

        if (this.lookahead_token.type === TokenType.KEYWORD_IS_UNPROTECTED) {
            const result = this.parse_is_unprotected()
            this.eat(TokenType.EOF)
            return result
        } else if (this.lookahead_token.type === TokenType.KEYWORD_CAN_FORK) {
            const result = this.parse_can_fork()
            this.eat(TokenType.EOF)
            return result
        } else if (this.lookahead_token.type === TokenType.KEYWORD_BLOCKS) {
            const result = this.parse_blocks_alignment()
            this.eat(TokenType.EOF)
            return result
        } else if (this.lookahead_token.type === TokenType.KEYWORD_PROTECTED_BY) {
            const result = this.parse_protected_by()
            this.eat(TokenType.EOF)
            return result
        } else if (this.lookahead2_token.type === TokenType.KEYWORD_BATTERY_EYES) {
            const result = this.parse_battery_eyes()
            this.eat(TokenType.EOF)
            return result
        } else {
            throw this.error()
        }
    }
}

function pair_to_pieces(str: string): [string, string] {
    const m: Record<string, [string, string]> = {
        'rooks': ['rook', 'rook2'],
        'knights': ['knight', 'knight2'],
        'bishops': ['bishop', 'bishop2'],
        'Rooks': ['Rook', 'Rook2'],
        'Knights': ['Knight', 'Knight2'],
        'Bishops': ['Bishop', 'Bishop2'],
    }

    return m[str]
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

    const m2: Record<string, Piece> = {
        'queen2': { role: 'queen', color: 'black' },
        'bishop2': { role: 'bishop', color: 'black' },
        'rook2': { role: 'rook', color: 'black' },
        'king2': { role: 'king', color: 'black' },
        'knight2': { role: 'knight', color: 'black' },
        'pawn2': { role: 'pawn', color: 'black' },
        'Queen2': { role: 'queen', color: 'white' },
        'Bishop2': { role: 'bishop', color: 'white' },
        'Rook2': { role: 'rook', color: 'white' },
        'King2': { role: 'king', color: 'white' },
        'Knight2': { role: 'knight', color: 'white' },
        'Pawn2': { role: 'pawn', color: 'white' },
    }

    return m[str] ?? m2[str]
}

type Context = {
    records: Record<string, Square>,
    pos: Position
}

function resolve_blocks_alignment(x: BlocksAlignmentSentence, ccx: Context[]) {

    let aligned1 = parse_piece(x.aligned1)
    let aligned2 = parse_piece(x.aligned2)
    let blocker = parse_piece(x.blocker)


    let ccx2 = []
    for (let cx of ccx) {

        let aligned1_squares = cx.pos.board.occupied.complement()

        if (cx.records[x.aligned1] !== undefined) {
            aligned1_squares = SquareSet.fromSquare(cx.records[x.aligned1])
        }

        let blocker_squares = cx.pos.board.occupied.complement()

        if (cx.records[x.blocker] !== undefined) {
            blocker_squares = SquareSet.fromSquare(cx.records[x.blocker])
        }

        let aligned2_squares = cx.pos.board.occupied.complement()

        if (cx.records[x.aligned2] !== undefined) {
            aligned2_squares = SquareSet.fromSquare(cx.records[x.aligned2])
        }

        for (let aligned1_square of aligned1_squares) {

            let aligned2_squares2 = aligned2_squares.set(aligned1_square, false)

            for (let aligned2_square of aligned2_squares2) {

                let blocker_squares2 = blocker_squares.set(aligned1_square, false)
                blocker_squares2 = blocker_squares2.set(aligned2_square, false)

                for (let blocker_square of blocker_squares2) {

                    let p2 = cx.pos.clone()
                    p2.board.set(aligned1_square, aligned1)
                    p2.board.set(aligned2_square, aligned2)

                    p2.board.set(blocker_square, blocker)

                    let bb = blocks(aligned1, aligned1_square, p2.board.occupied)

                    if (bb.length >= 2) {

                        if (bb[0].has(blocker_square) && bb[1].has(aligned2_square)) {

                            ccx2.push({
                                records: {
                                    ...cx.records,
                                    [x.aligned1]: aligned1_square,
                                    [x.aligned2]: aligned2_square,
                                    [x.blocker]: blocker_square,
                                },
                                pos: p2
                            })
                        }
                    }
                }
            }
        }
    }

    return ccx2
}

function resolve_protected_by(y: ProtectedBySentence, ccx: Context[]) {

    let protector = parse_piece(y.protector)
    let protected_piece = parse_piece(y.protected)

    let ccx2 = []
    for (let cx of ccx) {

        let protector_squares = cx.pos.board.occupied.complement()
        let protected_squares = cx.pos.board.occupied.complement()

        if (cx.records[y.protector] !== undefined) {
            protector_squares = SquareSet.fromSquare(cx.records[y.protector])
        }
        if (cx.records[y.protected] !== undefined) {
            protected_squares = SquareSet.fromSquare(cx.records[y.protected])
        }

        for (let protector_square of protector_squares) {
            let protected_squares2 = protected_squares.intersect(attacks(protector, protector_square, cx.pos.board.occupied))

            for (let protected_square of protected_squares2) {

                let p3 = cx.pos.clone()
                p3.board.set(protector_square, protector)
                p3.board.set(protected_square, protected_piece)
                let f = makeFen(p3.toSetup())

                ccx2.push({
                    records: {
                        ...cx.records,
                        [y.protector]: protector_square,
                        [y.protected]: protected_square,
                    },
                    pos: p3
                })
            }
        }


    }

    return ccx2
}


function resolve_battery_eyes_protected_by(x: BatteryEyesProtectedBySentence, ccx: Context[]) {

    let back = parse_piece(x.back)
    let front = parse_piece(x.front)
    let eyes = parse_piece(x.eyes)

    let protector = parse_piece(x.protector)

    let ccx2: Context[] = []

    for (let cx of ccx) {

        let back_squares = cx.pos.board.occupied.complement()
        let front_squares = cx.pos.board.occupied.complement()
        let eyes_squares = cx.pos.board.occupied.complement()

        let protector_squares = cx.pos.board.occupied.complement()

        if (cx.records[x.back] !== undefined) {
            back_squares = SquareSet.fromSquare(cx.records[x.back])
        }
        if (cx.records[x.front] !== undefined) {
            front_squares = SquareSet.fromSquare(cx.records[x.front])
        }
        if (cx.records[x.eyes] !== undefined) {
            eyes_squares = SquareSet.fromSquare(cx.records[x.eyes])

            eyes_squares = attacks(eyes, cx.records[x.eyes], cx.pos.board.occupied)

        }

        if (cx.records[x.protector] !== undefined) {
            protector_squares = SquareSet.fromSquare(cx.records[x.protector])
        }

        for (let back_square of back_squares) {
            let front_squares2 = front_squares.intersect(attacks(back, back_square, cx.pos.board.occupied))

            for (let front_square of front_squares2) {


                for (let eye_square of eyes_squares) {


                    for (let protector_square of protector_squares) {
                        if (!attacks(protector, protector_square, cx.pos.board.occupied).has(eye_square)) {
                            continue
                        }

                        let p3 = cx.pos.clone()

                        p3.board.set(back_square, back)
                        p3.board.set(front_square, front)
                        p3.board.set(eye_square, eyes)
                        p3.board.set(protector_square, protector)

                        let bb = blocks(back, back_square, p3.board.occupied)

                        if (bb.length >= 2) {
                            if (bb[0].has(front_square) && bb[1].has(eye_square)) {

                                p3.board.take(eye_square)
                                ccx2.push({
                                    records: {
                                        ...cx.records,
                                        [x.front]: front_square,
                                        [x.back]: back_square,
                                        [x.protector]: protector_square
                                    },
                                    pos: p3
                                })

                            }
                        }
                    }
                }


            }

        }


    }

    return ccx2
}

function resolve_battery_eyes(x: BatteryEyesSentence, ccx: Context[]) {

    let back = parse_piece(x.back)
    let front = parse_piece(x.front)
    let eyes = parse_piece(x.eyes)

    let ccx2: Context[] = []

    for (let cx of ccx) {

        let back_squares = cx.pos.board.occupied.complement()
        let front_squares = cx.pos.board.occupied.complement()
        let eyes_squares = cx.pos.board.occupied.complement()

        if (cx.records[x.back] !== undefined) {
            back_squares = SquareSet.fromSquare(cx.records[x.back])
        }
        if (cx.records[x.front] !== undefined) {
            front_squares = SquareSet.fromSquare(cx.records[x.front])
        }
        if (cx.records[x.eyes] !== undefined) {
            eyes_squares = SquareSet.fromSquare(cx.records[x.eyes])

            eyes_squares = attacks(eyes, cx.records[x.eyes], cx.pos.board.occupied)

        }

        for (let back_square of back_squares) {
            let front_squares2 = front_squares.intersect(attacks(back, back_square, cx.pos.board.occupied))

            for (let front_square of front_squares2) {


                for (let eye_square of eyes_squares) {


                    let p3 = cx.pos.clone()

                    p3.board.set(back_square, back)
                    p3.board.set(front_square, front)
                    p3.board.set(eye_square, eyes)

                    let bb = blocks(back, back_square, p3.board.occupied)

                    if (bb.length >= 2) {
                        if (bb[0].has(front_square) && bb[1].has(eye_square)) {

                            p3.board.take(eye_square)
                            ccx2.push({
                                records: {
                                    ...cx.records,
                                    [x.front]: front_square,
                                    [x.back]: back_square,
                                    [x.eyes]: eye_square,
                                },
                                pos: p3
                            })

                        }
                    }
                }


            }

        }


    }

    return ccx2
}

function move_records(records: Record<string, Square>, from: Square, to: Square) {

    let res: Record<string, Square> = {}

    for (let key of Object.keys(records)) {
        if (records[key] === from) {
            res[key] = to
        } else {
            res[key] = records[key]
        }
    }
    return res
}


function resolve_can_fork(x: CanForkSentence, ccx: Context[]) {

    let piece = parse_piece(x.piece)
    let forked = x.forked.map(parse_piece)

    let ccx2: Context[] = []

    let if_ms = []

    for (let cx of ccx) {

        let piece_squares = cx.pos.board.occupied.complement()

        if (cx.records[x.piece] !== undefined) {
            piece_squares = SquareSet.fromSquare(cx.records[x.piece])
        }

        let forked_squares = SquareSet.empty()

        for (let forked of x.forked) {
            forked_squares = forked_squares.set(cx.records[forked], true)
        }

        for (let piece_square of piece_squares) {

            let a1_squares = attacks(piece, piece_square, cx.pos.board.occupied)

            for (let a1_square of a1_squares) {
                let fork_squares = attacks(piece, a1_square, cx.pos.board.occupied)
                if (!fork_squares.supersetOf(forked_squares)) {
                    continue
                }


                let p3 = cx.pos.clone()

                p3.board.set(piece_square, piece)

                if_ms.push([piece_square, a1_square])

                ccx2.push({
                    records: {
                        ...cx.records,
                        [x.piece]: piece_square
                    },
                    pos: p3
                })


            }

        }

    }

    if (x.lines) {

        let ccx3: Context[] = []

        context: for (let i = 0; i < ccx2.length; i++) {
            let cx = ccx2[i]
            let [from, to] = if_ms[i]

            let p3 = cx.pos.clone()
            p3.play({
                from,
                to
            })


            let yes = true
            for (let line of x.lines) {
                let pp = [{ records: move_records(cx.records, from, to), pos: p3 }]

                for (let moves of line) {
                    let pp2 = []
                    for (let cxp3 of pp) {
                        //cx = { records: { ...cx.records, [x.piece]: to }, pos: cx.pos }
                        //cx = { records: move_records(cx.records, from, to), pos: cx.pos }
                        let cx = cxp3
                        let p3 = cxp3.pos

                        if (is_before(moves)) {
                            for (let [from, tos] of p3.allDests()) {
                                for (let to of tos) {


                                    let p4 = p3.clone()
                                    p4.play({
                                        from,
                                        to
                                    })
                                    pp2.push({ records: move_records(cx.records, from, to), pos: p4 })
                                }
                            }
                        }

                        if (is_moves(moves)) {
                            let moves_square = cx.records[moves.piece]
                            for (let mto of p3.dests(moves_square)) {
                                let p4 = p3.clone()
                                p4.play({
                                    from: moves_square,
                                    to: mto
                                })
                                let from = moves_square
                                let to = mto
                                pp2.push({ records: move_records(cx.records, from, to), pos: p4 })
                            }
                        }

                        if (is_takes(moves)) {

                            let takes = moves

                            let taken_square = cx.records[takes.taken]
                            let taker_square = cx.records[takes.taker]

                            for (let tto of p3.dests(taker_square).intersect(SquareSet.fromSquare(taken_square))) {
                                let p5 = p3.clone()
                                p5.play({
                                    from: taker_square,
                                    to: tto
                                })

                                if (takes.with_check === p5.isCheck()) {
                                    let from = taker_square
                                    let to = tto
                                    pp2.push({ records: move_records(cx.records, from, to), pos: p5 })
                                }
                            }

                        }
                    }
                    pp = pp2
                }

                if (pp.length === 0) {
                    yes = false
                    break
                }
            }

            if (yes) {
                ccx3.push(cx)
            }
        }


        return ccx3

    }

    return ccx2
}

function resolve_is_unprotected(x: IsUnprotectedSentence, ccx: Context[]) {
    let ccx2: Context[] = []

    let piece = parse_piece(x.piece)

    context: for (let cx of ccx) {

        let piece_square = cx.records[x.piece]

        for (let from of cx.pos.board.occupied) {
            let from_piece = cx.pos.board.get(from)!

            if (attacks(from_piece, from, cx.pos.board.occupied).has(piece_square)) {
                continue context
            }

        }
        ccx2.push(cx)

    }

    return ccx2
}

function resolve_are_aligned(x: AreAlignedSentence, ccx: Context[]) {
    let ccx2: Context[] = []

    let piece1 = parse_piece(x.piece1)
    let piece2 = parse_piece(x.piece2)

    for (let cx of ccx) {

        let piece1_squares = cx.pos.board.occupied.complement()

        if (cx.records[x.piece1] !== undefined) {
            piece1_squares = SquareSet.fromSquare(cx.records[x.piece1])
        }

        let piece2_squares = cx.pos.board.occupied.complement()

        if (cx.records[x.piece1] !== undefined) {
            piece2_squares = SquareSet.fromSquare(cx.records[x.piece2])
        }

        for (let piece1_square of piece1_squares) {

            if (x.rank) {
                if (!SquareSet.fromRank(x.rank).has(piece1_square)) {
                    continue
                }
            }

            for (let piece2_square of piece2_squares.intersect(attacks(piece1, piece1_square, cx.pos.board.occupied))) {

                if (x.rank) {
                    if (!SquareSet.fromRank(x.rank).has(piece2_square)) {
                        continue
                    }
                }



                let p3 = cx.pos.clone()

                p3.board.set(piece1_square, piece1)
                p3.board.set(piece2_square, piece2)

                ccx2.push({
                    records: {
                        ...cx.records,
                        [x.piece1]: piece1_square,
                        [x.piece2]: piece2_square
                    },
                    pos: p3
                })


            }
        }
    }

    return ccx2
}

export function mor1(text: string) {

    let conds = text.trim().split('\n').filter(_ => !_.startsWith(':'))

    let xx = conds.map(line => {
        let a = new Parser(new Lexer(line)).parse_sentence()
        return a
    })


    let ccx: Context[] = []


    let k1_squares = SquareSet.full()
    k1_squares = k1_squares.intersect(SquareSet.backrank('black'))
    //k1_squares = SquareSet.fromSquare(parseSquare('g8'))

    let k1 = parse_piece('king')
    let k2 = parse_piece('King')

    for (let k1_square of k1_squares) {
        let pos = Chess.fromSetupUnchecked(parseFen(EMPTY_FEN).unwrap())
        pos.board.set(k1_square, k1)
        let k2_squares = SquareSet.full().diff(attacks(k1, k1_square, pos.board.occupied))
        k2_squares = k2_squares.intersect(SquareSet.backrank('white'))
        k2_squares = k2_squares.set(k1_square, false)
        k2_squares = SquareSet.fromSquare(parseSquare('g1'))

        for (let k2_square of k2_squares) {
            let p2 = pos.clone()
            p2.board.set(k2_square, k2)
            ccx.push({
                records: {
                    'king': k1_square,
                    'King': k2_square
                },
                pos: p2
            })
        }
    }


    for (let x of xx) {
        if (ccx.length > 20000) {
            //ccx = ccx.slice(10000, 20000)
        }
        if (is_blocks_alignment(x)) {
            ccx = resolve_blocks_alignment(x, ccx)
        } else if (is_protected_by(x)) {
            ccx = resolve_protected_by(x, ccx)
        } else if (is_battery_eyes_protected_by(x)) {
            ccx = resolve_battery_eyes_protected_by(x, ccx)
        } else if (is_can_fork(x)) {
            ccx = resolve_can_fork(x, ccx)
        } else if (is_unprotected(x)) {
            ccx = resolve_is_unprotected(x, ccx)
        } else if (is_are_aligned(x)) {
            ccx = resolve_are_aligned(x, ccx)
        } else {
            ccx = resolve_battery_eyes(x, ccx)
        }


        ccx = filter_not_mates(ccx)
    }

    let res = ccx.map(_ => makeFen(_.pos.toSetup()))

    /*
    console.log(res)
    console.log(res.includes("2q3k1/2b5/7n/8/2N5/1B6/2Q5/6K1 w - - 0 1"))
    console.log(res.includes("6k1/2q1b3/5n2/8/8/2N5/2Q5/1B4K1 w - - 0 1"))
    console.log(res.includes("5k2/8/4n3/7b/8/2QN3q/1B6/B5K1 w - - 0 1"))
    console.log(res.includes("1k6/8/n7/4q3/8/6B1/1N3Q2/Q5K1 w - - 0 1"))
    return ''
    */

    return res
}


function filter_not_mates(ccx: Context[]) {
    let ccx2: Context[] = []

    for (let cx of ccx) {
        if (cx.pos.isCheckmate()) {
            continue
        }
        if (cx.pos.turn === 'white' && cx.pos.isCheck()) {
            continue
        }
        if (cx.pos.validate().isErr) {
            continue
        }
        ccx2.push(cx)
    }

    return ccx2
}
import { BISHOP, KING, KNIGHT, NO_PIECE, PAWN, PieceTypeC, QUEEN, ROOK } from "../distill/hopefox_c"

export function parse_program2(program: string): Program {

    let aa: Program = []

    for (let lines of program.split('\n\n')) {
        let res = []
        for (let line of lines.trim().split('\n')) {
            res.push(parse_line(line))
        }
        aa.push(res)
    }

    return aa
}

function parse_line(line: string): Line {
    let tokens = line.split(' ')

    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i + 1] === 'skewers') {
            let [a] = parse_piece(tokens, i)
            let [b, next_i] = parse_piece(tokens, i + 2)
            let [c] = parse_piece(tokens, next_i + 1)
            return {
                type: 'skewers',
                a,
                b,
                c
            }
        }

        if (tokens[i + 1] === 'escapes') {
            let [a] = parse_piece(tokens, i)
            return {
                type: 'escapes',
                a
            }
        }

        if (tokens[i + 1] === 'captures') {
            let [a] = parse_piece(tokens, i)
            let [b] = parse_piece(tokens, i + 2)
            return {
                type: 'captures',
                a,
                b
            }
        }
        if (tokens[i + 1] === 'recaptures') {
            let [a] = parse_piece(tokens, i)
            return {
                type: 'recaptures',
                a
            }
        }

        if (tokens[i + 1] === 'pins') {
            let [a] = parse_piece(tokens, i)
            let [b, next_i] = parse_piece(tokens, i + 2)
            // to
            let [c] = parse_piece(tokens, next_i + 1)
            return {
                type: 'pins',
                a,
                b,
                c
            }
        }

        if (tokens[i] === 'check') {
            let [a] = parse_piece(tokens, i + 2)
            return {
                type: 'check',
                a
            }
        }
        if (tokens[i + 1] === 'blocks') {
            let [a] = parse_piece(tokens, i)
            return {
                type: 'blocks',
                a
           }
        }
        if (tokens[i] === 'sacrifice') {
            let [a, next_i] = parse_piece(tokens, i + 1)
            return {
                type: 'sacrifice',
                a
            }
        }
        if (tokens[i + 1] === 'with_check') {
            return {
                type: 'with_check'
            }
        }

    }
    throw 'Parser error'
}

function parse_piece(tokens: string[], i: number): [PieceProp, number] {
    let hanging = false
    if (tokens[i] === 'hanging') {
        hanging = true
        i++
    }
    return [{
        hanging,
        a: parse_piece_type(tokens[i])
    }, i+1]
}

function parse_piece_type(type: string): PieceTypeC {
    switch (type) {
        case 'rook': return ROOK
        case 'knight': return KNIGHT
        case 'bishop': return BISHOP
        case 'queen': return QUEEN
        case 'king': return KING
        case 'pawn': return PAWN
    }
    return NO_PIECE
}

type PieceProp = {
    a: PieceTypeC
    hanging: boolean
}

export type Skewers = {
    type: 'skewers'
    a: PieceProp
    b: PieceProp
    c: PieceProp
}

type Escapes = {
    type: 'escapes'
    a: PieceProp
}


type Captures = {
    type: 'captures'
    a: PieceProp
    b: PieceProp
}

type Recaptures = {
    type: 'recaptures'
    a: PieceProp
}

type Pins = {
    type: 'pins'
    a: PieceProp
    b: PieceProp
    c: PieceProp
}


type Check = {
    type: 'check'
    a: PieceProp
}


type Blocks = {
    type: 'blocks'
    a: PieceProp
}

type Sacrifice = {
    type: 'sacrifice'
    a: PieceProp
}

type WithCheck = {
    type: 'with_check'
}

type DeflectsToHang = {
    type: 'deflects'
    a: PieceProp
    b: PieceProp
}

export type Line = Skewers | Escapes | Captures | Recaptures | Pins | Check | Blocks | Sacrifice | WithCheck | DeflectsToHang

export type Lines = Line[]

export type Program = Lines[]
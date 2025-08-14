import { attacks } from "../attacks";
import { type FEN, type Pieces } from "../mor3_hope1";
import { SquareSet } from "../squareSet";
import { Color, Piece, Role, Square } from "../types";
import { squareFromCoords } from "../util";

type SContext = Record<Pieces, Square>

export function mor_short(fen: FEN) {

    let cx =  fen_to_scontext(fen)

    return s_attack_pieces(cx)
}

export function print_a_piece(a: AttackPiece) {

    const attacks_str = (s: Pieces) => `+${s}`
    const attacked_by_str = (s: Pieces) => `${s}+`
    const blocks_str = (s: [Pieces, Pieces]) => `${s[0]}+|${s[1]}`
    const blocked_attacks_str = (s: [Pieces, Pieces]) => `+${s[0]}/${s[1]}`
    const blocked_attacked_by_str = (s: [Pieces, Pieces]) => `${s[0]}+/${s[1]}`

    let p1 = a.p1

    let zero_attacked_by_lower = !a.attacked_by.find(_ => _.toLowerCase() === _)
        && !a.blocked_attacked_by.find(_ => _[0].toLowerCase() === _[0])
        && !a.blocks.find(_ => _[0].toLowerCase() === _[0])
    let zero_attacked_by_upper = !a.attacked_by.find(_ => _.toLowerCase() !== _) 
        && !a.blocked_attacked_by.find(_ => _[0].toLowerCase() !== _[0])
        && !a.blocks.find(_ => _[0].toLowerCase() !== _[0])

    let attacks = a.attacks.map(attacks_str).join(' ')
    let attacked_by = a.attacked_by.map(attacked_by_str).join(' ')
    let blocks = a.blocks.map(blocks_str).join(' ')
    let blocked_attacks = a.blocked_attacks.map(blocked_attacks_str).join(' ')
    let blocked_attacked_by = a.blocked_attacked_by.map(blocked_attacked_by_str).join(' ')

    let res = [p1]

    if (zero_attacked_by_lower) {
        res.push('z+')
    }
    if (zero_attacked_by_upper) {
        res.push('Z+')
    }

    if (attacks !== '') {
        res.push(attacks)
    }

    if (attacked_by !== '') {
        res.push(attacked_by)
    }

    if (blocks !== '') {
        res.push(blocks)
    }

    if (blocked_attacks !== '') {
        res.push(blocked_attacks)
    }

    if (blocked_attacked_by !== '') {
        res.push(blocked_attacked_by)
    }



    return res.join(' ')
}

type AttackLine = [Pieces, Pieces] | [Pieces, Pieces, Pieces]

type AttackPiece = {
    p1: Pieces
    attacks: Pieces[]
    attacked_by: Pieces[]
    blocks: [Pieces, Pieces][]
    blocked_attacks: [Pieces, Pieces][]
    blocked_attacked_by: [Pieces, Pieces][]
}

function s_attack_pieces(s: SContext) {
    let res: AttackPiece[] = []
    let lines = s_attacks(s)

    for (let p1 of Object.keys(s)) {
        let attacks = []
        let attacked_by = []
        let blocks: [Pieces, Pieces][] = []
        let blocked_attacks: [Pieces, Pieces][] = []
        let blocked_attacked_by: [Pieces, Pieces][] = []


        for (let line of lines) {
            if (line[0] === p1) {
                if (line.length === 2) {
                    attacks.push(line[1])
                } else {
                    blocked_attacks.push([line[1], line[2]])
                }
            } else if (line[1] === p1) {
                if (line.length === 2) {
                    attacked_by.push(line[0])
                } else {
                    blocks.push([line[0], line[2]])
                }
            } else if (line[2] === p1) {
                blocked_attacked_by.push([line[0], line[1]])
            }
        }
        res.push({
            p1,
            attacks,
            attacked_by,
            blocks,
            blocked_attacks,
            blocked_attacked_by
        })
    }

    return res
}

function s_attacks(s: SContext) {
    let res: AttackLine[] = []
    let occupied = s_occupied(s)

    for (let piece1 of Object.keys(s)) {
        let p1 = parse_piece(piece1)
        let sq = s[piece1]

        let attacks1 = attacks(p1, sq, occupied)
        for (let a1 of attacks1) {
            for (let piece2 of Object.keys(s)) {
                if (s[piece2] === a1) {
                    let sq2 = s[piece2]

                    let occupied2 = occupied.without(sq2)

                    let attacks2 = attacks(p1, sq, occupied2).diff(attacks1)

                    let i_piece
                    for (let a2 of attacks2) {
                        for (let piece3 of Object.keys(s)) {
                            if (s[piece3] === a2) {
                                let sq3 = s[piece3]
                                i_piece = piece3
                            }
                        }
                    }

                    if (i_piece !== undefined) {
                        res.push([piece1, piece2, i_piece])
                    } else {
                        res.push([piece1, piece2])
                    }
                }
            }
        }
    }

    return res
}

function s_occupied(s: SContext) {
    let res = SquareSet.empty()

    for (let key of Object.keys(s)) {
        res = res.set(s[key], true)
    }
    return res
}

function fen_to_scontext(fen: FEN) {
    fen = fen.split(' ')[0]

    let res: SContext = {}
    let rank = 7
    for (let line of fen.split('/')) {
        let file = 0
        for (let ch of line) {
            if (is_pieces(ch)) {
            let p1 = parse_piece(ch)

            let sq = squareFromCoords(file, rank)
            if (sq !== undefined) {

                let chi = ch
                let i = 2
                while (res[chi] !== undefined) {
                    chi = ch + i
                    i++
                }
                res[chi] = sq
            }
            file+= 1
            } else {
                file += parseInt(ch)
                continue
            }
        }
        rank -= 1
    }
    return res
}

const pieces_to_role: Record<string, Role> = {
    'r': 'rook',
    'n': 'knight',
    'b': 'bishop',
    'p': 'pawn',
    'q': 'queen',
    'k': 'king',
}

function is_pieces(pieces: string): pieces is Pieces {
    return pieces_to_role[pieces.toLowerCase()] !== undefined
}

export function parse_piece(pieces: Pieces): Piece {
    const color_pieces = (p: Pieces): Color => p.toLowerCase() === p ? 'black': 'white'

    let color = color_pieces(pieces)
    let role = pieces_to_role[pieces.toLowerCase()
        .replace(/[2345678]/, '')
    ]

    return {
        color,
        role
    }
}


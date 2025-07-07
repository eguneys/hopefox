import fs from 'fs'
import { Chess, parseUci } from '../src'
import { makeFen, parseFen } from '../src/fen'
import { makeSan } from '../src/san'

export const a_hundred = parse_puzzles(fs.readFileSync('data/a_hundred_puzzles.csv').toString())

export const puzzles = parse_puzzles(fs.readFileSync('data/athousand_sorted.csv').toString())

export const tenk = parse_puzzles(fs.readFileSync('data/tenk_puzzle.csv').toString())

function parse_puzzles(str: string): Puzzle[] {
    return str.trim().split('\n').map(_ => {

        let [id, fen, moves, _a, _b, _c, _d, tags] = _.split(',')

        let sans: string[] = []
        let move_fens: string[] = []

        let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()

        moves.split(' ').forEach((uci, i) => {
            let move = parseUci(uci)!
            if (i > 0) sans.push(makeSan(pos, move))
            pos.play(move)

            move_fens.push(makeFen(pos.toSetup()))
        })

        let link = `https://lichess.org/training/${id}`

        return {
            id, link, fen, moves, tags, move_fens, sans
        }
    })
}

export type Puzzle = {
    id: string,
    link: string,
    fen: string,
    moves: string,
    sans: string[],
    move_fens: string[],
    tags: string
}
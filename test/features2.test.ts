import { it } from 'vitest'
import { Adventure, Adventure2, Backrank1, Backrank2, Backrank3, Backrank5, Backranks, Bind, CapturesComb, CapturesKingRunsForks, ChecksCapturesMateLong, Chess, Exchange, ExchangeAndGobble, fen_pos, ForksNewWay, Liquidation, MateIn1, Move, opposite, PinAndWin, play_and_sans, Position, RookMate, SAN, TacticalFind, TacticalFind2 } from '../src'
import { puzzles } from './fixture'


it('works', () => {

    let fen = "r1b1kb1r/pp5p/2pp1q1p/1B1Qp3/4P3/2N5/PPP2PPP/R3K2R w KQkq - 0 11"

    let pos = fen_pos(fen)
    let res = Adventure(pos).map(_ => play_and_sans(_, pos).join(' '))

    console.log(res)
})


it('puzzles 0', () => {
    let link = puzzles[0].link
    let fen = puzzles[0].move_fens[0]

    let pos = fen_pos(fen)

    let res = Backrank1(pos).map(_ => play_and_sans(_, pos).join(' '))
    console.log(res)
})


it('puzzles 1', () => {
    let link = puzzles[1].link
    let fen = puzzles[1].move_fens[0]

    let pos = fen_pos(fen)

    let res = RookMate(pos).map(_ => play_and_sans(_, pos).join(' '))
    console.log(res)
})


it('puzzles 3', () => {
    let link = puzzles[3].link
    let fen = puzzles[3].move_fens[0]

    let pos = fen_pos(fen)

    let res = Backrank2(pos).map(_ => play_and_sans(_, pos).join(' '))
    console.log(link)
    console.log(res)
})

it('puzzles 4', () => {
    let link = puzzles[4].link
    let fen = puzzles[4].move_fens[0]

    let pos = fen_pos(fen)

    let res = TacticalFind(pos).map(_ => play_and_sans(_, pos).join(' '))
    console.log(link)
    console.log(res)
})

it('puzzles 5', () => {
    let link = puzzles[5].link
    let fen = puzzles[5].move_fens[0]

    let pos = fen_pos(fen)

    //let res = TacticalFind(pos).map(_ => play_and_sans(_, pos).join(' '))
    let res = TacticalFind(pos).map(_ => play_and_sans(_, pos).join(' '))
    console.log(link)
    console.log(res)
})


it.skip('puzzles 12', () => {
    let link = puzzles[12].link
    let fen = puzzles[12].move_fens[0]

    let pos = fen_pos(fen)

    //let res = TacticalFind(pos).map(_ => play_and_sans(_, pos).join(' '))
    //let res = Adventure2(pos).map(_ => play_and_sans(_, pos).join(' '))
    let res = Liquidation(pos).map(_ => play_and_sans(_, pos).join(' '))
    console.log(link)
    console.log(res)
})


it('puzzles 35', () => {
    let link = puzzles[56].link
    let fen = puzzles[56].move_fens[0]

    let pos = fen_pos(fen)

    let res = ChecksCapturesMateLong(pos).map(_ => play_and_sans(_, pos).join(' '))
    console.log(link)
    console.log(res)
})

it.only('puzzles 88', () => {

    let res = TacticalFindSans2(88)
    console.log(res)
})




let skips = ['00MWz', '00Rlv', '008tL', '01Cds', '01TeF', '00Aae', '00QCD']
skips.push('00k6k') // And
skips.push('00rzv') // Mating

skips.push(...['00tdc', '00xmm']) // Pin
skips.push(...['00KMV']) // Skewer

skips.push(...['00sO1']) // discover

skips.push(...['00WcO']) // fork

skips.push(...['01G6T']) // capture order

it.only('puzzles n', () => {
    for (let i = 0; i < 160; i++) {
        let res = TacticalFindSans2(i)
        if (!res) {
            break
        }
    }
})

function TacticalFindSans2(n: number) {
    let link = puzzles[n].link
    let fen = puzzles[n].move_fens[0]

    if (puzzles[n].tags.includes('endgame')) {
        return true
    }
    if (skips.includes(puzzles[n].id)) {
        return true
    }

    let pos = fen_pos(fen)

    let res = 
        Min_max_sort(pos, TacticalFind2(pos))
            .map(_ => play_and_sans(_, pos))
           
    let a = find_solving_sans(res, puzzles[n].sans)

    if (!a) {
        console.log(n)
        console.log(link)
        console.log(puzzles[n].sans, '\nexpected but found\n', res)
        return false
    }
    return true
}

function TacticalFindSansLoose2(n: number) {
    let link = puzzles[n].link
    let fen = puzzles[n].move_fens[0]

    if (puzzles[n].tags.includes('endgame')) {
        return true
    }
    if (skips.includes(puzzles[n].id)) {
        return true
    }

    let pos = fen_pos(fen)

    let res = TacticalFind2(pos).map(_ => play_and_sans(_, pos))
    let a = res.find(_ => _.join(' ').startsWith(puzzles[n].sans.join(' ')))
    if (!a) {
        console.log(n)
        console.log(link)
        console.log(puzzles[n].sans, '\nexpected but found\n', res.slice(0, 3))
        return false
    }
    return true
}



function TacticalFindSansLoose(n: number) {
    let link = puzzles[n].link
    let fen = puzzles[n].move_fens[0]

    if (puzzles[n].tags.includes('endgame')) {
        return true
    }
    if (skips.includes(puzzles[n].id)) {
        return true
    }

    let pos = fen_pos(fen)

    let res = TacticalFind(pos).map(_ => play_and_sans(_, pos))
    let a = res.find(_ => _.join(' ').startsWith(puzzles[n].sans.join(' ')))
    if (!a) {
        console.log(n)
        console.log(link)
        console.log(puzzles[n].sans, '\nexpected but found\n', res)
        return false
    }
    return true
}

function TacticalFindSans(n: number) {
    let link = puzzles[n].link
    let fen = puzzles[n].move_fens[0]

    if (puzzles[n].tags.includes('endgame')) {
        return true
    }
    if (skips.includes(puzzles[n].id)) {
        return true
    }

    let pos = fen_pos(fen)

    let res = TacticalFind(pos).map(_ => play_and_sans(_, pos))
    let a = find_solving_sans(res, puzzles[n].sans)

    if (!a) {
        console.log(n)
        console.log(link)
        console.log(puzzles[n].sans, '\nexpected but found\n', res)
        return false
    }
    return true
}


/*
   Rxf7+ Kg8 Rxd7
   Rxf7 + Ke8 Rxd7
   Rf2 Nexf2 Qh8
*/
const find_solving_sans = (a: SAN[][], b: SAN[]) => {
    if (a.length === 0) {
        return false
    }
    if (a[0].length < b.length) {
        return false
    }
    if (b.length === 0) {
        return true
    }
    let head = a[0][0]

    if (head !== b[0]) {
        return false
    }

    if (b.length === 1) {
        return true
    }

    a = a.filter(_ => _[0] === head)

    a = a.filter(_ => _[1] === b[1])


    if (!find_solving_sans(a.map(_ => _.slice(2)), b.slice(2))) {
        return false
    }

    return true
}


type Node = {
    data: Move
    value: number
    children: Node[]
}

function move_equals(a: Move, b: Move) {
    return a.to === b.to && a.from == b.from && a.promotion === b.promotion
}

function pos_eval(pos: Position, path: Move[]) {
    let p = pos.clone()
    for (let m of path) {
        p.play(m)
    }
    if (p.isCheckmate()) {
        return 1000
    }
    return p.board.pieces(pos.turn, 'queen').size() * 9 +
        p.board.pieces(pos.turn, 'rook').size() * 5 +
        p.board.pieces(pos.turn, 'bishop').size() * 3.2 +
        p.board.pieces(pos.turn, 'knight').size() * 3 +
        p.board.pieces(pos.turn, 'pawn').size() * 1 +

        -p.board.pieces(opposite(pos.turn), 'queen').size() * 9 +
        -p.board.pieces(opposite(pos.turn), 'rook').size() * 5 +
        -p.board.pieces(opposite(pos.turn), 'bishop').size() * 3.2 +
        -p.board.pieces(opposite(pos.turn), 'knight').size() * 3 +
        -p.board.pieces(opposite(pos.turn), 'pawn').size() * 1



}

function make_node(pos: Position, root: Node[], moves: Move[]) {

    let path: Move[] = []
    for (let m of moves) {
        path.push(m)
        let res = root.find(_ => move_equals(_.data, m))
        if (!res) {
            let children: Node[] = []
            root.push({ data: m, children, value: pos_eval(pos, path) })
            root = children
        } else {
            root = res.children
        }
    }
    return root
}


function Min_max_sort(pos: Position, aa: Move[][]) {
    let root: Node[] = []
    aa.forEach(a => make_node(pos, root, a))

    return BestMovesMinMax(pos, root)
}


function BestMovesMinMax(pos: Position, root: Node[]) {

    for (let c of root) {
        fill_values_min_max(pos, [], c, true)
    }

    root.sort((a, b) => b.value - a.value)

    
    return root.flatMap(_ => allPaths(_)).map(_ => _.map(_ => _.data))
}


function allPaths(node: Node): Node[][] {
    if (!node.children || node.children.length === 0) {
        // Leaf node: return path containing just this node
        return [[node]];
    }
    
    const paths: Node[][] = [];
    for (const child of node.children) {
        const childPaths = allPaths(child);
        for (const path of childPaths) {
            // Prepend current node to each child path
            paths.push([node, ...path]);
        }
    }
    return paths;
}


function fill_values_min_max(pos: Position, path: Move[], a: Node, isMaximizing: boolean) {

    if (a.children.length === 0) {
        a.value = pos_eval(pos, [...path, a.data])
        return
    }

    for (let c of a.children) {
        fill_values_min_max(pos, [...path, a.data], c, !isMaximizing)
    }

    if (isMaximizing) {
        a.children.sort((a, b) => a.value - b.value)
        a.value = Math.min(...a.children.map(_ => _.value))
    } else {
        a.children.sort((a, b) => b.value - a.value)
        a.value = Math.max(...a.children.map(_ => _.value))
    }
}
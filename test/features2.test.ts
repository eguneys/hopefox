import { describe, it } from 'vitest'
import { Bind, CaptureForkCapture, CapturesComb, CapturesKingRunsForks, ChecksCapturesMateLong, Chess, Either, Exchange, fen_pos, MateIn1, Move, opposite, play_and_sans, Position, SAN, TacticalFind2 } from '../src'
import { puzzles } from './fixture'

describe.skip(() => {
it.only('puzzles 126', () => {

    let res = TacticalFindSans2(126,
        true,

        Either([
            Bind([CapturesComb, CapturesComb, CapturesComb]),
            Bind([CapturesComb, CapturesComb, CapturesComb, CapturesComb]),
        ])

    )
    console.log(res)
})



it.only('skipped puzzles n', () => {
    let nb = 300
    let l =0
    for (let i = 0; i < nb; i++) {
        let res = TacticalFindSans2(i, true)
        if (res === 1) {
            l++
        }
        if (!res) {
            break
        }
    }
    console.log(`${l}/${nb}`)
})




it.skip('puzzles n', () => {
    let nb = 300
    let l =0
    for (let i = 0; i < nb; i++) {
        let res = TacticalFindSans2(i)
        if (res === 1) {
            l++
        }
        if (!res) {
            break
        }
    }
    console.log(`${l}/${nb}`)
})


let skips = ['013ze'] // matein1

skips.push(...['00MWz', '00Rlv', '008tL', '01Cds', '01TeF', '00Aae', '00QCD'])
skips.push('00k6k') // And
skips.push('00rzv') // Mating

skips.push(...['00tdc', '00xmm', '00o9U', '00WnZ', '01TwJ']) // Pin
skips.push(...['00KMV', '00ICz', '003eP']) // Skewer

skips.push(...['00sO1', '00bWA', '00gSv', '00DTg']) // discover

skips.push(...['00WcO', '003jH', '00jPH']) // fork

skips.push(...['01G6T']) // capture order
skips.push(...['00puq', '01UXl', '00byq', '01VBW', '00Aas']) // long

skips.push(...['010hY', '01KDp']) // short look first

skips.push(...['00PGi']) // smothered mate

skips.push(...['01Bmi', '00ZWf', '01Lo7']) // trap

skips.push(...['013JE']) // defense


skips.push(...['01GCT', '00kZF']) // tricky interpose

skips.push(...['003r5']) // need chill move

function TacticalFindSans2(n: number, skips_only = false, Fn = TacticalFind2) {
    let link = puzzles[n].link
    let fen = puzzles[n].move_fens[0]

    if (puzzles[n].tags.includes('endgame') || puzzles[n].tags.includes('promotion')) {
        return true
    }

    if (skips_only !== skips.includes(puzzles[n].id)) {
        return true
    }

    let pos = fen_pos(fen)

    let res = 
        Min_max_sort(pos, Fn(pos))
            .map(_ => play_and_sans(_, pos))
           
    let a = find_solving_sans(res, puzzles[n].sans)

    if (!a) {
        console.log(n)
        console.log(link)
        console.log(puzzles[n].sans, '\nexpected but found\n', res.slice(0))
        return false
    }
    return 1
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

/*
   Rxf7+ Kg8 Rxd7
   Rxf7 + Ke8 Rxd7
   Rf2 Nexf2 Qh8
*/
const find_solving_sans = (a: SAN[][], b: SAN[]) => {
    if (a.length === 0) {
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


function print_node(n: Node, depth: number): string {
    let res = ''
    let ind = " ".repeat(depth + 1)

    let m = n.data

    res += " " + n.data.from + " <" + ("?") + ">" + "\n"

    let children = n.children.map((c, i) => {
        if (i === n.children.length - 1) {
            res += ind + "└─"
        } else if (i === 0) {
            res += ind + "├─"
        } else {
            res += ind + "│ "
        }
        res += print_node(c, depth + 1)
    }).join('')

    return res
}



function Min_max_sort(pos: Position, aa: Move[][]) {
    let root: Node[] = []
    aa.forEach(a => make_node(pos, root, a))

    //console.log(print_node(root[0], 0))

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
})
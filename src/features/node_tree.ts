import { Position } from "../chess"
import { Move } from "../types"
import { opposite } from "../util"

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

export function Min_max_sort(pos: Position, aa: Move[][]) {
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
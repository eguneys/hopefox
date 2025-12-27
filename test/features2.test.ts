import { it } from 'vitest'
import { Adventure, Adventure2, Backrank1, Backrank2, Backrank3, Backrank5, Backranks, CapturesKingRunsForks, ChecksCapturesMateLong, Chess, Exchange, ExchangeAndGobble, fen_pos, ForksNewWay, Liquidation, MateIn1, Move, opposite, PinAndWin, play_and_sans, Position, RookMate, SAN, TacticalFind, TacticalFind2 } from '../src'
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

it.only('puzzles 11', () => {

    let res = TacticalFindSans2(11)
    console.log(res)
})




let skips = ['00MWz', '00Rlv', '008tL', '01Cds', '01TeF', '00Aae', '00QCD']
skips.push('00k6k') // And
skips.push('00rzv') // Mating

skips.push(...['00tdc', '00xmm']) // Pin
skips.push(...['00KMV']) // Skewer

it.only('puzzles n', () => {
    for (let i = 0; i < 160; i++) {
        let res = TacticalFindSans2(i)
        if (!res) {
            break
        }
    }
})

type Node = {
    data: Move
    value: number
    children: Node[]
}

/**
 * Finds the optimal paths (sequences of moves) based on the Minimax algorithm.
 * Assumes the first level (root array) is the Maximizer's turn.
 */
function BestMovesMinMax(roots: Node[]): Move[][] {
    if (roots.length === 0) return [];

    // 1. Helper to get the Minimax value of a node
    function getMinimaxValue(node: Node, isMaximizing: boolean): number {
        if (node.children.length === 0) {
            return node.value ?? 0;
        }

        if (isMaximizing) {
            let bestVal = -Infinity;
            for (const child of node.children) {
                bestVal = Math.max(bestVal, getMinimaxValue(child, false));
            }
            return bestVal;
        } else {
            let bestVal = Infinity;
            for (const child of node.children) {
                bestVal = Math.min(bestVal, getMinimaxValue(child, true));
            }
            return bestVal;
        }
    }

    // 2. Helper to collect all paths that reach the target value
    function findPaths(node: Node, targetValue: number, isMaximizing: boolean, currentPath: Move[]): Move[][] {
        const newPath = [...currentPath, node.data];

        // Base case: Leaf node
        if (node.children.length === 0) {
            return (node.value === targetValue) ? [newPath] : [];
        }

        let paths: Move[][] = [];
        for (const child of node.children) {
            // Only follow branches that match the minimax value for this level
            if (getMinimaxValue(child, !isMaximizing) === targetValue) {
                paths.push(...findPaths(child, targetValue, !isMaximizing, newPath));
            }
        }
        return paths;
    }

    // Determine the best achievable value from the starting options
    const bestStartingValue = Math.max(...roots.map(n => getMinimaxValue(n, false)));

    // Collect all paths that result in that best value
    let allOptimalPaths: Move[][] = [];
    for (const rootNode of roots) {
        if (getMinimaxValue(rootNode, false) === bestStartingValue) {
            allOptimalPaths.push(...findPaths(rootNode, bestStartingValue, false, []));
        }
    }

    return allOptimalPaths;
}

type ScoredPath = {
    score: number;
    path: Move[];
};

function RankedMovesMinMax(roots: Node[]): ScoredPath[] {
    if (roots.length === 0) return [];

    // 1. Same Minimax value calculator as before
    function getMinimaxValue(node: Node, isMaximizing: boolean): number {
        if (node.children.length === 0) return node.value ?? 0;

        if (isMaximizing) {
            let bestVal = -Infinity;
            for (const child of node.children) {
                bestVal = Math.max(bestVal, getMinimaxValue(child, false));
            }
            return bestVal;
        } else {
            let bestVal = Infinity;
            for (const child of node.children) {
                bestVal = Math.min(bestVal, getMinimaxValue(child, true));
            }
            return bestVal;
        }
    }

    // 2. Finds the single best path starting from a specific node
    function findBestPath(node: Node, targetValue: number, isMaximizing: boolean): Move[] {
        let path = [node.data];
        if (node.children.length === 0) return path;

        for (const child of node.children) {
            // Follow the branch that maintains the target Minimax value
            if (getMinimaxValue(child, !isMaximizing) === targetValue) {
                return path.concat(findBestPath(child, targetValue, !isMaximizing));
            }
        }
        return path;
    }

    // 3. Map every root option to its Minimax score and best resulting path
    const results: ScoredPath[] = roots.map(rootNode => {
        const score = getMinimaxValue(rootNode, false); // Opponent's turn next
        return {
            score: score,
            path: findBestPath(rootNode, score, false)
        };
    });

    // 4. Sort by score (Descending: Best moves first)
    return results.sort((a, b) => b.score - a.score);
}

function AllMovesMinMax(roots: Node[]): ScoredPath[] {
    
    // 1. Calculate the Minimax value for a node (the "best" it can do)
    function getMinimaxValue(node: Node, isMaximizing: boolean): number {
        if (node.children.length === 0) return node.value ?? 0;

        let values = node.children.map(child => getMinimaxValue(child, !isMaximizing));
        return isMaximizing ? Math.max(...values) : Math.min(...values);
    }

    // Determine the overall best value achievable from the start
    const overallBest = Math.max(...roots.map(n => getMinimaxValue(n, false)));

    // 2. Recursively find every single path from a node to its leaves
    function collectAllPaths(node: Node, currentPath: Move[]): ScoredPath[] {
        const newPath = [...currentPath, node.data];

        // Base case: it's a leaf
        if (node.children.length === 0) {
            return [{
                path: newPath,
                score: node.value ?? 0,
            }];
        }

        // Recursive case: collect paths from all children
        let paths: ScoredPath[] = [];
        for (const child of node.children) {
            paths.push(...collectAllPaths(child, newPath));
        }
        return paths;
    }

    // 3. Flatten the tree starting from all root options
    let allPaths: ScoredPath[] = [];
    for (const root of roots) {
        allPaths.push(...collectAllPaths(root, []));
    }

    // 4. Sort all paths by score (Highest score first)
    return allPaths.sort((a, b) => b.score - a.score);
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


    //return BestMovesMinMax(root)
    //return RankedMovesMinMax(root).map(_ => _.path)
    return AllMovesMinMax(root).map(_ => _.path)
}


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
    //let res = ChecksCheckMate(pos).map(_ => play_and_sans(_, pos))

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

    a = a.filter(_ => _[0] === head)

    a = a.filter(_ => _[1] === b[1])


    if (!find_solving_sans(a.map(_ => _.slice(2)), b.slice(2))) {
        return false
    }

    return true
}
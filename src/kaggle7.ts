import { listeners } from "process"
import { Hopefox } from "./hopefox_helper"
import { Move, Square } from "./types"

type Line = {
    depth: number,
    rule: string,
    children: Line[],
    m?: HMoves
}

function parse_rules(str: string) {
    let ss = str.trim().split('\n')

    let root = { depth: -1, rule: '', children: [] }
    const stack: Line[] = [root]

    for (let i = 0; i < ss.length; i++) {
        let line = ss[i]
        const rule = line.trim()
        if (!rule) continue

        const depth = line.search(/\S/)

        let node: Line  = { depth, rule, children: [] }

        while (stack.length > depth + 1) {
            stack.pop()
        }

        stack[stack.length - 1].children.push(node)
        stack.push(node)
    }
    return root
}

type HMoves = {
    h: Hopefox,
    moves: Move[]
}

type Context = Record<string, Square>[]

function h_moves_recurse(node: Line, h: Hopefox, cx: Context) {


    let moves: Move[] = []

    node.m = {
        h, moves
    }

    for (let child of node.children) {
        h_moves_recurse(child, h, cx)
    }


}

/*

id_08OfC

r =P
K =P
Q =B
b =B +K
 *b =R +K
 Q =b
  r =P
   *r =h1 #
   K =r
    n =R +K +Q
   Q =n
    n' =Q
     K =r
      n' =R
*/
export function find_san7(fen: string, rules: string) {

    let h = Hopefox.from_fen(fen)
    let root = parse_rules(rules)

    let cx: Context = []

    for (let child of root.children) {
        h_moves_recurse(child, h, cx)
    }

    return root
}
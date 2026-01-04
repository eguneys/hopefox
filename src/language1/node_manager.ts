import { MoveC } from "../hopefox_c"

export type NodeId = number

class NoChildError extends Error {
    constructor(id: NodeId) {
        super(`No child with id ${id}`)
    }
}

class NodeCache {
    private cache: Map<NodeId, Node>

    constructor() {
        this.cache = new Map()
    }

    get_node(id: NodeId): Node | undefined {
        return this.cache.get(id)
    }

    add_node(node: Node) {
        this.cache.set(node.id, node)
    }
}

class NodeRoot {
    children: Node[]

    constructor() {
        this.children = []
    }

    add_move(move: MoveC) {
        let child: Node = new Node(this, move)

        this.children.push(child)

        return child
    }
}

class Node {

    private static gen_node_id = (() => {
        let id = 1
        return () => id++
    })()

    id: NodeId
    parent: Node | NodeRoot
    move: MoveC
    children: Node[]

    constructor(parent: Node | NodeRoot, move: MoveC) {
        this.id = Node.gen_node_id()
        this.parent = parent
        this.move = move
        this.children = []
    }

    add_move(move: MoveC) {
        let child: Node = new Node(this, move)

        this.children.push(child)

        return child
    }
}


export class NodeManager {

    cache: NodeCache
    root: NodeRoot

    constructor() {
        this.cache = new NodeCache()
        this.root = new NodeRoot()
    }

    add_move(id: NodeId, move: MoveC) {

        if (id === 0) {
            return this.root.add_move(move).id
        }

        let parent = this.cache.get_node(id)
        if (!parent) {
            throw new NoChildError(id)
        }
        let child = parent.add_move(move)
        this.cache.add_node(child)
        return child.id
    }

    prefix_test(a: NodeId, b: NodeId) {
        if (b === 0) {
            return true
        }

        if (a === 0) {
            return false
        }

        if (a === b) {
            throw new Error('Same Id Prefix Test ' + a)
        }

        let a_child = this.cache.get_node(a)

        if (!a_child) {
            throw new NoChildError(a)
        }

        let b_child = this.cache.get_node(b)

        if (!b_child) {
            throw new NoChildError(b)
        }

        let i_child = a_child.parent
        while (!(i_child instanceof NodeRoot)) {
            if (i_child.id === b_child.id) {
                return true
            }
            i_child = i_child.parent
        }
        return false
    }


    history_moves(id: NodeId) {
        if (id === 0) {
            return this.root.children.map(_ => _.move)
        }

        let a_child = this.cache.get_node(id)
        if (!a_child) {
            throw new NoChildError(id)
        }


        let res = [a_child.move]
        let i_child = a_child.parent
        while (!(i_child instanceof NodeRoot)) {
            res.unshift(i_child.move)
        }
        return res
    }
    
    depth_of(id: NodeId) {

        if (id === 0) {
            return 0
        }

        let a_child = this.cache.get_node(id)
        if (!a_child) {
            throw new NoChildError(id)
        }


        let i = 1
        let i_child = a_child.parent
        while (!(i_child instanceof NodeRoot)) {
            i++
        }
        return i
    }
}
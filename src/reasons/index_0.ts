import { make_move_from_to, move_c_to_Move, MoveC, piece_c_to_piece, PieceC, PositionC, PositionManager } from "../distill/hopefox_c";
import { Piece, Role } from "../distill/types";
import { parse_defs } from "../gof4/parser";
import { CompositeActionCall, CompositeActionCallWithQuantification, CompositeActionDefinition, CompositeNestedGraphNode, CompositeNestedGraphRoot, is_psymbol2, is_vsymbol2, Piece2Symbol, PieceSymbol, PSymbol, Quantification, VSymbol } from "../gof4";
import { BindingOutWithQuantifiers, run_bindings } from "../gof4/gofer";
import { parseSan } from "../distill/san";
import { SansNodes } from "../gof2/gofer3";

export function reason_engine(code: string) {

    let defs: CompositeActionDefinition[] = parse_defs(code)
    return (m: PositionManager, pos: PositionC, sans: string[]) => {

        let solution = sans_to_moves(m, pos, sans)

        let table: Map<Role, number> = new Map()
        const gen_id = (role: Role): PieceSymbol => {

            let id = table.get(role)
            if (id === undefined) {
                table.set(role, 2)
                return { piece: role, id: '' }
            } else {
                table.set(role, id + 1)
                return { piece: role, id: `${id}` }
            }
        }
        const make_symbol = (piece: PieceC): PieceSymbol => {
            let role = piece_c_to_piece(piece).role
            return gen_id(role)
        }

        let symbol_soup: PSymbol[] = []

        for (let sq of m.pos_occupied(pos)) {
            let piece = m.get_at(pos, sq)!
            symbol_soup.push(make_symbol(piece))
        }

        for (let move of solution) {
            let { from, to } = move_c_to_Move(move)

            let piece = m.get_at(pos, from)!
            let captured = m.get_at(pos, to)
            
            if (captured) {
                symbol_soup.push({ a: make_symbol(piece), b: make_symbol(captured)})
            } else {
                symbol_soup.push(make_symbol(piece))
            }
            m.make_move(pos, move)
        }

        for (let i = solution.length - 1; i >= 0; i--) {
            m.unmake_move(pos, solution[i])
        }

        function pour_soup_over_variables(params: VSymbol[], symbol_soup: PSymbol[]) {

            let res: PSymbol[][] = []
            for (let param of params) {
                let res2 = []
                if (is_vsymbol2(param)) {
                    res2.push(...symbol_soup.filter(_ => is_psymbol2(_)))
                } else {
                    res2.push(...symbol_soup.filter(_ => !is_psymbol2(_)))
                }

                res.push(res2)
            }

            return cartesianProduct(res)
        }


        function find_next_line(i_root: CompositeNestedGraphRoot, running_solution: MoveC[]): CompositeNestedGraphRoot {

            let result: CompositeNestedGraphRoot = []
            for (let d of defs) {
                let res: PSymbol[][] = pour_soup_over_variables(d.head.params, symbol_soup)


                for (let params of res) {
                    let call: CompositeActionCall = {
                        id: d.head.id,
                        params
                    }
                    let data: CompositeActionCallWithQuantification = {
                        quantification: Quantification.IfThen,
                        call: [call]
                    }

                    let node: CompositeNestedGraphNode = {
                        data,
                        children: []
                    }

                    let tmp_root = deep_clone_insert_at_end(i_root, node)

                    let rs = running_solution.slice(0)
                    rs.push(solution[running_solution.length])
                    if (verify(defs, tmp_root, m, pos, sans.slice(0, rs.length))) {
                        result.push(...tmp_root)
                        if (result.length >= 3) {
                            return result
                        }
                    } else {

                    }
                }
            }
            return result
        }

        let root: CompositeNestedGraphRoot = []


        function fill_root(root: CompositeNestedGraphRoot, running_solution: MoveC[]) {
            root = find_next_line(root, running_solution)
            if (running_solution.length === solution.length) {
                return root
            }
            return fill_root(root, [...running_solution, solution[running_solution.length]])
        }

        //find_next_line(root, [])
        root = fill_root(root, [])

        return root.map(_ => stringify_composite_root(_)).join('\n')
    }
}

function deep_clone_insert_at_end(root: CompositeNestedGraphRoot, node: CompositeNestedGraphNode): CompositeNestedGraphRoot {
    if (root.length === 0) {
        return [node]
    }
    return root.map(_ => {
        if (_.children.length === 0) {

            return {
                data: _.data,
                children: [node]
            }
        }
        return {
        data: _.data,
            children: deep_clone_insert_at_end(_.children, node)
        }
    })

}

function stringify_composite_root(root: CompositeNestedGraphNode) {
    const stringify_param = (p: PSymbol): string => {

        if (is_psymbol2(p)) {
            return [stringify_param(p.a), stringify_param(p.b)].join('_')
        }
        return p.piece + p.id
    }

    let id = root.data.call[0].id
    let params = root.data.call[0].params.map(_ => stringify_param(_)).join(', ')

    return `if ${id}(${params})`
}

function verify(defs: CompositeActionDefinition[], root: CompositeNestedGraphRoot, m: PositionManager, pos: PositionC, solution: string[]): boolean {
    let sss = solution.join(' ')
    const has_solution = (a: SansNodes): boolean => {

        if (a.children.length === 0 && a.sans.some(_ => _.join(' ') === sss)) {
            return true
        }
        return a.children.some(_ => has_solution(_))
    }

    let bb = root.map(_ => BindingOutWithQuantifiers.from_defs(defs, _))

    return bb.filter((b, i) => {
        return has_solution(run_bindings(b, m, pos))
    }).length > 0
}

function cartesianProduct<T>(lists: T[][]): T[][] {
    return lists.reduce<T[][]>(
        (acc, curr) => {
            const result: T[][] = [];
            for (const existing of acc) {
                for (const item of curr) {
                    result.push([...existing, item]);
                }
            }
            return result;
        },
        [[]]
    );
}


export function sans_to_moves(m: PositionManager, pos: PositionC, sans: string[]) {
    let res = []
    let pp = m.get_pos_read_fen(pos)

    for (let san of sans) {
        let move = parseSan(pp, san)!
        let move_c = make_move_from_to(move.from, move.to)
        pp.play(move)
        res.push(move_c)
    }
    return res
}
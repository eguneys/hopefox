import { ColorC, PositionC, PositionManager } from "../hopefox_c";
import { Fact, Idea, is_matches_between, Program } from "./parser2";
import { join, make_moves, Relation, select } from "./relational";
import { join_world } from "./runner";


/**
 * 
idea check_to_lure_into_double_capture
  line blockable_check double_capture
  blockable_check.check_from = double_capture.from
  blockable_check.to = double_capture.to
 * 
 */
function link_idea(m: PositionManager, i: Idea) {

    function expand_world(pos: PositionC, w: World, lines: string[], linked: Linked, out: World) {
        let line = lines.shift()
        if (!line) {
            return out
        }
        make_moves(m, w[line], pos, () => {
            let w2 = join_world(m, pos, linked)

            out = { ...out, ...w2 }
            expand_world(pos, w2, lines, linked, out)
        })
        return out
    }

    let f = i
    return {
        [f.name]: (w: World, turn: ColorC, pos: PositionC, linked: Linked) => {

            for (let alias of f.aliases) {
                w[alias.alias] = w[alias.column]
            }

            w = expand_world(pos, w, f.line.slice(0), linked, w)

            let m = f.matches[0]
            let [name, rest] = path_split(m.path_a)
            let [name2, rest2] = path_split(m.path_b)

            if (is_matches_between(m)) {
                return { rows: [] }
            }

            let name_bindings = { [name]: w[name], [name2]: w[name2] }
            return join(w[name], w[name2], (a, b) => {
                let ab_bindings = { [name]: a, [name2]: b }

                let cond = true

                for (let m of f.matches) {

                    if (is_matches_between(m)) {
                        continue
                    }

                    let [name, rest] = path_split(m.path_a)
                    let [name2, rest2] = path_split(m.path_b)

                    let x = ab_bindings[name].get(rest)
                    let y

                    if (!rest2) {
                        y = turn
                    } else {
                        y = ab_bindings[name2].get(rest2)
                    }

                    cond ||= m.is_different ? x === y : x !== y
                }

                return cond
                    ? (() => {
                        const r = new Map()
                        for (let ass of f.assigns) {
                            let [key] = Object.keys(ass)
                            let [l_rel, l_path] = path_split(key)
                            let [r_rel, r_path] = path_split(ass[key])
                            r.set(
                                `${name_bindings[l_rel]}`,
                                ab_bindings[r_rel].get(r_path))
                        }
                        return r
                    })() : null
            })
        }
    }
}


/**
 * 
 fact pressures
    .from = attacks.from
    .to = attacks.to
 attacks.to = occupies.square
 occupies.color = turn
 *
 */

function link_fact(f: Fact) {
    return {
        [f.name]: (w: World, turn: ColorC) => {

            for (let alias of f.aliases) {
                w[alias.alias] = w[alias.column]
            }

            let m = f.matches[0]
            let [name, rest] = path_split(m.path_a)
            let [name2, rest2] = path_split(m.path_b)

            if (is_matches_between(m)) {
                return { rows: [] }
            }

            return join(w[name], w[name2], (a, b) => {
                let ab_bindings = { [name]: a, [name2]: b }

                let cond = true

                for (let m of f.matches) {

                    if (is_matches_between(m)) {
                        continue
                    }

                    let [name, rest] = path_split(m.path_a)
                    let [name2, rest2] = path_split(m.path_b)

                    let x = ab_bindings[name].get(rest)
                    let y

                    if (!rest2) {
                        y = turn
                    } else {
                        y = ab_bindings[name2].get(rest2)
                    }

                    cond &&= m.is_different ? x !== y : x === y
                }

                return cond
                    ? (() => {
                        const r = new Map()
                        for (let ass of f.assigns) {
                            let [key] = Object.keys(ass)
                            //let [l_rel, l_path] = path_split(key)
                            let [r_rel, r_path] = path_split(ass[key])
                            r.set(
                                `${key}`,
                                ab_bindings[r_rel].get(`${r_path}`))
                        }
                        return r
                    })() : null
            })
        }
    }
}



function path_split(path: Path) {
    let [name, ...rest] = path.split('.')
    return [name, rest.join('.')]
}

export type Path = string
export type World = Record<Path, Relation>

export type Linked = {
    facts: Record<string, (w: World, turn: ColorC) => Relation>
    ideas: Record<string, (w: World, turn: ColorC, pos: PositionC, linked: Linked) => Relation>
}

export function link(m: PositionManager, p: Program) {
    let facts = {}
    for (let f of p.facts) {
        facts = { ...facts, ...link_fact(f) }
    }

    let ideas = {}
    for (let i of p.ideas) {
        ideas = { ...ideas, ...link_idea(m, i) }
    }

    return {
        facts,
        ideas
    }
}
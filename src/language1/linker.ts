import { ColorC } from "../hopefox_c";
import { Fact, is_matches_between, Program } from "./parser2";
import { join, Relation, select } from "./relational";

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

function path_split(path: Path) {
    let [name, rest] = path.split('.')
    return [name, rest]
}

export type Path = string
export type World = Record<Path, Relation>

export type Linked = {
    facts: Record<string, (w: World, turn: ColorC) => Relation>
}

export function link(p: Program) {
    let facts = {}
    for (let f of p.facts) {
        facts = { ...facts, ...link_fact(f) }
    }


    return {
        facts
    }
}
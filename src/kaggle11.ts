import { getMaxListeners } from "events";
import { Chess } from "./chess";
import { parseFen } from "./fen";
import { Line, match_rule_comma, parse_rules, play_out_pos, PositionGroup, PositionWithContext, print_m } from "./kaggle10";
import { Color } from "./types";

function groupBy<T>(list: T[], keyGetter: (t: T) => string) {
    const map = new Map<string, T[]>();
    list.forEach((item) => {
         const key = keyGetter(item);
         const collection = map.get(key);
         if (!collection) {
             map.set(key, [item]);
         } else {
             collection.push(item);
         }
    });
    return map;
}

function group_g_by_parent_parent(g: PositionGroup): PositionGroup[] {
    return [...groupBy<PositionWithContext>(g, p => `${p.parent![0].parent![1].from}${p.parent![0].parent![1].to}`).values()]
}

type MatchGroupReturn = {
    saa: PositionGroup,
    sbb: PositionGroup,
}

export function match_group(l: Line, g: PositionGroup, lowers_turn: Color): MatchGroupReturn {


    if (l.rule[0] === 'A') {

    }

    if (l.rule[0] === 'E') {

        let aa: PositionGroup = [],
            bb: PositionGroup = []

        let ggg = group_g_by_parent_parent(g)

        for (let gg of ggg) {
            let is_matched = true
            for (let g of gg) {
                let eg = play_out_pos(g)
                let [saa, sbb] = match_rule_comma(l.rule.slice(2), eg, lowers_turn)

                if (saa.length === 0) {
                    is_matched = false
                    break
                }
                aa.push(g)
            }
            if (!is_matched) {
                bb.push(...gg)
            }
        }

        l.m = aa
        return {
            saa: aa, 
            sbb: bb,
        }
    }

    if (l.rule === '*') {
        let paa = g.flatMap(play_out_pos)
        let pbb: PositionGroup = []

        let ibb = paa
        let iaa = []
        for (let i = 0; i < l.children.length; i++) {
            let child = l.children[i]
            let gm = match_group(child, ibb, lowers_turn)
            ibb = gm.sbb
            if (ibb.length === 0) {
                break
            }
        }

        l.m = paa
        return {
            saa: [],
            sbb: paa
        }
    }

    let [saa, sbb] = match_rule_comma(l.rule, g, lowers_turn)

    l.m = saa

    let iaa: PositionGroup = []
    let ibb: PositionGroup = saa

    if (l.children.length === 0) {
        return {
            saa,
            sbb
        }
    }

    for (let i = 0; i < l.children.length; i++) {
        let child = l.children[i]
        let gm = match_group(child, ibb, lowers_turn)
        ibb = gm.sbb
        if (ibb.length === 0) {
            break
        }
    }

    if (ibb.length === 0) {
        return {
            saa,
            sbb
        }
    }

    return {
        saa: iaa,
        sbb: sbb
    }
}


export function make_root(fen: string, rules: string) {

    let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()

    let root = parse_rules(rules)

    if (root.children.length === 0) {
        return root
    }

    let g: PositionGroup = [{ pos, ctx: {} }]

    match_group(root, g, pos.turn)

    return root
}

export function find_san11(fen: string, rules: string) {

    let root = make_root(fen, rules)

    let m = root.children[0].m[0]

    return print_m(m)
}

export { print_rules } from './kaggle10'
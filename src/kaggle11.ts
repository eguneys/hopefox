import { getMaxListeners } from "events";
import { Chess } from "./chess";
import { parseFen } from "./fen";
import { Line, match_rule_comma, move_eq, parse_rules, play_out_pos, PositionGroup, PositionWithContext, print_m } from "./kaggle10";
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
    return [...groupBy<PositionWithContext>(g, p => `${p.parent![0].parent?.[1].from}${p.parent![0].parent?.[1].to}`).values()]
}
function group_g_by_parent(g: PositionGroup): PositionGroup[] {
    return [...groupBy<PositionWithContext>(g, p => `${p.parent![1].from}${p.parent![1].to}`).values()]
}

type MatchGroupReturn = {
    saa: PositionGroup,
    sbb: PositionGroup,
}

export function match_group(l: Line, g: PositionGroup, lowers_turn: Color): MatchGroupReturn {


    let saa: PositionGroup = [],
    sbb: PositionGroup = []

    let iaa: PositionGroup = [],
    ibb: PositionGroup = []

    if (l.rule[0] === 'C') {
        let aa: PositionGroup = [],
            bb: PositionGroup = []

        let ggg = group_g_by_parent_parent(g)

        for (let gg of ggg) {
            let is_matched = false
            for (let g of gg) {
                let eg = play_out_pos(g)
                let [saa, sbb] = match_rule_comma(l.rule.slice(2), eg, lowers_turn)

                if (sbb.length === 0) {
                    aa.push(g)
                } else {
                    bb.push(g)
                }
            }
        }

        l.p_m = bb
        l.m = aa


        iaa = []
        ibb = aa

        iaa = []
        sbb = bb

        saa = aa

    } else if (l.rule[0] === 'O') {
        let aa: PositionGroup = [],
            bb: PositionGroup = []

        let ggg = group_g_by_parent_parent(g)

        for (let gg of ggg) {
            let is_matched = false
            for (let g of gg) {
                let eg = play_out_pos(g)
                let [saa, sbb] = match_rule_comma(l.rule.slice(2), eg, lowers_turn)

                if (saa.length > 0) {
                    aa.push(g)
                } else {
                    bb.push(g)
                }
            }
        }

        l.p_m = bb
        l.m = aa


        iaa = []
        ibb = aa

        iaa = []
        sbb = bb

        saa = aa

    } else if (l.rule[0] === 'A') {
        let aa: PositionGroup = [],
            bb: PositionGroup = []

        for (let ig of g) {
            if (ig.parent![1].to === 47) {
                debugger
            }
            let eg = play_out_pos(ig)
            let [saa, sbb] = match_rule_comma(l.rule.slice(2), eg, lowers_turn)

            if (saa.length === eg.length) {
                aa.push(ig)
            } else {
                bb.push(ig)
            }
        }
        
        l.p_m = bb
        l.m = aa


        iaa = []
        ibb = aa

        iaa = []
        sbb = bb

        saa = aa
    } else if (l.rule[0] === 'E') {

        let aa: PositionGroup = [],
            bb: PositionGroup = []


        for (let ig of g) {
            
            let eg = play_out_pos(ig)
            let [saa, sbb] = match_rule_comma(l.rule.slice(2), eg, lowers_turn)

            if (saa.length > 0) {
                aa.push(ig)
            } else {
                bb.push(ig)
            }
        }

        l.p_m = bb
        l.m = aa

        iaa = []
        ibb = aa

        iaa = []
        sbb = bb

        saa = aa


    } else if (l.rule === '*') {
        let paa = g.flatMap(play_out_pos)
        let pbb: PositionGroup = []

        iaa = []
        ibb = paa

        l.p_m = paa
        l.m = iaa

        iaa = []
        sbb = paa

        saa = paa
    } else {
        ;[saa, sbb] = match_rule_comma(l.rule, g, lowers_turn)
        l.p_m = saa

        iaa = []
        ibb = saa
    }


    if (l.children.length === 0) {
        l.m = saa
        return {
            saa,
            sbb
        }
    }

    let expanded = 0
    for (let i = 0; i < l.children.length; i++) {
        let child = l.children[i]
        if (child.rule === '*') {
            expanded++
        }
        let gm = match_group(child, ibb, lowers_turn)
        ibb = gm.sbb
        iaa.push(...gm.saa)
        if (ibb.length === 0) {
            break
        }
    }

    if (l.rule === '*') {
        if (l.children.length === 1) {
            let c = l.children[0]

            if (ibb[0]?.parent![0]?.parent && c.m[0]?.parent![0]?.parent) {

                l.m = c.m

                ibb = ibb.filter(_ => !l.m.find(i => move_eq(_.parent![0].parent![1], i.parent![0].parent![1])))

                return {
                    saa: l.m,
                    sbb: ibb
                }
            }

        }
    }

    l.m = iaa

    if (saa[0] && saa[0].pos.turn !== lowers_turn) {

        while (expanded--)
            ibb = ibb.map(_ => _.parent![0])

        iaa = saa.filter(_ => !ibb.find(i => move_eq(_.parent![1], i.parent![1])))

        l.m = iaa
    } else {

        while (expanded--)
            ibb = ibb.map(_ => _.parent![0])

    }



    if (ibb.length !== 0) {

        return {
            saa: iaa,
            sbb: [...ibb, ...sbb]
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

    if (!m) {
        return undefined
    }

    return print_m(m)
}

export { print_rules } from './kaggle10'

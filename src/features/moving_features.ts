'OpenAttack'; 'OpenKing'

'OpenKing a-h'; 'Check a-h'

'Check a-h Block g Capture a g Recapture x g Recapture y g'

'Check a-h'; 'Block g'

'Block a'; 'Capture g a'

'Capture g a'; 'Capture x g'

'check block capture capture capture'

'check a-h; king a to h hits h-a; block a-h g capture h'
'block a-h g; to g; capture g check a-f check 1-8'
'capture a; on a to a; capture a'

import { FILE_NAMES, FileName, Move, RANK_NAMES, RankName, Role, Square } from "../types";
import { Features, MoreFeatures } from "./more_features";

type FileRestriction2 = {
    a: FileName
    h: FileName
}
type FileRestriction = {
    a: FileName
}
type RankRestriction = {
    a: RankName
    h: RankName
}

type RestrictionParameter =
    | FileRestriction2
    | FileRestriction
    | RankRestriction

type RoleRestriction = {
    role: Role,
    on: FileRestriction
}

type ToRestriction = {
    to: FileRestriction
}

type HitsRestriction = {
    hits: FileRestriction2
}

type OnRestriction = {
    on: FileRestriction
}

type ActionRestriction =
    | RoleRestriction
    | ToRestriction
    | HitsRestriction
    | OnRestriction

type ActionDefinition = {
    name: string
    parameters: RestrictionParameter[]
}

type ActionTransition = {
    name: string
    args: RestrictionParameter[]
}

type Split = {
    definition: ActionDefinition
    restrictions: ActionRestriction
    transitions: ActionTransition
}

export function ruleset_split(ruleset: string) {
    return ruleset.split('\n').map(_ => split(_))
}

function split(rule: string) {
    let [def, gen, trans] = rule.split(';')

    let [name, ...params] = def.split(' ')

    let parameters: RestrictionParameter[] = []
    for (let i = 0; i < params.length; i++) {
        let parameter = parse_restriction_parameter(params[i++])

        parameters.push(parameter!)
    }

    let definition = { name, parameters }

    let restrictions: ActionRestriction[]  = []
    let gg = gen.trim().split(' ')

    for (let i = 0; i < gg.length; i++) {
        if (gg[i] === 'king') {
            let role: Role = 'king'
            let on = parse_restriction_parameter(gg[++i]) as FileRestriction

            restrictions.push({ role, on })
        }
        if (gg[i] === 'to') {
            let to = parse_restriction_parameter(gg[++i]) as FileRestriction

            restrictions.push({ to })
        }
        if (gg[i] === 'on') {
            let on = parse_restriction_parameter(gg[++i]) as FileRestriction

            restrictions.push({ on })
        }
        if (gg[i] === 'hits') {
            let hits = parse_restriction_parameter(gg[++i]) as FileRestriction2

            restrictions.push({ hits })
        }
    }

    let transitions: ActionTransition[] = []
    let tt = trans.trim().split(' ')

    for (let i = 0; i < tt.length; i++) {
        let name = tt[i]

        let args: RestrictionParameter[] = []

        while (i + 1 < tt.length) {
            let argument = parse_restriction_parameter(tt[i+1])
            if (argument === undefined) {
                break
            }
            args.push(argument!)
            i++;
        }

        transitions.push({ name, args })

    }

    return {
        definition,
        restrictions,
        transitions
    }
}

function parse_restriction_parameter(t: string): RestrictionParameter | undefined {
    if (t.includes('-')) {
        let [a, h] = t.split('-') as [FileName, FileName]
        return { a, h }
    }
    if (FILE_NAMES.includes(t as FileName)) {
        return { a: t } as FileRestriction
    }
    if (RANK_NAMES.includes(t as RankName)) {
        return { a: t } as RankRestriction
    }
}
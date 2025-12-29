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

import { FileName, Move, RankName, Role, Square } from "../types";
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

function split(rule: string) {
    let [def, gen, trans] = rule.split(';')

    let [name, ...params] = def.split(' ')

    let parameters: RestrictionParameter[] = []
    for (let i = 0; i < params.length; i++) {
        let parameter = parse_restriction_parameter(params[i++])

        parameters.push(parameter)
    }

    let definition = { name, parameters }

    let restrictions: ActionRestriction[]  = []
    let gg = gen.split(' ')

    for (let i = 0; i < gg.length; i++) {
        if (gg[i] === 'king') {
            let role: Role = 'king'
            let on = parse_restriction_parameter(gg[i++]) as FileRestriction

            restrictions.push({ role, on })
        }
        if (gg[i] === 'to') {
            let to = parse_restriction_parameter(gg[i++]) as FileRestriction

            restrictions.push({ to })
        }
        if (gg[i] === 'on') {
            let on = parse_restriction_parameter(gg[i++]) as FileRestriction

            restrictions.push({ on })
        }
    }

    let transitions: ActionTransition[] = []
    let tt = trans.split(' ')

    for (let i = 0; i < tt.length; i++) {
        let name = tt[i]

        let args: RestrictionParameter[] = []

        let argument
        do {
            argument = parse_restriction_parameter(tt[i++])
            args.push(argument)
        } while (argument !== undefined)

        transitions.push({ name, args })

    }

    return {
        definition,
        restrictions,
        transitions
    }
}

function parse_restriction_parameter(t: string): RestrictionParameter {
    if (t.includes('-')) {
        let [a, h] = t.split('-') as [FileName, FileName]
        return { a, h }
    }
    return { a: t } as FileRestriction
}
import { ActionBinder, ActionParameters, AtomicAction, AtomicActionId, CompositeAction, CompositeActionDefinition, CompositeActionId } from "./types"

const composite_name_hash = (name: string) => 0
const composite_variable_hash = (variable: string) => 0

const composite_variable_make = (variable: string) => {
    let [a, b] = variable.split('_')
    if (b === undefined) {
        return {
            id: composite_variable_hash(a),
            id_to: -1
        }
    } else {
        return {
            id: composite_variable_hash(a),
            id_to: composite_variable_hash(b)
        }
    }
}

function parse_def(text: string) {


    let m = text.match(/def (.*)\((.*)\)/)

    if (!m) {
        return undefined
    }

    let id = composite_name_hash(m[1])
    let params = m[2].split(', ').map(_ => composite_variable_make(_))

    return {
        id,
        params
    }
}

function action_hash(text: string) {
    if (text === 'move') return AtomicActionId.Move
    if (text === 'push') return AtomicActionId.Push
    if (text === 'capture') return AtomicActionId.Capture
    if (text === 'attack') return AtomicActionId.Attack
    if (text === 'attack_through') return AtomicActionId.Attack_Through

    return composite_name_hash(text)
}

class UnrecognizedBinderException extends Error { 
    constructor(text: string) {
        super(`Unrecognized Binder Exception: ${text}`)
    }
}

function action_binder_make(text: string) {
    if (text === 'and') return ActionBinder.And
    if (text === 'then') return ActionBinder.Then
    if (text === 'or') return ActionBinder.Or
    throw new UnrecognizedBinderException(text)
}

function parse_body(text: string) {
    let m = text.match(/(.*)\((.*)\)(\w*)([a-z]*)?/)

    if (!m) {
        return undefined
    }

    let id = action_hash(m[1])
    let params = m[2].split(', ').map(_ => composite_variable_make(_))
    let binder = m[3] ? action_binder_make(m[3]) : undefined

    return {
        body: { id, params },
        binder
    }
}

export function compile_str_to_composite_defs(text: string): CompositeActionDefinition[] {

    let res: CompositeActionDefinition[] = []

    let c_def_id: CompositeActionId | undefined
    let c_params: ActionParameters = []
    let c_body: (AtomicAction | CompositeAction)[] = []
    let c_body_binders: ActionBinder[] = []

    for (let line of text.split('\n')) {

        let t_line = line.trim()

        if (t_line === '') {
            continue
        }

        let p_def = parse_def(t_line)

        if (p_def !== undefined) {
            if (c_def_id !== undefined) {
                res.push({
                    id: c_def_id,
                    params: c_params,
                    body: c_body,
                    body_binders: c_body_binders
                })
            }
            c_def_id = p_def.id
            c_params = p_def.params
            continue
        }

        let p_body = parse_body(t_line)

        if (p_body !== undefined) {
            c_body.push(p_body.body)
            if (p_body.binder) c_body_binders.push(p_body.binder)
        }
    }

    return res
}
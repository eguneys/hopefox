import { Visual_CompositeActionCall, Visual_CompositeNestedGraphNode, Visual_CompositeNestedGraphRoot } from "./types";

export function visual_node_log(v: Visual_CompositeNestedGraphRoot) {
    let res = ''

    const get_witness = (call: Visual_CompositeActionCall) => call.witness.slice(0, 1).map(_ => `{ ${_.join(' ')} }`).join(' ') + (call.witness.length > 1 ? '..' : '')

    function print_node(v: Visual_CompositeNestedGraphNode, indent: number) {
        let aa = ' '.repeat(indent)

        for (let call of v.data.call) {
            let call_name = call.name.match(/(.*)\((.*)\)/)![1].trim()
            res += `${aa}${call_name} ${get_witness(call)}\n`
        }

        v.children.map(_ => print_node(_, indent + 1))
    }

    v.map(_ => print_node(_, 0)).join('\n\n')

    return res
}
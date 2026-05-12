import { Visual_CompositeActionCall, Visual_CompositeNestedGraphNode, Visual_CompositeNestedGraphRoot } from "./types";

export function visual_node_log(v: Visual_CompositeNestedGraphRoot) {
    let res = ''

    const get_witness = (call: Visual_CompositeActionCall, slice = 1) => {
        return call.witness.slice(0, slice).map(_ => `{ ${_.join(' ')} }`).join(' ') + (call.witness.length > slice + 1 ? '..' : call.witness.length > slice ? '.' : '')
    }

    function print_node(v: Visual_CompositeNestedGraphNode, indent: number) {
        let aa = ' '.repeat(indent)


        let slice = 1

        let s_slice = v.data.tags.find(_ => _.startsWith('slice'))
        if (s_slice) {
            slice = parseInt(s_slice.slice(5))
        }

        for (let call of v.data.call) {
            let call_name = call.name.match(/(.*)\((.*)\)/)![1].trim()
            res += `${aa}${call_name} ${get_witness(call, slice)}\n`
        }

        v.children.map(_ => print_node(_, indent + 1))
    }

    v.map(_ => print_node(_, 0)).join('\n\n')

    return res
}
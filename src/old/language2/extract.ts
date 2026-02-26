import { make_move_from_to, MoveC } from "../distill/hopefox_c"
import { Relation } from "./relational"

export function extract_lines(moves: Relation) {

    let res: MoveC[][] = []
    for (let row of moves.rows) {
        let aa: MoveC[] = []
        for (let i = 1; i < 8; i++) {
            let key = i == 1 ? '' : i
            if (!row.has('from' + key)) {
                break
            }
            aa.push(make_move_from_to(row.get('from' + key)!, row.get('to' + key)!))
        }
        // todo fix
        //res.push([... new Set(aa)])
        if (!res.find(_ => line_equals(_, aa))) {
            res.push(aa)
        }
    }
    return res
}


function line_equals(a: MoveC[], b: MoveC[]) {
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false
        }
    }
    return true
}


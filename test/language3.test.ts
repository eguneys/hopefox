import { it } from 'vitest'
import { PositionManager, search3 } from '../src'


it('works', () => {

    let rules = `
rook skewers queen and bishop
queen escapes skewer
rook captures bishop
queen recaptures
bishop pins queen to king
queen captures bishop
queen recaptures
`

 rules = 'rook skewers queen and bishop'

    //console.log(parse_program2(rules)[0])

    let fen = '2kr3r/1pp2p2/p2p3p/3P1bpB/2P2q2/1P6/P5PP/R2Q1R1K b - - 1 19'
    fen = '2kr3r/1pp2p2/p2p3p/3P1bpB/2P2q2/1P6/P5PP/R2Q1R1K b - - 1 19'
    let pos = m.create_position(fen)
    let res = search3(m, pos, rules)
    console.log(res)
})

let m = await PositionManager.make()
import { it, expect } from "vitest";
import { blocks, context2uci, Hopefox, parse_rule, parse_rule_plus, parseSquare, SquareSet } from '../src'
import { piece } from "../src/debug";
import { hasUncaughtExceptionCaptureCallback } from "process";


it.only('parse rule', () => {

    let q_on_a1_find_rc1 = Hopefox.from_fen('2k4r/p2r1p2/1p2p2p/1N1p2p1/8/1P1P4/2q2PPP/Q4RK1 w - - 2 22')


    //expect(context2uci('n P', parse_rule('n =P')(q_on_a1_find_rc1)[0])).toEqual('b5a7')
    expect(context2uci('n +K', parse_rule('n +K')(q_on_a1_find_rc1)[0])).toEqual('b5d6')
    expect(context2uci('n +K', parse_rule('n +K')(q_on_a1_find_rc1)[1])).toEqual('b5a7')
    //expect(context2uci('r c1', parse_rule('r =c1+Q.K')(q_on_a1_find_rc1)[0])).toEqual('f1c1')

})

it.only('& rule', () => {

    let find_q_ca1_rc1 = Hopefox.from_fen('2kr3r/p4p2/1p2p2p/1N1p2p1/3Q4/1P1P4/2q2PPP/5RK1 w - - 4 23')

    expect(context2uci('q +c1', parse_rule_plus('r =c1+Q.K & q +c1')(find_q_ca1_rc1)[0])).toEqual('d4a1')
})


it('blocks', () => {

    let c2_c5_c7_block_c1_to_c8 = Hopefox.from_fen('2k1r3/p1N2p2/1p2p2p/2rp2p1/8/1P1P4/2q2PPP/Q1R3K1 b - - 9 25')

    let h = c2_c5_c7_block_c1_to_c8

    let res = blocks({ color: 'white', role: 'rook'}, parseSquare('c1'), h.pos.board.occupied)

    expect(res[0].has(parseSquare('c2')))
    expect(res[1].equals(SquareSet.fromSquare(parseSquare('c5'))))
    expect(res[2].equals(SquareSet.fromSquare(parseSquare('c7'))))
    expect(res[3].equals(SquareSet.fromSquare(parseSquare('c8'))))

})
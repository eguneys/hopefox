import { it } from "vitest"
import { test_b_forks_kr_puzzles } from "./fixture"
import { PositionManager, solve } from "../src"

let m = await PositionManager.make()

it.skip('works', () => {

    let log_puzzles = test_b_forks_kr_puzzles

    let i = 0
    let fen = log_puzzles[i].move_fens[0]

    let pos = m.create_position(fen)
    let link = log_puzzles[i].link

    let res = solve(m, pos)

    console.log(link)
    console.log(res)

})

it('works', () => {

let log_puzzles = test_b_forks_kr_puzzles


    let total = log_puzzles.length / 20
    //total = 1

    let Tp = []
    let Fp = []
    let Tn = []
    let Fn = []
    for (let k = 0; k < total; k++) {
        let i = k
        //i = 13
        let fen = log_puzzles[i].move_fens[0]
        //if (i > 100) break
        //if (k === 1) break
        //fen = '1k6/R3B2p/P3p1p1/1p6/2b3P1/r7/5PP1/6K1 w - - 1 33'
        let pos = m.create_position(fen)
        let link = log_puzzles[i].link

        //console.log(i + ' ' + link)
        let res = solve(m, pos)
        if (res.length === 0) {

            Tn.push(link)
            continue
        }

        if (res.length > 0) {
            let cc = res[0][0]
            let ss = log_puzzles[i].sans[0]

            if (cc === ss) {
                Tp.push(link)
            } else {
                Fp.push(`${i} ${link} :> [${res.length}] ${res[0].join(' ')}`)
            }
            continue
        }

        Tn.push(link)

        m.delete_position(pos)
    }

    let TpFp = Tp.length + Fp.length  + 1
    let Total = TpFp + Tn.length + 1
    let C_percent = Math.round(TpFp / Total * 100)
    let A_percent = Math.round(Tp.length / TpFp * 100)
    console.log(`Coverage: % ${C_percent} Accuracy: %${A_percent}`)
    console.log(`Tp/Fp/N ${Tp.length}/${Fp.length}/${Tn.length}`)
    console.log(Fp.slice(0, 20))
    console.log(`Coverage: % ${C_percent} Accuracy: %${A_percent}`)
    console.log(`Tp/Fp: ${Tp.length}/${Fp.length} N: ${Tn.length}`)
})
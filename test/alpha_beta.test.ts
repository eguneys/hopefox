import { it } from "vitest"
import { test_b_forks_kr_puzzles } from "./fixture"
import { PositionManager, solve } from "../src"
import { explainDivergence } from "../src/chat_alpha_v2"


let m = await PositionManager.make()

it.skip('works', () => {

    let log_puzzles = test_b_forks_kr_puzzles

    let i = 0
    let fen = log_puzzles[i].move_fens[0]

    let pos = m.create_position(fen)
    let link = log_puzzles[i].link

    let solution = log_puzzles[i].sans
    let res = solve(m, pos, solution)

    console.log(link)
    console.log(res)
    full_log(res)

})

function full_log(res: any) {

  let { report, result_pv, cmp, evalRes, metrics, pv, solution, pv_features } = res

  console.table(report);

  console.log("PV:", result_pv);

  console.log("Match length:", cmp.matchLength);

  console.log("TP/FP/FN:", evalRes);

  console.log("Match Length:", metrics.matchLength);
  console.log("Divergence Index:", metrics.divergenceIndex);
  console.log("Accuracy:", metrics.accuracy.toFixed(2));
  console.log("Correct First Move:", metrics.correctFirstMove);


  /*
    if (metrics.divergenceIndex !== -1) {
        console.log(
            "Diverged at move",
            metrics.divergenceIndex,
            "engine:",
            pv[metrics.divergenceIndex] ?? '**',
            "expected:",
            solution[metrics.divergenceIndex]
        );
    }
        */

    explainDivergence(pv, pv_features, solution)

}

it('works', () => {

let Single_i
//Single_i = 0

let log_puzzles = test_b_forks_kr_puzzles


    let total = log_puzzles.length / 20
    //total = 1

    let Tp = []
    let Fp = []
    let Tn = []
    let Fn = []
    for (let k = 0; k < total; k++) {
        let i = k
        if (Single_i !== undefined) {
            i = Single_i
            k = total
        }
        //i = 13
        let fen = log_puzzles[i].move_fens[0]
        //if (i > 100) break
        //if (k === 1) break
        //fen = '1k6/R3B2p/P3p1p1/1p6/2b3P1/r7/5PP1/6K1 w - - 1 33'
        let pos = m.create_position(fen)
        let link = log_puzzles[i].link

        //console.log(i + ' ' + link)

        let solution = log_puzzles[i].sans

        let res = solve(m, pos, solution)

        if (res.evalRes.FN === 1) {
            Fn.push(link)
        }

        if (res.evalRes.TP === 1) {
            Tp.push(link)
        }

        if (res.evalRes.FP === 1) {
            Fp.push([i, link, res])
        }

        m.delete_position(pos)
    }

    let N = Tn.length + Fn.length
    let TpFp = Tp.length + Fp.length  + 1
    let Total = TpFp + N + 1
    let C_percent = Math.round(TpFp / Total * 100)
    let A_percent = Math.round(Tp.length / TpFp * 100)
    console.log(`Coverage: %${C_percent} Accuracy: %${A_percent}`)
    console.log(`Tp/Fp: ${Tp.length}/${Fp.length} N: ${N}`)
    console.log('-----******----')
    Fp.slice(0, 3).map(([i, link, res]) => {
        console.log(`${i} <${link}>`)
        full_log(res)
        console.log('')
    })
    console.log('-----*****----')
    console.log(`Coverage: %${C_percent} Accuracy: %${A_percent}`)
    console.log(`Tp/Fp: ${Tp.length}/${Fp.length} N: ${N}`)
})
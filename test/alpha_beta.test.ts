import { it } from "vitest"
import { test_b_forks_kr_puzzles } from "./fixture"
import { PositionManager, solve } from "../src"
import { explainMultiPv, printMultiPV, printMultiPVReports } from "../src/chat_alpha_v2"
import { PositionMaterializer } from "../src/pos_materializer"


let m = await PositionManager.make()

it.skip('works', () => {

    let log_puzzles = test_b_forks_kr_puzzles

    let i = 0
    let fen = log_puzzles[i].move_fens[0]

    let pos = m.create_position(fen)
    let link = log_puzzles[i].link

    let solution = log_puzzles[i].sans
    let mz = new PositionMaterializer(m, pos)
    let res = solve(mz, solution, 3)

    console.log(link)
    console.log(res)
    full_log(res, mz)

})

function full_log(res: any, mz: PositionMaterializer) {

  let { report, evalRes, solution, rootPV, topK } = res

  console.table(report);
    printMultiPV(topK, mz)

  //console.log("PV:", result_pv);

  //console.log("Match length:", cmp.matchLength);

  console.log("TP/FP/FN:", evalRes);

  /*
  console.log("Match Length:", metrics.matchLength);
  console.log("Divergence Index:", metrics.divergenceIndex);
  console.log("Accuracy:", metrics.accuracy.toFixed(2));
  console.log("Correct First Move:", metrics.correctFirstMove);
  */


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

    //explainDivergence(pv, pv_features, solution)

    console.log(solution)
    explainMultiPv(rootPV, solution, topK, mz)
    if (topK) {
        printMultiPVReports(mz, topK)
    }
}

it('works', () => {

let Single_i
//Single_i = 35
Single_i = 36
Single_i = 29
Single_i = 18

let log_puzzles = test_b_forks_kr_puzzles
let skips = [3]


    let total = log_puzzles.length / 40
    total = 100

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
        if (skips.includes(i)) continue
        //i = 13
        let fen = log_puzzles[i].move_fens[0]
        //if (i > 100) break
        //if (k === 1) break
        //fen = '1k6/R3B2p/P3p1p1/1p6/2b3P1/r7/5PP1/6K1 w - - 1 33'
        let pos = m.create_position(fen)
        let link = log_puzzles[i].link

        //console.log(i + ' ' + link)

        let solution = log_puzzles[i].sans

        let mz = new PositionMaterializer(m, pos)
        let res = solve(mz, solution, 3)

        if (res.evalRes.FN === 1) {
            Fn.push(link)
        }

        if (res.evalRes.TP === 1) {
            Tp.push(link)
        }

        if (res.evalRes.FP === 1) {
            Fp.push([i, link, res, mz])
        }

    }

    let N = Tn.length + Fn.length
    let TpFp = Tp.length + Fp.length  + 1
    let Total = TpFp + N + 1
    let C_percent = Math.round(TpFp / Total * 100)
    let A_percent = Math.round(Tp.length / TpFp * 100)
    console.log(`Coverage: %${C_percent} Accuracy: %${A_percent}`)
    console.log(`Tp/Fp: ${Tp.length}/${Fp.length} N: ${N}`)
    console.log('-----******----')
    Fp.slice(0, 3).map(([i, link, res, mz]) => {
        console.log(`${i} <${link}>`)
        full_log(res, mz as any)
        console.log('')
    })
    console.log('-----*****----')
    console.log(`Coverage: %${C_percent} Accuracy: %${A_percent}`)
    console.log(`Tp/Fp: ${Tp.length}/${Fp.length} N: ${N}`)

})
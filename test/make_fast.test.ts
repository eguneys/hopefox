import { it } from 'vitest'
import { make_fast, PositionManager } from '../src'
import { test_b_forks_kr_puzzles, test_qr_puzzles } from './fixture'

let m = await PositionManager.make()


it('works', () => {

    let log_puzzles = test_qr_puzzles
    log_puzzles = test_b_forks_kr_puzzles

    let total = log_puzzles.length / 2

    let Tp = []
    let Fp = []
    let Tn = []
    let Fn = []
    for (let k = 0; k < total; k++) {
        let i = k
        let fen = log_puzzles[i].move_fens[0]
        //if (i > 100) break
        //if (k === 1) break
        //fen = '3qr1k1/p4p1p/6p1/3Q4/8/1P3P2/P5PP/3R2K1 b - - 0 26'
        let pos = m.create_position(fen)
        let link = log_puzzles[i].link

        //console.log(i + ' ' + link)
        let res = make_fast(m, pos)
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
    }

    let C_percent = Math.round(((Tp.length + Fp.length) / Tn.length) * 100)
    let Tp_percent = Math.round((Fp.length / (Tp.length + Fp.length)) * 100)
    console.log(`Coverage % ${C_percent} Error %${Tp_percent}`)
    console.log(`Tp/Fp/N ${Tp.length}/${Fp.length}/${Tn.length}`)
    console.log(Fp.slice(0, 20))
    console.log(`Coverage % ${C_percent} Error %${Tp_percent}`)
    console.log(`Tp/Fp/N ${Tp.length}/${Fp.length}/${Tn.length}`)
})
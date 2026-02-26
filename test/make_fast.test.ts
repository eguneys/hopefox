import { it } from 'vitest'
import { extract_moves_relation, make_fast, PositionManager } from '../src'
import { log_puzzles } from './fixture'

let m = await PositionManager.make()


it('works', () => {
    let Tp = []
    let Fp = []
    let Tn = []
    let Fn = []
    for (let i = 0; i < log_puzzles.length / 5; i++) {
        let fen = log_puzzles[i].move_fens[0]
        let pos = m.create_position(fen)
        let link = log_puzzles[i].link

        let res = make_fast(m, pos)
        if (res.length === 0) {

            Tn.push(link)
            continue
        }

        if (res.length === 1) {
            let cc = res[0][0]
            let ss = log_puzzles[i].sans[0]

            if (cc === ss) {
                Tp.push(link)
            } else {
                Fp.push(`${link} :> ${res.join(' ')}`)
            }
        }

        Tn.push(link)
    }

    console.log(`Tp/Fp/N ${Tp.length}/${Fp.length}/${Tn.length}`)
    console.log(Fp.slice(0, 8))
    console.log(`Tp/Fp/N ${Tp.length}/${Fp.length}/${Tn.length}`)
})
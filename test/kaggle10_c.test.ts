import { expect, it } from "vitest"
import { tenk } from "./fixture"
import { Chess, make_root, PositionManager, print_rules } from "../src"
import { parseFen } from "../src/fen"

let m = await PositionManager.make()

it.only('find_san10_c E A', () => {

  let id = '01lh4'
  let fen = tenk.find(_ => _.id === id)!.move_fens[0]

  let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()

  let res = print_rules(make_root(fen, `
E b= +Q
 A
  Q= =h7
   E =h7
   E n= +h7
    A
     Q=
     .
  !Q=
   N +k
   B +k
   E =Q
`, m), pos)

  console.log(res)



})



it('00206 find_san10_c E A', () => {

  let fen = tenk.find(_ => _.id === '00206')!.move_fens[0]

  let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()

  /*
  let res = print_rules(make_root(fen, `
E b= =h7 +Q
 A
  Q=
   Q= =h1
    E p= =h1
    .
  !Q=
`, m), pos)
*/


  let res = print_rules(make_root(fen, `
 E b= =h7 +Q
 A
  Q=
   Q= =h1
    E a= =h1
  !Q=
`, m), pos)

  console.log(res)

})


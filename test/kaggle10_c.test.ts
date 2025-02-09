import { expect, it } from "vitest"
import { tenk } from "./fixture"
import { Chess, make_root, PositionManager, print_rules, set_debug } from "../src"
import { parseFen } from "../src/fen"

set_debug()
let m = await PositionManager.make()


it.only('find_san10_c E A', () => {

  let id = '001gi'
  let fen = tenk.find(_ => _.id === id)!.move_fens[0]

  let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()

  let res = print_rules(make_root(fen, `
E b= #
`, m), pos)

  console.log(res)



})




it('find_san10_c E A', () => {

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
     E =Q
  Q=
  .
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


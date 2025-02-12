import { expect, it } from "vitest"
import { tenk } from "./fixture"
import { Chess, make_root, PositionManager, print_rules, set_debug } from "../src"
import { parseFen } from "../src/fen"

set_debug()
let m = await PositionManager.make()


it('find_san10_c B= b/K', () => {

  let id = '058i4'
  let fen = tenk.find(_ => _.id === id)!.move_fens[0]

  let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()

  let res = print_rules(make_root(fen, `
E b= +Q
 A
  Q= b+N
`, m), pos)

  console.log(res)
})

it('find_san10_c B= b/K', () => {

  let id = '066RW'
  let fen = tenk.find(_ => _.id === id)!.move_fens[0]

  let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()

  let res = print_rules(make_root(fen, `
E b= +Q
 A
  E =Q
  Q= b+B
   E b= =B
    A
     E b
`, m), pos)

  console.log(res)
})

it('find_san10_c E A Ctx xx', () => {

  let id = '00s23'
  let fen = tenk.find(_ => _.id === id)!.move_fens[0]

  let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()

  let res = print_rules(make_root(fen, `
E b= +Q +c2, n +c2, Q +c2
 A
  E n= =c2 +K +R
  E b= =Q
  E n= =Q
  E r= =Q
  B= +k
  B= =b3 b/Q, n =b3
`, m), pos)

  console.log(res)
})



it.only('find_san10_c P\'', () => {

  let id = '0FaX9'
  let fen = tenk.find(_ => _.id === id)!.move_fens[0]

  let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()

  let res = print_rules(make_root(fen, `
E b= =P, P' +P q/R
`, m), pos)

  console.log(res)
})



it('find_san10_c B= b/K', () => {

  let id = '00DTg'
  let fen = tenk.find(_ => _.id === id)!.move_fens[0]

  let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()

  let res = print_rules(make_root(fen, `
E b= +Q
 A
  E b= =Q 5
`, m), pos)

  console.log(res)
})




it('find_san10_c B= b/K', () => {

  let id = '04h4k'
  let fen = tenk.find(_ => _.id === id)!.move_fens[0]

  let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()

  let res = print_rules(make_root(fen, `
E b= +K q+Q
 A
  B= b/K q/Q
  Q= b/K
  E q= =Q
`, m), pos)

  console.log(res)
})



it('find_san10_c b= =b', () => {

  let id = '0108q'
  let fen = tenk.find(_ => _.id === id)!.move_fens[0]

  let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()

  let res = print_rules(make_root(fen, `
E b= =N
 A
  E b
`, m), pos)

  console.log(res)
})



it('find_san10_c b= =b', () => {

  let id = '00Ahb'
  let fen = tenk.find(_ => _.id === id)!.move_fens[0]

  let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()

  let res = print_rules(make_root(fen, `
E b= =N
 A
  "gxh6
  E b
`, m), pos)

  console.log(res)
})




it('find_san10_c b= =b', () => {

  let id = '0009B'
  let fen = tenk.find(_ => _.id === id)!.move_fens[0]

  let pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap()

  let res = print_rules(make_root(fen, `
E b= =N
 A
  B= =b
  .
`, m), pos)

  console.log(res)
})



it('find_san10_c E A', () => {

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


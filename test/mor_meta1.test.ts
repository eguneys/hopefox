import { it, expect } from 'vitest'
import {mor_meta1} from '../src'

let a = `
:situation:
Bishop forks queen and knight
knight is_hanging after


:Subject forks object1 and object2:
Subject moves
Subject is_eying object1 after Subject moves
Subject is_eying object2 after Subject moves

:Subject takes object:
Subject captures object

:attacking object:
Subject is_eying object

:discovering_check with Subject2:
Subject2 is_eying king blocked_by Subject before Subject moves
Subject2 is_eying king after Subject moves

:winning Object:
Subject captures Object
`

let b_a = `

:link: https://lichess.org/training/00Yuf
:situation:
Bishop forks queen and knight which_is_hanging
`



let b = `
:Subject forks object1 and object2:
Subject moves
Subject is_eying object1 after Subject moves
Subject is_eying object2 after Subject moves

:Subject takes object:
Subject captures object

:attacking object:
Subject is_eying object

:discovering_check with Subject2:
Subject2 is_eying king blocked_by Subject before Subject moves
Subject2 is_eying king after Subject moves

:winning Object:
Subject captures Object

:if action:
action -new_branch

:then action:
-new_branch action

:and if action:
-up_branch action

:, action:
action

:and action:
action
`

it.skip('works', () => {
    let b = mor_meta1(a, b_a)
    expect(b).toBe(`hey`)
})
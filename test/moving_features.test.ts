import { it } from 'vitest'
import { moving_features, ruleset_split } from '../src'
import { puzzles } from './fixture'


let ruleset = `
check a-h; king a to h hits h-a; block a-h g capture h
block a-h g; to g; capture g check a-f check 1-8
capture a; on a to a; capture a
`.trim()

it('moves', () => {
    //console.log(ruleset_split(ruleset)[0])
    moving_features(puzzles[0].move_fens[0], ruleset)
})
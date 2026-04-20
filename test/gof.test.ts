import fs from 'fs'
import {it} from 'vitest'
import { gofchess } from '../src'

it('works', () => {
    let data = fs.readFileSync('test/hello.gof').toString()
    let [a, b] = data.split('##')
    gofchess(b, a)
})
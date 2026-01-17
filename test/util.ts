import fs from 'fs'

export function render(data: string) {
    fs.writeFileSync(__dirname + '/_output.txt', data)
}


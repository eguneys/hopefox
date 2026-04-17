export function merge_binding(a: Map<string, number>, b: Map<string, number>) {
    let c = new Map(a)
    for (let [key, value] of b.entries()) {
        let key_strip = key.split('_')[key.split('_').length - 1]
        if (c.has(key_strip)) {
            if (c.get(key_strip) !== value) {
                return undefined
            }
        }

        c.set(key, value)
    }
    return c
}
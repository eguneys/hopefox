const Nb_Depth = 8
const Nb_BucketSize = 64
const Nb_BucketCount = 128

const Nb_Frames = 1000
const Nb_FrameSize = 1000000

class PackMem {

    Pack = new Uint32Array(Nb_Frames * Nb_FrameSize)

    frame: number
    _cursor: number

    get cursor() {
        return this.frame * Nb_FrameSize + this._cursor
    }

    set cursor(cursor: number) {
        this.frame = Math.floor(cursor / Nb_FrameSize)
        this._cursor = cursor % Nb_FrameSize
    }

    depth: number

    bucketOffsets = new Uint32Array(Nb_Frames * Nb_Depth * Nb_BucketSize * Nb_BucketCount)
    bucketCounts = new Uint32Array(Nb_Frames * Nb_Depth * Nb_BucketSize)

    reset() {
        this.frame = 0
        this.cursor = 0
        this.depth = 0
        this.bucketOffsets.fill(0)
        this.bucketCounts.fill(0)
    }

    
    push_frame() {
        let cursor = this.cursor
        this.frame += 1
        this._cursor = 0
        return cursor
    }

    pop_frame(cursor: number) {
        this.frame -= 1
        this._cursor = cursor
    }

    new_feature(a: number, b = 0, c = 0, d = 0, e = 0) {
        this.Pack[this.frame * Nb_FrameSize + this._cursor++] = a
        this.Pack[this.frame * Nb_FrameSize + this._cursor++] = b
        this.Pack[this.frame * Nb_FrameSize + this._cursor++] = c
        this.Pack[this.frame * Nb_FrameSize + this._cursor++] = d
        this.Pack[this.frame * Nb_FrameSize + this._cursor++] = e
    }
    
    read_a(o: number) {
        return this.Pack[o]
    }
    read_b(o: number) {
        return this.Pack[o + 1]
    }
    read_c(o: number) {
        return this.Pack[o + 2]
    }
    read_d(o: number) {
        return this.Pack[o + 3]
    }
    read_e(o: number) {
        return this.Pack[o + 4]
    }


    increase_depth() {
        this.depth++
    }

    decrease_depth() {
        this.depth--
    }

    add_feature_grouped_by_from(from: number, feature_offset: number) {
        let key = this.depth * 64 + from
        const count = this.bucketCounts[key]
        this.bucketOffsets[key * 128 + this.bucketCounts[key]++] = feature_offset
    }

    get_feature_grouped_by_from_iterator(from: number) {
        let key = this.depth * 64 + from
        const count = this.bucketCounts[key]
        const base = key * 128
        return [base, count]
    }

    get_feature_grouped_by_from(base: number, offset: number) {
        return this.bucketOffsets[base + offset]
    }
}


export default new PackMem()
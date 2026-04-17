import { MoveC, PositionC } from "../distill/hopefox_c"
import { PositionMaterializer, WorldId } from "../pos_materializer"


export type PvLine = { 
    move: WorldId
    score: number
}

export type Context = {
    mz: PositionMaterializer
}

export type FeatureDelta = {
    name: string
}



export type Checkpoint = {
    length: number
}

export class Node {

    ply: number

    feature_list: FeatureDelta[]

    apply_delta(delta: FeatureDelta) {
        this.feature_list.push(delta)
    }

    mark() {
        return { length: this.feature_list.length}
    }

    rollback(checkpoint: Checkpoint) {
        this.feature_list.length = checkpoint.length
    }
}

export type MoveDelta = { move: MoveC, delta: FeatureDelta }
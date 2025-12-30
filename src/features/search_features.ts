import { Position } from "../chess"
import { fen_pos, pos_moves } from "../hopefox"
import { init_features, PositionWithFeatures } from "./more_features"
import { Generate_TemporalMotives, TemporalMotif } from './tactical_features'

type FEN = string

export function fen_search(fen: FEN) {
  const pos = fen_pos(fen)
  let moves = pos_moves(pos)
  let features = moves.map(move => init_features(pos, move))

  for (let feature of features) {
    let motives = Generate_TemporalMotives(feature)
  }
}
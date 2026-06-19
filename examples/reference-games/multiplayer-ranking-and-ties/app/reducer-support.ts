import {
  createReducerEdit,
  createStateQueries,
} from "@dreamboard-games/sdk/reducer";
import type { GameState } from "./game-contract";

export const edit = createReducerEdit<GameState>();

export function stateQueries(state: GameState) {
  return createStateQueries(state);
}

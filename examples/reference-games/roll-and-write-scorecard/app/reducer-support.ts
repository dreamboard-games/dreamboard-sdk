import { createReducerEdit } from "@dreamboard-games/sdk/reducer";
import type { GameState } from "./game-contract";

export const edit = createReducerEdit<GameState>();

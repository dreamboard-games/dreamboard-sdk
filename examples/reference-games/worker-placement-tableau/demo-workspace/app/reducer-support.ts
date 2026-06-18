import { createReducerEdit } from "@dreamboard-games/sdk/reducer";
import type { GameState } from "./game-contract";

export const edit = createReducerEdit<GameState>();

export * from "./rules/workers";
export * from "./rules/items";
export * from "./rules/orders";
export * from "./rules/scoring";

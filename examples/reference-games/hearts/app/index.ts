import game from "./game";
import { createReducerBundle } from "@dreamboard-games/sdk/reducer";
import { botStrategies } from "./bot-strategies";

export default createReducerBundle(game, { botStrategies });

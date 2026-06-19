import { createContractAuthoring } from "@dreamboard-games/sdk/reducer";
import { gameContract } from "./game-contract";

export const authoring = createContractAuthoring(gameContract);
export const playerTurn = authoring.phase("playerTurn");
export const checkGameEnd = authoring.phase("checkGameEnd");
export const gameOver = authoring.phase("gameOver");

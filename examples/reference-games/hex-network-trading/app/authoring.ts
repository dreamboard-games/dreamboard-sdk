import { createContractAuthoring } from "@dreamboard-games/sdk/reducer";
import { gameContract } from "./game-contract";

export const authoring = createContractAuthoring(gameContract);
export const setupCampAuthoring = authoring.phase("setupCamp");
export const setupTrailAuthoring = authoring.phase("setupTrail");
export const rollAuthoring = authoring.phase("roll");
export const discardBarrierAuthoring = authoring.phase("discardBarrier");
export const moveBanditsAuthoring = authoring.phase("moveBandits");
export const mainAuthoring = authoring.phase("main");
export const pendingTradeAuthoring = authoring.phase("pendingTrade");
export const gameOverAuthoring = authoring.phase("gameOver");

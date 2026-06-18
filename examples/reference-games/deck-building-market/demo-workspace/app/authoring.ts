import { createContractAuthoring } from "@dreamboard-games/sdk/reducer";
import { gameContract } from "./game-contract";

export const authoring = createContractAuthoring(gameContract);

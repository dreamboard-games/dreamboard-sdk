import { createScenarioAuthoring } from "@dreamboard-games/sdk/testing";
import game from "../app/game.ts";

export const { defineScenario } = createScenarioAuthoring(game);

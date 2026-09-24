import { localSource, scenarioSource } from "@dreamboard-games/sdk/testing";
import game from "../app/game";
import increment from "../test/scenarios/increment";

export function createDevelopmentSource(query: URLSearchParams) {
  const scenario = query.get("scenario");
  if (scenario && scenario !== "increment")
    throw new Error(`Unknown scenario '${scenario}'.`);
  return scenario
    ? scenarioSource(game, increment, {
        as: "player-1",
        ...(query.has("at") ? { at: query.get("at")! } : {}),
      })
    : localSource(game, { players: 1, seed: 1, as: "player-1" });
}

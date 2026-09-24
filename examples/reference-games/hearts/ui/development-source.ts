import { localSource, scenarioSource } from "@dreamboard-games/sdk/testing";
import game from "../app/game";
import complete from "../test/scenarios/complete-game.scenario";
import setup from "../test/scenarios/setup-and-pass.scenario";

export async function createDevelopmentSource(query: URLSearchParams) {
  const scenarios = { complete, setup };
  const name = query.get("scenario");
  const scenario = Object.entries(scenarios).find(
    ([key, value]) => key === name || value.id === name,
  )?.[1];
  if (name && !scenario) throw new Error(`Unknown Hearts scenario '${name}'.`);
  const as = query.get("as") ?? undefined;
  return scenario
    ? scenarioSource(game, scenario, {
        as,
        ...(query.has("at") ? { at: query.get("at")! } : {}),
      })
    : localSource(game, { players: 4, seed: 1, as });
}

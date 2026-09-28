import { scenarioSource } from "./scenario-source.js";
import { createScenarioAuthoring } from "../definitions.js";
import { localSource } from "./local-source.js";
import { providerGame } from "./__fixtures__/game.js";
import type { SubmitResult } from "../../headless/sources/types.js";

export async function checkLocalProviderTypes() {
  const game = providerGame();
  const source = await localSource(game, {
    players: 2,
    seed: 1,
    options: { finishImmediately: false },
  });
  const untrusted: unknown = JSON.parse("{}");
  source.restore(untrusted);
  const result: Promise<SubmitResult> = source.apply({
    actor: { seat: 0 },
    interactionId: "add",
    params: { amount: 2 },
  });
  void result;
  source.apply({
    actor: { seat: 0 },
    // @ts-expect-error Game interaction identity stays literal.
    interactionId: "missing",
    params: { amount: 2 },
  });
  source.apply({
    actor: { seat: 0 },
    interactionId: "add",
    // @ts-expect-error Game command params remain inferred.
    params: { amount: "two" },
  });
  localSource(game, {
    players: 2,
    seed: 1,
    // @ts-expect-error Lobby options retain the model's schema output.
    options: { finishImmediately: "yes" },
  });
  const commands = await source.explore({ maxEvaluations: 10 });
  if (commands[0]) source.apply(commands[0]);
}

export async function checkSeatArgumentDomains() {
  const source = await localSource(providerGame(), { players: 2, seed: 1 });
  source.switchSeat("player-2");
  // @ts-expect-error The selected seat is a player ID, not a scenario actor reference.
  source.switchSeat({ seat: 1 });
  // @ts-expect-error Source perspective uses player IDs, not numeric seat indexes.
  localSource(providerGame(), { players: 2, seed: 1, as: 0 });
}

export async function checkSourcesRequireAssembledGames() {
  const game = providerGame();
  const partial = {
    contract: game.contract,
    phases: game.phases,
    view: game.view,
  };
  // @ts-expect-error Sources require the validated assembled definition.
  localSource(partial, { players: 2, seed: 1 });
  // @ts-expect-error Scenario authoring also requires an assembled definition.
  createScenarioAuthoring(partial);
  const scenario = createScenarioAuthoring(game).defineScenario({
    id: "source.inference",
    setup: { players: 2, seed: 1 },
    given: [],
    when: [],
    then() {},
  });
  // @ts-expect-error Replay sources cannot execute partial metadata objects.
  scenarioSource(partial, scenario);
  const replay = await scenarioSource(game, scenario);
  replay.apply({
    actor: { seat: 0 },
    interactionId: "add",
    params: { amount: 1 },
  });
  replay.apply({
    actor: { seat: 0 },
    interactionId: "add",
    // @ts-expect-error Scenario sources retain the authored command parameter type.
    params: { amount: "one" },
  });
}

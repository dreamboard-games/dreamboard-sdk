import { materializeScenarioRuntimeCheckpoint } from "../scenario-replay.js";
import { createReducerTestingRuntime } from "../reducer-runtime.js";
import {
  resolveScenarioCheckpoint,
  type ScenarioDefinition,
  type ScenarioCheckpointSelector,
} from "../definitions.js";
import type { ScenarioDefinitionGameLike } from "../scenario-definition-validation.js";
import { createLocalProvider } from "./local-source.js";
import type { LocalSource } from "./types.js";

export async function scenarioSource<
  const Game extends ScenarioDefinitionGameLike,
>(
  game: Game,
  scenario: ScenarioDefinition<Game>,
  options: { at?: ScenarioCheckpointSelector; as?: string } = {},
): Promise<LocalSource<Game>> {
  const materialized = await materializeScenarioRuntimeCheckpoint({
    game,
    scenario,
    ...(options.at === undefined
      ? {}
      : { at: resolveScenarioCheckpoint(scenario, options.at) }),
  });
  return createLocalProvider(
    game,
    createReducerTestingRuntime(game as never),
    materialized.playerIds,
    { state: materialized.state, terminal: materialized.terminal },
    options.as ?? materialized.playerIds[0],
  );
}

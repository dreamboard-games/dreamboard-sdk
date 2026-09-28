import type {
  AnyReducerGameDefinition,
  ReducerGameContractLike,
} from "../../reducer/model.js";
import { materializeScenarioRuntimeCheckpoint } from "../scenario-replay.js";
import { createReducerTestingRuntime } from "../reducer-runtime.js";
import {
  resolveScenarioCheckpoint,
  type ScenarioDefinition,
  type ScenarioCheckpointSelector,
} from "../definitions.js";
import { createLocalProvider } from "./local-source.js";
import type { LocalSource } from "./types.js";

export async function scenarioSource<
  Contract extends ReducerGameContractLike,
  const Game extends AnyReducerGameDefinition<Contract>,
>(
  game: Game & { readonly contract: Contract },
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
    createReducerTestingRuntime(game),
    materialized.playerIds,
    { state: materialized.state, terminal: materialized.terminal },
    options.as ?? materialized.playerIds[0],
  );
}

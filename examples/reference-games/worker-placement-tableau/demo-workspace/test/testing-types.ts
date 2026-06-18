// Workspace-narrowed test authoring helpers. Mirrors the frontier-trails
// shape so generated `BaseDefinition` / `ScenarioDefinition` types stay
// the source of truth; this file just provides typed `defineBase`,
// `defineScenario`, and a `createTestRuntime` wrapper.
import game from "../app/game";
import { createReducerBundle } from "@dreamboard-games/sdk/reducer";
import { createTestRuntime as createDreamboardTestRuntime } from "@dreamboard-games/sdk/testing";
import type { CreateTestRuntimeOptions } from "@dreamboard-games/sdk/testing";
import { literals } from "../shared/manifest-contract";
import type { PhaseName } from "../shared/generated/ui-contract";
import { BASE_STATES } from "./generated/base-states.generated";
import type {
  BaseDefinition,
  ScenarioDefinition,
  TestRunner,
} from "./generated/testing-contract";

export * from "./generated/testing-contract";

export function defineBase<const Definition extends BaseDefinition>(
  definition: Definition,
): Definition {
  return definition;
}

export function defineScenario<
  const Runners extends readonly TestRunner[] = readonly ["reducer"],
  const Phase extends PhaseName | undefined = undefined,
>(
  definition: ScenarioDefinition<Runners, Phase>,
): ScenarioDefinition<Runners, Phase> {
  return definition;
}

export function createTestRuntime(options: {
  baseId: keyof typeof BASE_STATES & string;
  phase?: PhaseName;
  controllingPlayerId?: (typeof literals.playerIds)[number];
  userId?: string | null;
}) {
  const reducerBundle = createReducerBundle(
    game,
  ) satisfies CreateTestRuntimeOptions["bundle"];
  const baseStates =
    BASE_STATES satisfies CreateTestRuntimeOptions["baseStates"];
  const basePlayerIds = literals.playerIds.slice(
    0,
    BASE_STATES[options.baseId]?.fingerprint.players ?? literals.playerIds.length,
  );
  const playerIds =
    options.controllingPlayerId &&
    basePlayerIds.includes(options.controllingPlayerId)
      ? [
          options.controllingPlayerId,
          ...basePlayerIds.filter(
            (playerId) => playerId !== options.controllingPlayerId,
          ),
        ]
      : basePlayerIds;
  const runtime = createDreamboardTestRuntime({
    baseId: options.baseId,
    baseStates,
    bundle: reducerBundle,
    phase: options.phase,
    userId: options.userId ?? "test-user",
    playerIds,
  });

  return runtime;
}

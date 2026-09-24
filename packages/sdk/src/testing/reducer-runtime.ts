import type * as Wire from "../shared/runtime-types";
import type { ReducerBundleContract } from "../shared/worker-contract";
import { createReducerBundle } from "../reducer/bundle/create-reducer-bundle";
import type { ReducerBundleOptions } from "../reducer/bundle/types";
import { createIngressRuntimeCodec } from "../reducer/ingress/session-codec";
import {
  createTrustedRuntimeScope,
  type TrustedInput,
  type TrustedSessionState,
} from "../reducer/bundle/trusted/runtime-scope";
import { createInteractionResolver } from "../reducer/bundle/trusted/interaction-resolver";
import { createProjectionBuilder } from "../reducer/bundle/trusted/projection-builder";
import type {
  InteractionActionabilityResult,
  InteractionExplanation,
  InteractionInputEnumerationResult,
} from "../reducer/bundle/trusted/interaction-types";
import type { ClientParamSchema } from "../reducer/client-param-schemas";
import type {
  PhaseMapOf,
  ReducerGameContractLike,
  ReducerGameDefinition,
  ReducerValidationResult,
  ViewOfContract,
} from "../reducer/model";

type InspectionInput = {
  state: Wire.ReducerSessionState;
  playerId: unknown;
  interactionId: string;
};
type ReductionResult =
  | Extract<Wire.DispatchResult, { kind: "reject" }>
  | Omit<Extract<Wire.DispatchResult, { kind: "accept" }>, "trace">;

/** Scenario conveniences; all state changes use the production bundle. */
export type ReducerBundleTestingRuntime = Omit<
  ReducerBundleContract,
  "initialize" | "project"
> & {
  initialize(input: Wire.InitializeRequest): Promise<Wire.ReducerSessionState>;
  validateInput(input: Wire.DispatchRequest): Promise<ReducerValidationResult>;
  reduce(input: Wire.DispatchRequest): Promise<ReductionResult>;
  project(
    input: Wire.ProjectRequest & { projectionMode?: "full" | "actionsOnly" },
  ): Wire.SeatProjectionBundle;
  explainInteraction(input: InspectionInput): InteractionExplanation;
  currentClientParamSchema(input: InspectionInput): ClientParamSchema | null;
  resolveInteractionActionability(
    input: InspectionInput,
  ): InteractionActionabilityResult;
  enumerateInteractionParams(
    input: InspectionInput & { maxEvaluations: number },
  ): InteractionInputEnumerationResult;
};

export function createReducerTestingRuntime<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
>(
  definition: ReducerGameDefinition<Contract, Definitions, View>,
  options: ReducerBundleOptions = {},
): Omit<ReducerBundleTestingRuntime, "initialize"> &
  Pick<ReducerBundleContract, "initialize"> {
  const bundle = createReducerBundle(definition, options);
  const codec = createIngressRuntimeCodec(definition);
  // The codec validates the authored schemas; its erased phase return type
  // cannot express the contract-specific phase-state mapping.
  const parseState = (state: Wire.ReducerSessionState) =>
    codec.parseState(state) as unknown as TrustedSessionState<Contract>;
  const parseInput = (input: Wire.GameInput) =>
    codec.parseInput(input) as TrustedInput<Contract>;
  const scope = createTrustedRuntimeScope(definition);
  const interactions = createInteractionResolver(scope, {
    diagnostics:
      options.descriptorDiagnostics ??
      (options.diagnostics === "verbose" ? "verbose" : undefined),
  });
  const projection = createProjectionBuilder(scope, interactions);
  function inspect({ state, playerId, interactionId }: InspectionInput) {
    if (typeof playerId !== "string")
      throw new Error("Expected a string playerId.");
    return {
      state: scope.toCombinedState(parseState(state)),
      playerId: codec.parsePlayerId(playerId),
      interactionId,
    };
  }
  return {
    ...bundle,
    async validateInput({ state, input }) {
      return interactions.validateClientInput(
        scope.toCombinedState(parseState(state)),
        parseInput(input),
      );
    },
    async reduce(input) {
      const result = await bundle.dispatch(input);
      if (result.kind === "reject") return result;
      return {
        kind: result.kind,
        state: result.state,
        events: result.events,
        ...(result.terminal ? { terminal: result.terminal } : {}),
      };
    },
    project({ state, playerIds, projectionMode }) {
      if (projectionMode !== "actionsOnly")
        return bundle.project({ state, playerIds });
      return projection.project({
        state: parseState(state),
        playerIds: playerIds.map((id) => codec.parsePlayerId(id)),
        projectionMode,
      }) as unknown as Wire.SeatProjectionBundle;
    },
    explainInteraction(input) {
      return interactions.explainInteraction(inspect(input));
    },
    currentClientParamSchema(input) {
      return interactions.currentClientParamSchema(inspect(input));
    },
    resolveInteractionActionability(input) {
      return interactions.resolveInteractionActionability(inspect(input));
    },
    enumerateInteractionParams(input) {
      return interactions.enumerateInteractionParams({
        ...inspect(input),
        maxEvaluations: input.maxEvaluations,
      });
    },
  };
}

/** Existing scenario conveniences unwrap only initialization, never execution. */
export function createReducerTestingBundle<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
>(
  definition: ReducerGameDefinition<Contract, Definitions, View>,
  options: ReducerBundleOptions = {},
): ReducerBundleTestingRuntime {
  const runtime = createReducerTestingRuntime(definition, options);
  return {
    ...runtime,
    async initialize(input) {
      return (await runtime.initialize(input)).state;
    },
  };
}

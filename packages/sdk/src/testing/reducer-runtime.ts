import { ReducerSessionStateSchema } from "../shared/runtime-schema.js";
import { RuntimeJsonSchema } from "../shared/runtime-json.js";
import { encodeSeatParams } from "../reducer/bundle/trusted/seat-interactions.js";
import { createSeatDisclosure } from "../reducer/bundle/trusted/tile-disclosure.js";
import type * as Wire from "../shared/runtime-types";
import type { ReducerBundleContract } from "../shared/worker-contract";
import { createReducerBundle } from "../reducer/bundle/create-reducer-bundle";
import type { ReducerBundleOptions } from "../reducer/bundle/types";
import { createIngressRuntimeCodec } from "../reducer/ingress/session-codec";
import {
  createTrustedRuntimeScope,
  type TrustedSessionState,
} from "../reducer/bundle/trusted/runtime-scope";
import { createInteractionResolver } from "../reducer/bundle/trusted/interaction-resolver";
import { createProjectionBuilder } from "../reducer/bundle/trusted/projection-builder";
import { concealCards } from "../reducer/bundle/trusted/card-concealment";
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

import { createPendingSelectionReconciler } from "../reducer/bundle/trusted/pending-selection.js";

type InspectionInput = {
  referenceBasis: Wire.ReferenceBasis;
  state: Wire.ReducerSessionState;
  playerId: unknown;
  interactionId: string;
};
type ReductionResult =
  | Extract<Wire.DispatchResult, { kind: "reject" }>
  | Omit<Extract<Wire.DispatchResult, { kind: "accept" }>, "trace">;

/** Scenario conveniences; all state changes use the production bundle. */
export type ReducerTestingRuntime = Omit<ReducerBundleContract, "project"> & {
  dispatchClient: ReducerBundleContract["dispatch"];
  validateInput(input: Wire.DispatchRequest): Promise<ReducerValidationResult>;
  reduce(input: Wire.DispatchRequest): Promise<ReductionResult>;
  project(
    input: Wire.ProjectRequest & { projectionMode?: "full" | "actionsOnly" },
  ): Wire.SeatProjectionBundle;
  explainInteraction(input: InspectionInput): InteractionExplanation;
  currentClientParamSchema(input: InspectionInput): ClientParamSchema | null;
  currentAuthorParamSchema(input: InspectionInput): ClientParamSchema | null;
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
  bundle: ReducerBundleContract = createReducerBundle(definition, options),
): ReducerTestingRuntime {
  const codec = createIngressRuntimeCodec(definition);
  // The codec validates the authored schemas; its erased phase return type
  // cannot express the contract-specific phase-state mapping.
  const parseState = (state: Wire.ReducerSessionState) =>
    // eslint-disable-next-line no-restricted-syntax -- This codec parses the same Contract schemas and current phase before the testing runtime receives its trusted session state.
    codec.parseState(state) as unknown as TrustedSessionState<Contract>;
  const scope = createTrustedRuntimeScope(definition);
  const interactions = createInteractionResolver(scope, {
    diagnostics:
      options.descriptorDiagnostics ??
      (options.diagnostics === "verbose" ? "verbose" : undefined),
  });
  const projection = createProjectionBuilder(scope, interactions);
  const reconcilePending = createPendingSelectionReconciler(
    scope,
    interactions,
  );
  function inspect({
    state,
    playerId,
    interactionId,
    referenceBasis,
  }: InspectionInput) {
    if (typeof playerId !== "string")
      throw new Error("Expected a string playerId.");
    const [perspective] = codec.parseStatePerspectives(state, [playerId]);
    return {
      state: reconcilePending(
        scope.toCombinedState(parseState(state)),
        referenceBasis,
      ),
      playerId: perspective,
      interactionId,
    };
  }
  // Tests act with full knowledge of the table; seats name the cards hidden
  // from them by position, so dispatch does too.
  async function dispatch({
    state,
    input,
    referenceBasis,
  }: Wire.DispatchRequest): Promise<Wire.DispatchResult> {
    if (
      input.kind !== "interaction" ||
      !codec.isStatePlayer(state, input.playerId)
    )
      return bundle.dispatch({ state, input, referenceBasis });
    const combinedState = reconcilePending(
      scope.toCombinedState(parseState(state)),
      referenceBasis,
    );
    const playerId = codec.parsePlayerId(input.playerId);
    const disclosure = createSeatDisclosure(
      combinedState.table,
      scope.manifest,
      playerId,
      referenceBasis,
    );
    return bundle.dispatch({
      state: ReducerSessionStateSchema.parse(
        scope.toSessionState(combinedState),
      ),
      referenceBasis,
      input: {
        ...input,
        params: RuntimeJsonSchema.parse(
          encodeSeatParams(
            input.params as Record<string, unknown>,
            interactions.inputCollectors(
              combinedState,
              playerId,
              input.interactionId,
            ),
            disclosure,
            concealCards(combinedState.table, playerId, disclosure),
          ),
        ),
      },
    });
  }
  return {
    ...bundle,
    dispatch,
    dispatchClient: (request) => Promise.resolve(bundle.dispatch(request)),
    async validateInput(request) {
      const result = await dispatch({
        ...request,
        state: structuredClone(request.state),
      });
      return result.kind === "reject"
        ? {
            valid: false,
            errorCode: result.errorCode,
            ...(result.message === undefined
              ? {}
              : { message: result.message }),
          }
        : { valid: true };
    },
    async reduce(input) {
      const result = await dispatch(input);
      if (result.kind === "reject") return result;
      return {
        kind: result.kind,
        state: result.state,
        events: result.events,
        ...(result.terminal ? { terminal: result.terminal } : {}),
      };
    },
    project({ state, playerIds, projectionMode, referenceBasis }) {
      if (projectionMode !== "actionsOnly")
        return bundle.project({ state, playerIds, referenceBasis });
      const perspectives = codec.parseStatePerspectives(state, playerIds);
      // eslint-disable-next-line no-restricted-syntax -- This game-bound actions-only projector assembles the wire seat bundle from parsed session and player IDs.
      return projection.project({
        state: scope.toSessionState(
          reconcilePending(
            scope.toCombinedState(parseState(state)),
            referenceBasis,
          ),
        ),
        playerIds: perspectives,
        projectionMode,
        referenceBasis,
      }) as unknown as Wire.SeatProjectionBundle;
    },
    explainInteraction(input) {
      return interactions.explainInteraction(inspect(input));
    },
    currentAuthorParamSchema(input) {
      return interactions.currentAuthorParamSchema(inspect(input));
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

import type { ReducerBundleOptions, TrustedReducerBundle } from "./types";
import { summarizeDispatchTrace } from "../diagnostics";
import type { ReducerDiagnosticsSink } from "../diagnostics";
import type {
  PhaseMapOf,
  ReducerGameContractLike,
  ReducerGameDefinition,
  ViewOfContract,
} from "../model";
import type { InteractionDiagnosticsMode } from "./trusted/interaction-types";
import { createReducerExecutor } from "./trusted/reducer-executor";
import { createInteractionResolver } from "./trusted/interaction-resolver";
import { createLifecycleRunner } from "./trusted/lifecycle-runner";
import { createProjectionBuilder } from "./trusted/projection-builder";
import { createTrustedRuntimeScope } from "./trusted/runtime-scope";
import { createStaticProjectionBuilder } from "./trusted/static-projection";

function resolveDiagnosticsSink(
  options: ReducerBundleOptions,
): ReducerDiagnosticsSink | undefined {
  return typeof options.diagnostics === "object"
    ? options.diagnostics
    : undefined;
}

function resolveDescriptorDiagnostics(
  options: ReducerBundleOptions,
): InteractionDiagnosticsMode | undefined {
  return (
    options.descriptorDiagnostics ??
    (options.diagnostics === "verbose" ? "verbose" : undefined)
  );
}

function inputIdentity(input: { playerId: string; interactionId: string }) {
  return {
    playerId: input.playerId,
    interactionId: input.interactionId,
  };
}

export function createTrustedReducerBundle<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
>(
  definition: ReducerGameDefinition<Contract, Definitions, View>,
  options: ReducerBundleOptions = {},
): TrustedReducerBundle<Contract, Definitions, View> {
  const scope = createTrustedRuntimeScope(definition, {
    diagnostics: resolveDiagnosticsSink(options),
  });
  const interactions = createInteractionResolver(scope, {
    diagnostics: resolveDescriptorDiagnostics(options),
  });
  const lifecycle = createLifecycleRunner(scope);
  const executor = createReducerExecutor(scope, interactions, lifecycle);
  const staticProjection = createStaticProjectionBuilder(scope);
  const projection = createProjectionBuilder(scope, interactions);
  let submissionCounter = 0;

  function nextSubmissionId(): string {
    submissionCounter += 1;
    return `sub-${submissionCounter}`;
  }

  return {
    async initialize(input) {
      return lifecycle.initializeSession(input, executor.complete);
    },
    async initializePhase({ state, to }) {
      const combinedState = scope.toCombinedState(state);
      const from = combinedState.flow.currentPhase;
      const initialized = lifecycle.initializePhaseResult(combinedState, to);
      if (String(from) !== String(to)) {
        scope.diagnostics.event({
          type: "phaseTransition",
          from: String(from),
          to: String(to),
          reason: "lifecycle",
        });
      }
      return scope.toSessionState(executor.complete(initialized, 1).state);
    },
    async validateInput({ state, input }) {
      return interactions.validateClientInput(
        scope.toCombinedState(state),
        input,
      );
    },
    explainInteraction({ state, playerId, interactionId }) {
      return interactions.explainInteraction({
        state: scope.toCombinedState(state),
        playerId,
        interactionId,
      });
    },
    currentClientParamSchema({ state, playerId, interactionId }) {
      return interactions.currentClientParamSchema({
        state: scope.toCombinedState(state),
        playerId: playerId,
        interactionId,
      });
    },
    resolveInteractionActionability({ state, playerId, interactionId }) {
      return interactions.resolveInteractionActionability({
        state: scope.toCombinedState(state),
        playerId,
        interactionId,
      });
    },
    enumerateInteractionParams({
      state,
      playerId,
      interactionId,
      maxEvaluations,
    }) {
      return interactions.enumerateInteractionParams({
        state: scope.toCombinedState(state),
        playerId,
        interactionId,
        maxEvaluations,
      });
    },
    async reduce({ state, input }) {
      const combinedState = scope.toCombinedState(state);
      const result = executor.dispatch(combinedState, input);
      if (result.type === "reject") {
        return result;
      }
      return {
        type: "accept" as const,
        state: scope.toSessionState(result.state),
        events: result.events ?? [],
        ...(result.terminal ? { terminal: result.terminal } : {}),
      };
    },
    async dispatch({ state, input }) {
      const combinedState = scope.toCombinedState(state);
      const submissionId = nextSubmissionId();
      const identity = inputIdentity(input);
      scope.diagnostics.event({
        type: "submitReceived",
        submissionId,
        playerId: identity.playerId,
        interactionId: identity.interactionId,
        phase: String(combinedState.flow.currentPhase),
      });
      const result = executor.dispatch(combinedState, input);
      if (result.type === "reject") {
        scope.diagnostics.event({
          type: "submitRejected",
          submissionId,
          errorCode: result.errorCode,
          ...(result.message ? { message: result.message } : {}),
        });
        return result;
      }
      scope.diagnostics.event({
        type: "submitAccepted",
        submissionId,
        trace: summarizeDispatchTrace(result.trace),
      });
      const from = combinedState.flow.currentPhase;
      const to = result.state.flow.currentPhase;
      if (String(from) !== String(to)) {
        scope.diagnostics.event({
          type: "phaseTransition",
          from: String(from),
          to: String(to),
          reason: "effect",
        });
      }
      return {
        type: "accept" as const,
        state: scope.toSessionState(result.state),
        trace: result.trace,
        events: result.events ?? [],
        ...(result.terminal ? { terminal: result.terminal } : {}),
      };
    },
    boardStatic() {
      return staticProjection.boardStatic();
    },
    project(input) {
      return projection.project(input);
    },
  };
}

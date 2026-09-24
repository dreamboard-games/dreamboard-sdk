import type * as Wire from "../../shared/runtime-types";
import { REDUCER_CONTRACT_VERSION } from "../../shared/worker-contract";
import type { GameEvent, GameOutcome } from "../../shared/domain/results";
import type {
  PhaseMapOf,
  ReducerGameContractLike,
  ReducerGameDefinition,
  ReducerReject,
  ViewOfContract,
} from "../model";
import type { DispatchTraceEntry } from "../core/types";
import type { UntrustedReducerSessionState } from "../ingress/types";
import { createIngressRuntimeCodec } from "../ingress/session-codec";
import { summarizeDispatchTrace } from "../diagnostics";
import type { ReducerBundle, ReducerBundleOptions } from "./types";
import {
  createTrustedRuntimeScope,
  type TrustedInput,
  type TrustedSessionState,
} from "./trusted/runtime-scope";
import { createInteractionResolver } from "./trusted/interaction-resolver";
import { createLifecycleRunner } from "./trusted/lifecycle-runner";
import { createReducerExecutor } from "./trusted/reducer-executor";
import { createStaticProjectionBuilder } from "./trusted/static-projection";
import { createProjectionBuilder } from "./trusted/projection-builder";

function wireOutcome(outcome: GameOutcome): Wire.GameOutcome {
  return {
    reason: outcome.reason,
    standings: outcome.standings.map(
      ({ scoreBreakdown, tieBreaks, ...standing }) => ({
        ...standing,
        ...(scoreBreakdown ? { scoreBreakdown: [...scoreBreakdown] } : {}),
        ...(tieBreaks ? { tieBreaks: [...tieBreaks] } : {}),
      }),
    ),
  };
}
function wireEvents(events: readonly GameEvent[]): Wire.GameEvent[] {
  return events.map(({ details, ...event }) => ({
    ...event,
    ...(details ? { details: [...details] } : {}),
  }));
}

function toWireDispatchResult<State, PlayerId extends string>(
  result:
    | ReducerReject
    | {
        type: "accept";
        state: State;
        trace: DispatchTraceEntry<State, PlayerId>[];
        terminal?: GameOutcome<PlayerId>;
        events?: readonly GameEvent[];
      },
  serializeState: (state: State) => UntrustedReducerSessionState,
): Wire.DispatchResult {
  if (result.type === "reject") {
    return result.message === undefined
      ? { kind: "reject", errorCode: result.errorCode }
      : {
          kind: "reject",
          errorCode: result.errorCode,
          message: result.message,
        };
  }
  const trace: Wire.DispatchTrace[] = [];
  for (const entry of result.trace) {
    switch (entry.type) {
      case "acceptedClientInput":
        trace.push({
          kind: "acceptedClientInput",
          input: entry.input as Wire.GameInput,
        });
        break;
      case "phaseEntered":
        trace.push({
          kind: "phaseEntered",
          from: String(entry.from),
          to: String(entry.to),
        });
        break;
      case "rngConsumption":
        trace.push({
          kind: "rngConsumption",
          version: entry.version,
          operation: entry.operation,
          drawIndex: entry.drawIndex,
          traceEntry: entry.traceEntry,
        });
        break;
      default: {
        const _exhaustive: never = entry;
        throw new Error(
          `toWireDispatchResult: unknown trace entry type '${(_exhaustive as { type: string }).type}'.`,
        );
      }
    }
  }
  return {
    kind: "accept",
    state: serializeState(result.state),
    ...(result.terminal ? { terminal: wireOutcome(result.terminal) } : {}),
    trace,
    events: wireEvents(result.events ?? []),
  };
}

/** The single validated production execution and projection boundary. */
export function createReducerBundle<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
>(
  definition: ReducerGameDefinition<Contract, Definitions, View>,
  options: ReducerBundleOptions = {},
): ReducerBundle {
  const codec = createIngressRuntimeCodec(definition);
  // The codec validates the authored schemas; its erased phase return type
  // cannot express the contract-specific phase-state mapping.
  const parseState = (state: Wire.ReducerSessionState) =>
    codec.parseState(state) as unknown as TrustedSessionState<Contract>;
  const parseInput = (input: Wire.GameInput) =>
    codec.parseInput(input) as TrustedInput<Contract>;
  const scope = createTrustedRuntimeScope(definition, {
    diagnostics:
      typeof options.diagnostics === "object" ? options.diagnostics : undefined,
  });
  const interactions = createInteractionResolver(scope, {
    diagnostics:
      options.descriptorDiagnostics ??
      (options.diagnostics === "verbose" ? "verbose" : undefined),
  });
  const lifecycle = createLifecycleRunner(scope);
  const executor = createReducerExecutor(scope, interactions, lifecycle);
  const staticProjection = createStaticProjectionBuilder(scope);
  const projection = createProjectionBuilder(scope, interactions);
  let submissionCounter = 0;
  return {
    reducerContractVersion: REDUCER_CONTRACT_VERSION,
    async initialize({ table, playerIds, rngSeed, options }) {
      const parsed = codec.parseInitialTable(
        table as unknown as Parameters<typeof codec.parseInitialTable>[0],
        playerIds,
      );
      const result = lifecycle.initializeSession(
        { ...parsed, rngSeed, options: codec.parseInitialOptions(options) },
        executor.complete,
      );
      return {
        state: codec.serializeState(result.state),
        ...(result.terminal ? { terminal: wireOutcome(result.terminal) } : {}),
        events: wireEvents(result.events),
      };
    },
    async dispatch({ state, input: rawInput }) {
      const input = parseInput(rawInput);
      const combinedState = scope.toCombinedState(parseState(state));
      const submissionId = `sub-${++submissionCounter}`;
      scope.diagnostics.event({
        type: "submitReceived",
        submissionId,
        playerId: input.playerId,
        interactionId: input.interactionId,
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
      } else {
        scope.diagnostics.event({
          type: "submitAccepted",
          submissionId,
          trace: summarizeDispatchTrace(result.trace),
        });
        const from = combinedState.flow.currentPhase;
        const to = result.state.flow.currentPhase;
        if (String(from) !== String(to))
          scope.diagnostics.event({
            type: "phaseTransition",
            from: String(from),
            to: String(to),
            reason: "effect",
          });
      }
      return toWireDispatchResult(result, (next) =>
        codec.serializeState(scope.toSessionState(next)),
      );
    },
    boardStatic: () =>
      staticProjection.boardStatic() as Wire.BoardStaticProjection | null,
    project({ state, playerIds }) {
      return projection.project({
        state: parseState(state),
        playerIds: playerIds.map((id) => codec.parsePlayerId(id)),
      }) as unknown as Wire.SeatProjectionBundle;
    },
  };
}

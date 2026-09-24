import { createTrustedReducerBundle } from "./trusted-bundle";
import { createIngressRuntimeCodec } from "../ingress/runtime-codec";
import {
  REDUCER_CONTRACT_VERSION,
  type Wire,
} from "@dreamboard-games/reducer-contract";
import type {
  PhaseMapOf,
  ReducerGameContractLike,
  ReducerGameDefinition,
  ReducerReject,
  ViewOfContract,
} from "../model";
import type { DispatchTraceEntry } from "../core/types";
import type {
  UntrustedReducerSessionState,
  UntrustedRuntimeInput,
} from "../ingress/types";
import type {
  ReducerBundle,
  ReducerBundleOptions,
  ReducerBundleTestingRuntime,
} from "./types";

/**
 * Pass the wire-validated `interaction` input through to the trusted
 * bundle. Both layers speak the same single-kind shape now — the routing
 * here only normalizes `params` to a concrete object when the caller
 * elided it.
 *
 * The wire schema admits exactly one player-originated variant
 * (`{ kind: "interaction" }`) and the engine's `TrustedRuntimeInput`
 * uses the same discriminator, so this is a straight pass-through.
 */
function routeInteraction(input: UntrustedRuntimeInput): UntrustedRuntimeInput {
  return input;
}

// Adapt trusted results to the generated, validated host contract.

function toWireReduceResult<State>(
  result:
    | ReducerReject
    | {
        type: "accept";
        state: State;
        terminal?: Wire.GameOutcome;
        events?: Wire.GameEvent[];
      },
  serializeState: (state: State) => UntrustedReducerSessionState,
): Wire.ReduceResult {
  if (result.type === "reject") {
    return result.message === undefined
      ? { kind: "reject", errorCode: result.errorCode }
      : {
          kind: "reject",
          errorCode: result.errorCode,
          message: result.message,
        };
  }
  return {
    kind: "accept",
    state: serializeState(result.state),
    ...(result.terminal ? { terminal: result.terminal } : {}),
    events: result.events ?? [],
  };
}

function toWireDispatchResult<State, PlayerId extends string>(
  result:
    | ReducerReject
    | {
        type: "accept";
        state: State;
        trace: DispatchTraceEntry<State, PlayerId>[];
        terminal?: Wire.GameOutcome;
        events?: Wire.GameEvent[];
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
    ...(result.terminal ? { terminal: result.terminal } : {}),
    trace,
    events: result.events ?? [],
  };
}

function toWireDispatchTrace<State, PlayerId extends string>(result: {
  type: "accept";
  state: State;
  trace: DispatchTraceEntry<State, PlayerId>[];
}): Wire.DispatchTrace[] {
  return (
    toWireDispatchResult(result, (state) => state as never) as {
      kind: "accept";
      trace: Wire.DispatchTrace[];
    }
  ).trace;
}

export function createReducerTestingBundle<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
>(
  definition: ReducerGameDefinition<Contract, Definitions, View>,
  options: ReducerBundleOptions = {},
): ReducerBundleTestingRuntime {
  const trustedBundle = createTrustedReducerBundle(definition, options);
  const codec = createIngressRuntimeCodec(definition);
  type TrustedState = Awaited<
    ReturnType<typeof trustedBundle.initialize>
  >["state"];

  function parseTrustedState(state: unknown): TrustedState {
    return codec.parseState(
      state as UntrustedReducerSessionState,
    ) as TrustedState;
  }

  function parseRuntimePlayerId(playerId: unknown) {
    if (typeof playerId !== "string") {
      throw new Error("Expected a string playerId.");
    }
    return codec.parsePlayerId(playerId);
  }

  const bundle: ReducerBundleTestingRuntime = {
    // Hosts require this exact runner contract version.
    reducerContractVersion: REDUCER_CONTRACT_VERSION,
    async initialize(
      input: Wire.InitializeRequest,
    ): Promise<Wire.ReducerSessionState> {
      return (await bundle.initializeResult(input)).state;
    },
    async initializeResult({
      table,
      playerIds,
      rngSeed,
      options,
    }: Wire.InitializeRequest) {
      const { table: parsedTable, playerIds: parsedPlayerIds } =
        codec.parseInitialTable(
          table as unknown as Parameters<typeof codec.parseInitialTable>[0],
          playerIds,
        );
      const initialized = await trustedBundle.initialize({
        table: parsedTable,
        playerIds: parsedPlayerIds,
        rngSeed,
        options: codec.parseInitialOptions(options),
      });
      return {
        state: codec.serializeState(initialized.state),
        ...(initialized.terminal
          ? {
              terminal: {
                reason: initialized.terminal.reason,
                standings: initialized.terminal.standings.map(
                  ({ scoreBreakdown, tieBreaks, ...standing }) => ({
                    ...standing,
                    ...(scoreBreakdown
                      ? { scoreBreakdown: [...scoreBreakdown] }
                      : {}),
                    ...(tieBreaks ? { tieBreaks: [...tieBreaks] } : {}),
                  }),
                ),
              },
            }
          : {}),
        events: initialized.events.map(({ details, ...event }) => ({
          ...event,
          ...(details ? { details: [...details] } : {}),
        })),
      } satisfies Wire.InitializeResult;
    },
    async initializePhase({ state, to }: Wire.InitializePhaseRequest) {
      const decodedState = parseTrustedState(state);
      return codec.serializeState(
        await trustedBundle.initializePhase({
          state: decodedState,
          to: to as never,
        }),
      );
    },
    async validateInput({ state, input }: Wire.ValidateInputRequest) {
      const validatedWire = codec.parseInput(input as UntrustedRuntimeInput);
      const routed = routeInteraction(validatedWire);
      return trustedBundle.validateInput({
        state: parseTrustedState(state),
        input: routed as never,
      });
    },
    explainInteraction({ state, playerId, interactionId }) {
      return trustedBundle.explainInteraction({
        state: parseTrustedState(state),
        playerId: parseRuntimePlayerId(playerId),
        interactionId,
      });
    },
    currentClientParamSchema({ state, playerId, interactionId }) {
      return trustedBundle.currentClientParamSchema({
        state: parseTrustedState(state),
        playerId: parseRuntimePlayerId(playerId),
        interactionId,
      });
    },
    resolveInteractionActionability({ state, playerId, interactionId }) {
      return trustedBundle.resolveInteractionActionability({
        state: parseTrustedState(state),
        playerId: parseRuntimePlayerId(playerId),
        interactionId,
      });
    },
    enumerateInteractionParams({
      state,
      playerId,
      interactionId,
      maxEvaluations,
    }) {
      return trustedBundle.enumerateInteractionParams({
        state: parseTrustedState(state),
        playerId: parseRuntimePlayerId(playerId),
        interactionId,
        maxEvaluations,
      });
    },
    async reduce({
      state,
      input,
    }: Wire.ReduceRequest): Promise<Wire.ReduceResult> {
      const validatedWire = codec.parseInput(input as UntrustedRuntimeInput);
      const routed = routeInteraction(validatedWire);
      const result = await trustedBundle.reduce({
        state: parseTrustedState(state),
        input: routed as never,
      });
      return toWireReduceResult<TrustedState>(result as never, (nextState) =>
        codec.serializeState(nextState as never),
      );
    },
    async dispatch({
      state,
      input,
    }: Wire.DispatchRequest): Promise<Wire.DispatchResult> {
      const validatedWire = codec.parseInput(input as UntrustedRuntimeInput);
      const routed = routeInteraction(validatedWire);
      const result = await trustedBundle.dispatch({
        state: parseTrustedState(state),
        input: routed as never,
      });
      return toWireDispatchResult(result as never, (nextState: TrustedState) =>
        codec.serializeState(nextState as never),
      );
    },
    /**
     * Wire-side passthrough for the session-scoped static projection. The
     * host calls this once per reducer session, caches the payload, and
     * thereafter merges it back into every seat view on the client.
     * Board data is owned by the compiled manifest.
     */
    boardStatic() {
      return trustedBundle.boardStatic() as Wire.BoardStaticProjection | null;
    },
    project({
      state,
      playerIds,
      projectionMode,
    }: Wire.ProjectRequest & { projectionMode?: "full" | "actionsOnly" }) {
      const parsedState = parseTrustedState(state);
      const parsedPlayerIds = playerIds.map((pid) => codec.parsePlayerId(pid));
      return trustedBundle.project({
        state: parsedState,
        playerIds: parsedPlayerIds,
        projectionMode: projectionMode ?? undefined,
      }) as Wire.SeatProjectionBundle;
    },
    createInProcessRuntime() {
      let state: TrustedState | null = null;
      const requireState = () => {
        if (!state) {
          throw new Error("In-process reducer runtime has no state.");
        }
        return state;
      };
      return {
        async initialize({ table, playerIds, rngSeed, options }) {
          const { table: parsedTable, playerIds: parsedPlayerIds } =
            codec.parseInitialTable(
              table as Parameters<typeof codec.parseInitialTable>[0],
              playerIds,
            );
          state = (
            await trustedBundle.initialize({
              table: parsedTable,
              playerIds: parsedPlayerIds,
              rngSeed,
              options: codec.parseInitialOptions(options),
            })
          ).state;
        },
        hydrate({ state: snapshot }) {
          state = parseTrustedState(snapshot);
        },
        async dispatch({ input }) {
          const validatedWire = codec.parseInput(
            input as UntrustedRuntimeInput,
          );
          const routed = routeInteraction(validatedWire);
          const result = await trustedBundle.dispatch({
            state: requireState(),
            input: routed as never,
          });
          if (result.type === "reject") {
            return {
              kind: "reject" as const,
              errorCode: result.errorCode,
              message: result.message,
            };
          }
          state = result.state;
          return {
            kind: "accept" as const,
            state: codec.serializeState(state as never),
            trace: toWireDispatchTrace(result as never),
          };
        },
        project({ playerIds, projectionMode }) {
          const parsedPlayerIds = playerIds.map((pid) =>
            parseRuntimePlayerId(pid),
          );
          return trustedBundle.project({
            state: requireState(),
            playerIds: parsedPlayerIds,
            projectionMode: projectionMode ?? undefined,
          });
        },
        explainInteraction({ playerId, interactionId }) {
          return trustedBundle.explainInteraction({
            state: requireState(),
            playerId: parseRuntimePlayerId(playerId),
            interactionId,
          });
        },
        resolveInteractionActionability({ playerId, interactionId }) {
          return trustedBundle.resolveInteractionActionability({
            state: requireState(),
            playerId: parseRuntimePlayerId(playerId),
            interactionId,
          });
        },
        enumerateInteractionParams({
          playerId,
          interactionId,
          maxEvaluations,
        }) {
          return trustedBundle.enumerateInteractionParams({
            state: requireState(),
            playerId: parseRuntimePlayerId(playerId),
            interactionId,
            maxEvaluations,
          });
        },
        snapshot() {
          return codec.serializeState(requireState());
        },
        unsafeState() {
          return requireState();
        },
      };
    },
  } satisfies ReducerBundleTestingRuntime;

  return bundle;
}

/** The complete runner boundary. Authoring inspection stays SDK-owned. */
export function createReducerBundle<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
>(
  definition: ReducerGameDefinition<Contract, Definitions, View>,
  options: ReducerBundleOptions = {},
): ReducerBundle {
  const runtime = createReducerTestingBundle(definition, options);
  return {
    reducerContractVersion: runtime.reducerContractVersion,
    boardStatic: runtime.boardStatic,
    initialize: runtime.initializeResult,
    dispatch: runtime.dispatch,
    project: ({ state, playerIds }) => runtime.project({ state, playerIds }),
  };
}

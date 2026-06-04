import { createTrustedReducerBundle } from "./trusted-bundle";
import { createIngressRuntimeCodec } from "../ingress/runtime-codec";
import * as Builders from "../../generated/reducer-contract/builders";
import { REDUCER_CONTRACT_VERSION } from "../../generated/reducer-contract/version";
import * as Wire from "../../generated/reducer-contract/wire";
import type {
  ManifestContractOf,
  PhaseMapOf,
  ReducerGameContractLike,
  ReducerGameDefinition,
  ReducerReject,
  RuntimeSetupSelectionInput,
  ViewMapOf,
} from "../model";
import type { RuntimeInstructionForState } from "../core/runtime-instruction";
import type { DispatchTraceEntry } from "../core/types";
import type {
  UntrustedReducerSessionState,
  UntrustedRuntimeInput,
  UntrustedRuntimeTable,
} from "../ingress/types";
import type { ReducerBundle } from "./types";

/**
 * Pass the wire-validated `interaction` input through to the trusted
 * bundle. Both layers speak the same single-kind shape now — the routing
 * here only normalizes `params` to a concrete object when the caller
 * elided it.
 *
 * The wire schema admits exactly one player-originated variant
 * (`{ kind: "interaction" }`) and the engine's `TrustedRuntimeInput`
 * uses the same discriminator, so this is a straight pass-through.
 * Continuation inputs are engine-internal and never traverse this routing.
 */
function routeInteraction(input: UntrustedRuntimeInput): {
  kind: "interaction";
  playerId: string;
  interactionId: string;
  params: unknown;
} {
  return {
    kind: "interaction",
    playerId: input.playerId,
    interactionId: input.interactionId,
    params: input.params,
  };
}

// ---------------------------------------------------------------------------
// Wire-protocol adapter.
//
// The trusted bundle (see ./trusted-bundle.ts) keeps the SDK reducer runtime
// instruction shape at reducer boundaries where:
//   - Results discriminate on `type: "accept" | "reject"`.
//   - Reducer-returned instructions carry `kind`.
//   - Dispatch traces use normalized runtime instructions.
// The generated reducer-contract (`packages/reducer-contract`) defines the
// canonical wire shape consumed by the Kotlin host:
//   - Results discriminate on `kind: "accept" | "reject"`.
//   - Each effect carries an `effectId`, never an inline `resume`.
//   - Continuations live in a sibling `continuations: Record<effectId, ...>`
//     map on reduce results, or on the matching `appliedEffect` trace entry
//     for dispatch results.
//   - Each DispatchTrace entry discriminates on `kind` (no `type` field).
//
// This module is the ONLY place in the SDK reducer that converts runtime
// instructions into wire effects. It does so through
// `@dreamboard-games/sdk/infrastructure/reducer-bundle-abi` (the single source of truth for
// wire-effect construction) rather than hand-rolling the mapping locally —
// hand-rolled mappings are how wire drift sneaks in (see the catan
// rollDie regression).
// ---------------------------------------------------------------------------

type InternalInstruction<State> = RuntimeInstructionForState<State>;

function extractContinuation<State>(
  instruction: InternalInstruction<State>,
): Wire.ContinuationToken | undefined {
  const continuation = (
    instruction as {
      continuation?: Wire.ContinuationToken | null | undefined;
    }
  ).continuation;
  if (continuation === undefined || continuation === null) return undefined;
  return {
    id: continuation.id,
    data: continuation.data as Wire.JsonValue,
  };
}

/**
 * Route one engine-internal effect through the generated builder that owns
 * its wire shape. The builder mints the effectId, enforces the correct
 * required/optional key set, and attaches the continuation privately via
 * `__continuation` so `materializeAccept` can split it out at the wire
 * boundary.
 *
 * Why dispatch through the builder instead of constructing `Wire.Effect`
 * directly? The schema + builders are the SSOT for wire shapes. Duplicating
 * that knowledge here once caused the catan rollDie bug; never again.
 */
function toPendingEffect<State>(
  instruction: InternalInstruction<State>,
  fx: Builders.EffectBuilders,
): Builders.PendingEffect {
  const continuation = extractContinuation<State>(instruction);
  switch (instruction.kind) {
    case "flow.transition":
      return fx.transition({ to: instruction.to as string }, continuation);
    case "engine.rollDie":
      return fx.rollDie(
        { dieId: (instruction as { dieId: string }).dieId },
        continuation,
      );
    case "engine.shuffleSharedZone":
      return fx.shuffleSharedZone(
        { zoneId: (instruction as { zoneId: string }).zoneId as string },
        continuation,
      );
    case "engine.shufflePlayerZone":
      return fx.shufflePlayerZone(
        {
          zoneId: (instruction as { zoneId: string }).zoneId as string,
          playerId: (instruction as { playerId: string }).playerId as string,
        },
        continuation,
      );
    default: {
      const _exhaustive: never = instruction;
      throw new Error(
        `toPendingEffect: unsupported instruction kind '${(_exhaustive as { kind: string }).kind}'.`,
      );
    }
  }
}

function toWireReduceResult<State>(
  result:
    | ReducerReject
    | {
        type: "accept";
        state: State;
        instructions?: InternalInstruction<State>[];
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
  const mint = Builders.createEffectIdMinter();
  const fx = Builders.createEffectBuilders(mint);
  const pending = (result.instructions ?? []).map((instruction) =>
    toPendingEffect<State>(instruction, fx),
  );
  const { effects, continuations } = Builders.materializeAccept(pending);
  return {
    kind: "accept",
    state: serializeState(result.state),
    effects,
    continuations,
  };
}

function toWireDispatchResult<State, PlayerId extends string>(
  result:
    | ReducerReject
    | {
        type: "accept";
        state: State;
        trace: DispatchTraceEntry<State, PlayerId>[];
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
  const mint = Builders.createEffectIdMinter();
  const fx = Builders.createEffectBuilders(mint);
  const trace: Wire.DispatchTrace[] = [];
  for (const entry of result.trace) {
    switch (entry.type) {
      case "acceptedClientInput": {
        const engineInput = entry.input as {
          kind: "interaction" | "continuation";
          playerId?: string;
          interactionId?: string;
          params?: Wire.JsonValue;
        };
        let wireInput: Wire.GameInput;
        if (engineInput.kind === "interaction") {
          wireInput = {
            kind: "interaction",
            playerId: engineInput.playerId ?? "",
            interactionId: engineInput.interactionId ?? "",
            params: engineInput.params ?? {},
          };
        } else {
          // Continuation inputs are engine-internal and shouldn't appear in
          // client-addressed dispatch traces; synthesize a best-effort wire
          // shape so the trace stays well-typed.
          wireInput = {
            kind: "interaction",
            playerId: "",
            interactionId: "",
            params: {},
          };
        }
        trace.push({
          kind: "acceptedClientInput",
          input: wireInput,
        });
        break;
      }
      case "appliedInstruction": {
        const pending = toPendingEffect<State>(
          entry.instruction as InternalInstruction<State>,
          fx,
        );
        const { effects, continuations } = Builders.materializeAccept([
          pending,
        ]);
        const [wireEffect] = effects;
        if (wireEffect === undefined) {
          throw new Error(
            "materializeAccept returned no effects for a single pending effect",
          );
        }
        const continuation = continuations[wireEffect.effectId];
        trace.push(
          continuation === undefined
            ? { kind: "appliedEffect", effect: wireEffect }
            : { kind: "appliedEffect", effect: wireEffect, continuation },
        );
        break;
      }
      case "rngConsumption":
        trace.push({
          kind: "rngConsumption",
          operation: entry.operation,
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
    trace,
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

export function createReducerBundle<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(
  definition: ReducerGameDefinition<Contract, Definitions, Views>,
): ReducerBundle {
  type Definition = ReducerGameDefinition<Contract, Definitions, Views>;
  const trustedBundle = createTrustedReducerBundle(definition);
  const codec = createIngressRuntimeCodec(definition);
  type Manifest = ManifestContractOf<Definition["contract"]>;
  type TrustedState = Awaited<ReturnType<typeof trustedBundle.initialize>>;

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

  const bundle = {
    ...trustedBundle,
    // Top-level protocol version. The Kotlin ReducerBundleAdapter reads this
    // on bundle load and rejects bundles whose major version does not match
    // the host's compiled-in REDUCER_CONTRACT_VERSION.
    reducerContractVersion: REDUCER_CONTRACT_VERSION,
    async initialize({
      table,
      playerIds,
      rngSeed,
      setup,
    }: Wire.InitializeRequest) {
      const { table: parsedTable, playerIds: parsedPlayerIds } =
        codec.parseInitialTable(
          table as unknown as Parameters<typeof codec.parseInitialTable>[0],
          playerIds,
        );
      return codec.serializeState(
        await trustedBundle.initialize({
          table: parsedTable,
          playerIds: parsedPlayerIds,
          rngSeed,
          setup: setup as RuntimeSetupSelectionInput<Manifest> | null,
        }),
      );
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
     * thereafter merges it back into every seat view on the client. Returns
     * `null` when `defineGame` did not declare a `staticView`.
     */
    projectStatic() {
      return trustedBundle.projectStatic() as Wire.BoardStaticProjection | null;
    },
    /**
     * Wire-side passthrough for per-tick seat projection. The seat views carry
     * only the fields produced by `defineView`; static topology, when present,
     * was served once via `projectStatic` and is re-merged on the client.
     */
    projectSeatsDynamic({
      state,
      playerIds,
      viewId = "player",
    }: Wire.ProjectSeatsDynamicRequest) {
      const parsedState = parseTrustedState(state);
      const parsedPlayerIds = playerIds.map((pid) => codec.parsePlayerId(pid));
      return trustedBundle.projectSeatsDynamic({
        state: parsedState,
        playerIds: parsedPlayerIds,
        viewId,
      }) as Wire.SeatProjectionBundle;
    },
    projectSeatViewDynamic({ state, playerId, viewId = "player" }) {
      const parsedState = parseTrustedState(state);
      return trustedBundle.projectSeatViewDynamic({
        state: parsedState,
        playerId: parseRuntimePlayerId(playerId),
        viewId,
      });
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
        async initialize({ table, playerIds, rngSeed, setup }) {
          const { table: parsedTable, playerIds: parsedPlayerIds } =
            codec.parseInitialTable(
              table as Parameters<typeof codec.parseInitialTable>[0],
              playerIds,
            );
          state = await trustedBundle.initialize({
            table: parsedTable,
            playerIds: parsedPlayerIds,
            rngSeed,
            setup: setup as RuntimeSetupSelectionInput<Manifest> | null,
          });
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
        projectSeatViewDynamic({ playerId, viewId = "player" }) {
          return trustedBundle.projectSeatViewDynamic({
            state: requireState(),
            playerId: parseRuntimePlayerId(playerId),
            viewId,
          });
        },
        projectSeatsDynamic({ playerIds, viewId = "player" }) {
          const parsedPlayerIds = playerIds.map((pid) =>
            parseRuntimePlayerId(pid),
          );
          return trustedBundle.projectSeatsDynamic({
            state: requireState(),
            playerIds: parsedPlayerIds,
            viewId,
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
  } satisfies ReducerBundle;

  return bundle;
}

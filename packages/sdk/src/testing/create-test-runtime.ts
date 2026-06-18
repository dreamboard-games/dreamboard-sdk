import type {
  ReducerBundleContract,
  Wire,
} from "@dreamboard-games/reducer-contract";
import type { InteractionDescriptor } from "../runtime/reducer.js";
import {
  computePluginActionSetVersion,
  type InteractionDescriptor as ContractInteractionDescriptor,
  type ZoneHandlesSnapshot as ContractZoneHandlesSnapshot,
  type PluginGameplayFrame,
  type PluginSessionDescriptor,
} from "@dreamboard-games/plugin-runtime-contract";
import type {
  RuntimeAPI,
  SubmissionError,
  ValidationResult,
} from "../runtime/types/runtime-api.js";
import type { PluginSessionState as RuntimePluginSessionState } from "../runtime/types/runtime-api.js";
import type {
  DispatchTraceSummaryEntry,
  ReducerDiagnosticEvent,
} from "../reducer/diagnostics.js";
import { StaleContractArtifactError } from "../reducer/stale-contract-artifact-error.js";
import type { InteractionExplanationLike } from "./definitions.js";

type ReducerBundleLike = Pick<
  ReducerBundleContract,
  "projectSeatsDynamic" | "validateInput" | "dispatch"
> & {
  explainInteraction?: (input: {
    state: Wire.ReducerSessionState;
    playerId: string;
    interactionId: string;
  }) => InteractionExplanationLike;
};

type DeepReadonly<T> = T extends (...args: readonly unknown[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

type DeepMutable<T> = T extends (...args: readonly unknown[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? DeepMutable<Item>[]
    : T extends object
      ? { -readonly [Key in keyof T]: DeepMutable<T[Key]> }
      : T;

type BaseStateArtifact = {
  snapshot: DeepReadonly<Wire.ReducerSessionState>;
  fingerprint: {
    players: number;
    contractFingerprint?: string;
  };
};

type WireZoneHandles = {
  cardIds?: readonly string[];
  cardViewsById?: Readonly<Record<string, string>>;
  playableByCardId?: Readonly<Record<string, readonly string[]>>;
};

export type CreateTestRuntimeOptions = {
  baseId: string;
  baseStates: Record<string, BaseStateArtifact>;
  bundle: ReducerBundleLike;
  phase?: string;
  playerIds?: readonly string[];
  sessionId?: string;
  userId?: string | null;
  gameId?: string;
  displayNameByPlayerId?: Record<string, string>;
  contractFingerprint?: string;
  expectedBaseStateFingerprint?: string;
};

export type CreatedTestRuntime = {
  runtime: RuntimeAPI;
  getFrame(): PluginGameplayFrame;
  getSessionDescriptor(): PluginSessionDescriptor;
  players(): readonly string[];
  seat(index: number): string;
  submit(
    playerId: string,
    interactionId: string,
    params?: unknown,
  ): Promise<void>;
  validate(
    playerId: string,
    interactionId: string,
    params?: unknown,
  ): Promise<ValidationResult>;
  explain(playerId: string, interactionId: string): InteractionExplanationLike;
  diagnostics: {
    readonly events: readonly ReducerDiagnosticEvent[];
    readonly lastDispatch: {
      submissionId: string;
      trace: readonly DispatchTraceSummaryEntry[];
    } | null;
    clear(): void;
  };
};

function cloneState<T>(value: T): DeepMutable<T> {
  return structuredClone(value) as DeepMutable<T>;
}

function createSubmissionError(
  errorCode: string | undefined,
  message: string | undefined,
): SubmissionError {
  const error = new Error(message ?? "Interaction rejected") as SubmissionError;
  error.name = "SubmissionError";
  error.errorCode = errorCode;
  return error;
}

function summarizeWireTrace(
  trace: readonly unknown[] | undefined,
): DispatchTraceSummaryEntry[] {
  return (trace ?? []).flatMap((entry): DispatchTraceSummaryEntry[] => {
    if (typeof entry !== "object" || entry === null) return [];
    const record = entry as Record<string, unknown>;
    switch (record.kind) {
      case "acceptedClientInput": {
        const input =
          typeof record.input === "object" && record.input !== null
            ? (record.input as Record<string, unknown>)
            : {};
        return [
          {
            kind: "acceptedClientInput",
            interactionId: String(input.interactionId ?? ""),
            playerId: String(input.playerId ?? ""),
          },
        ];
      }
      case "appliedEffect": {
        const effect =
          typeof record.effect === "object" && record.effect !== null
            ? (record.effect as Record<string, unknown>)
            : {};
        return [
          {
            kind: "appliedInstruction",
            instruction: String(effect.kind ?? effect.type ?? "effect"),
          },
        ];
      }
      case "rngConsumption":
        return [
          {
            kind: "rngConsumption",
            operation: String(record.operation ?? ""),
            traceEntry: String(record.traceEntry ?? ""),
          },
        ];
      default:
        return [];
    }
  });
}

function readFlowState(state: Wire.ReducerSessionState): {
  currentPhase: string | null;
  activePlayers: string[];
} {
  const flow = ((
    state.domain as
      | { flow?: { currentPhase?: string; activePlayers?: string[] } }
      | undefined
  )?.flow ?? {}) as {
    currentPhase?: string;
    activePlayers?: string[];
  };
  return {
    currentPhase: flow.currentPhase ?? null,
    activePlayers: Array.isArray(flow.activePlayers) ? flow.activePlayers : [],
  };
}

function resolvePlayerIds(options: {
  baseState: BaseStateArtifact;
  explicitPlayerIds?: readonly string[];
}): string[] {
  if (options.explicitPlayerIds && options.explicitPlayerIds.length > 0) {
    return [...options.explicitPlayerIds];
  }
  return Array.from(
    { length: options.baseState.fingerprint.players },
    (_, index) => `player-${index + 1}`,
  );
}

function isWireZoneHandles(value: unknown): value is WireZoneHandles {
  return typeof value === "object" && value !== null;
}

function buildPluginFrame(options: {
  state: Wire.ReducerSessionState;
  bundle: ReducerBundleLike;
  playerId: string;
  version: number;
  expectedPhase: string | undefined;
  baseId: string;
}): PluginGameplayFrame {
  const projection = options.bundle.projectSeatsDynamic({
    state: options.state,
    playerIds: [options.playerId],
  });

  const flow = readFlowState(options.state);
  if (options.expectedPhase && flow.currentPhase !== options.expectedPhase) {
    throw new Error(
      `Expected base '${options.baseId}' to be in phase '${options.expectedPhase}', received '${
        flow.currentPhase ?? "null"
      }'.`,
    );
  }

  const interactionsByRef =
    (projection.interactionsByRef as
      | Record<string, InteractionDescriptor>
      | undefined) ?? {};
  const hydrateRefs = (
    refs: readonly string[] | undefined,
  ): ContractInteractionDescriptor[] =>
    (refs ?? [])
      .map((ref) => interactionsByRef[ref])
      .filter((descriptor): descriptor is InteractionDescriptor =>
        Boolean(descriptor),
      ) as ContractInteractionDescriptor[];

  const seat = projection.seats?.[options.playerId];
  const zones = Object.fromEntries(
    Object.entries(
      (seat?.zones as Record<string, unknown> | undefined) ?? {},
    ).map(([zoneId, zoneValue]) => {
      const zone = isWireZoneHandles(zoneValue) ? zoneValue : {};
      return [
        zoneId,
        {
          cardIds: [...(zone.cardIds ?? [])],
          cardViewsById: { ...(zone.cardViewsById ?? {}) },
          playableByCardId: Object.fromEntries(
            Object.entries(zone.playableByCardId ?? {}).map(
              ([cardId, refs]) => [cardId, hydrateRefs(refs)],
            ),
          ),
        } satisfies ContractZoneHandlesSnapshot,
      ];
    }),
  ) as PluginGameplayFrame["zones"];

  const availableInteractions = hydrateRefs(
    seat?.availableInteractionRefs as readonly string[] | undefined,
  );
  return {
    gameVersion: options.version,
    actionSetVersion: computePluginActionSetVersion({
      gameVersion: options.version,
      availableInteractions,
    }),
    perspectivePlayerId: options.playerId || null,
    view: seat?.view ?? null,
    flow: {
      currentPhase: flow.currentPhase,
      currentStage: projection.currentStage ?? null,
      activePlayers: flow.activePlayers,
      simultaneousPhase: projection.simultaneousPhase ?? null,
    },
    availableInteractions,
    zones,
  };
}

export function createTestRuntime(
  options: CreateTestRuntimeOptions,
): CreatedTestRuntime {
  const baseState = options.baseStates[options.baseId];
  if (!baseState) {
    throw new Error(`Unknown test base '${options.baseId}'.`);
  }
  const expectedBaseStateFingerprint =
    options.expectedBaseStateFingerprint ??
    baseState.fingerprint.contractFingerprint;
  if (
    options.contractFingerprint &&
    expectedBaseStateFingerprint &&
    options.contractFingerprint !== expectedBaseStateFingerprint
  ) {
    throw new StaleContractArtifactError({
      artifact: "base-states",
      expected: options.contractFingerprint,
      found: expectedBaseStateFingerprint,
    });
  }

  let currentState = cloneState(baseState.snapshot);
  const playerIds = resolvePlayerIds({
    baseState,
    explicitPlayerIds: options.playerIds,
  });
  const sessionId = options.sessionId ?? "test-session";
  const sessionDescriptor: PluginSessionDescriptor = {
    sessionId,
    players: playerIds.map((playerId) => ({
      playerId,
      displayName: options.displayNameByPlayerId?.[playerId] ?? playerId,
    })),
  };

  let version = 0;
  let submissionCounter = 0;
  const currentPlayerId = playerIds[0] ?? "";
  const diagnosticEvents: ReducerDiagnosticEvent[] = [];
  let lastDispatch: {
    submissionId: string;
    trace: readonly DispatchTraceSummaryEntry[];
  } | null = null;
  const toReadySessionState = (
    frame: PluginGameplayFrame,
  ): RuntimePluginSessionState => ({
    status: "ready",
    sessionId,
    controllingPlayerId: frame.perspectivePlayerId,
  });

  let lastPluginFrame: PluginGameplayFrame;
  let lastSessionState: RuntimePluginSessionState;

  const applyCurrentState = (): void => {
    version += 1;
    lastPluginFrame = buildPluginFrame({
      state: currentState,
      bundle: options.bundle,
      playerId: currentPlayerId,
      version,
      expectedPhase: version === 1 ? options.phase : undefined,
      baseId: options.baseId,
    });
    lastSessionState = toReadySessionState(lastPluginFrame);
  };

  applyCurrentState();

  const validate = async (
    playerId: string,
    interactionId: string,
    params: unknown = {},
  ): Promise<ValidationResult> => {
    const result = await options.bundle.validateInput({
      state: currentState,
      input: {
        kind: "interaction",
        playerId,
        interactionId,
        params: params as Wire.JsonValue,
      },
    });
    return {
      valid: result.valid,
      errorCode: result.errorCode,
      message: result.message,
    };
  };

  const submit = async (
    playerId: string,
    interactionId: string,
    params: unknown = {},
  ): Promise<void> => {
    submissionCounter += 1;
    const submissionId = `sub-${submissionCounter}`;
    diagnosticEvents.push({
      type: "submitReceived",
      submissionId,
      playerId,
      interactionId,
      phase: readFlowState(currentState).currentPhase ?? "",
    });
    const validation = await validate(playerId, interactionId, params);
    if (!validation.valid) {
      diagnosticEvents.push({
        type: "submitRejected",
        submissionId,
        errorCode: validation.errorCode ?? "invalid-action",
        ...(validation.message ? { message: validation.message } : {}),
      });
      throw createSubmissionError(validation.errorCode, validation.message);
    }
    const result = await options.bundle.dispatch({
      state: currentState,
      input: {
        kind: "interaction",
        playerId,
        interactionId,
        params: params as Wire.JsonValue,
      },
    });
    if (result.kind === "reject") {
      diagnosticEvents.push({
        type: "submitRejected",
        submissionId,
        errorCode: result.errorCode,
        ...(result.message ? { message: result.message } : {}),
      });
      throw createSubmissionError(result.errorCode, result.message);
    }
    const trace = summarizeWireTrace(result.trace);
    lastDispatch = { submissionId, trace };
    diagnosticEvents.push({
      type: "submitAccepted",
      submissionId,
      trace,
    });
    currentState = cloneState(result.state);
    applyCurrentState();
  };

  const explain = (
    playerId: string,
    interactionId: string,
  ): InteractionExplanationLike => {
    if (!options.bundle.explainInteraction) {
      throw new Error(
        "This reducer bundle does not expose explainInteraction().",
      );
    }
    return options.bundle.explainInteraction({
      state: currentState,
      playerId,
      interactionId,
    });
  };

  const runtime = {
    validateInteraction: (interactionId: string, params?: unknown) =>
      validate(currentPlayerId, interactionId, params),
    submitInteraction: (interactionId: string, params?: unknown) =>
      submit(currentPlayerId, interactionId, params),
    getSessionState: (): RuntimePluginSessionState => lastSessionState,
    disconnect: () => undefined,
  };

  return {
    runtime,
    getFrame: () => lastPluginFrame,
    getSessionDescriptor: () => sessionDescriptor,
    players: () => [...playerIds],
    seat: (index: number) => {
      if (!Number.isInteger(index) || index < 0 || index >= playerIds.length) {
        throw new Error(
          `seat(${index}) is out of range; base '${options.baseId}' has ${playerIds.length} player(s).`,
        );
      }
      return playerIds[index]!;
    },
    submit,
    validate,
    explain,
    diagnostics: {
      get events() {
        return diagnosticEvents;
      },
      get lastDispatch() {
        return lastDispatch;
      },
      clear() {
        diagnosticEvents.length = 0;
        lastDispatch = null;
      },
    },
  };
}

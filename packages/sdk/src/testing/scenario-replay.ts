import type { Wire } from "@dreamboard-games/reducer-contract";
import { digestPluginRuntimeJson } from "@dreamboard-games/plugin-runtime-contract";
import { createReducerBundle } from "../reducer/bundle.js";
import type {
  DispatchTraceSummaryEntry,
  ReducerDiagnosticEvent,
} from "../reducer/diagnostics.js";
import { createExpectApi } from "./create-expect-api.js";
import {
  ScenarioDefinitionValidationError,
  ScenarioReplayError,
  type AssertScenarioOptions,
  type InteractionDescriptorLike,
  type InteractionExplanationLike,
  type ReplayScenarioOptions,
  type RejectionExpectation,
  type ScenarioAssertionContext,
  type ScenarioCheckpoint,
  type ScenarioCommandOf,
  type ScenarioCommandTraceEntry,
  type ScenarioDefinition,
  type ScenarioDiagnostics,
  type ScenarioProbeResult,
  type ScenarioReplay,
  type ScenarioReplayDefinition,
  type ScenarioReplaySegment,
  type ScenarioSeatRef,
} from "./definitions.js";
import {
  validateScenarioDefinition,
  type ScenarioDefinitionGameLike,
} from "./scenario-definition-validation.js";
import {
  resolveScenarioCommandParams,
  resolveScenarioSeatRef,
} from "./scenario-player-refs.js";

type ScenarioGame = ScenarioDefinitionGameLike & {
  readonly contract: ScenarioDefinitionGameLike["contract"] & {
    readonly manifest: ScenarioDefinitionGameLike["contract"]["manifest"] & {
      readonly normalSetup?: {
        readonly minPlayers: number;
        readonly maxPlayers: number;
        createInitialTable(options: {
          readonly playerIds: readonly string[];
        }): unknown;
      };
    };
  };
};

type ScenarioBundle = ReturnType<typeof createReducerBundle>;

type ScenarioReplayState<Game> = {
  readonly game: Game;
  readonly scenario: ScenarioReplayDefinition<Game>;
  readonly playerIds: readonly string[];
  readonly reducerState: Wire.ReducerSessionState;
  readonly checkpoint: ScenarioCheckpoint;
  readonly trace: readonly ScenarioCommandTraceEntry<Game>[];
  readonly events: readonly ReducerDiagnosticEvent[];
};

export async function replayScenario<
  const Game extends ScenarioDefinitionGameLike,
>(options: ReplayScenarioOptions<Game>): Promise<ScenarioReplay<Game>> {
  validateReplayDefinition(options.game, options.scenario);
  const checkpoint = normalizeCheckpoint(options.scenario, options.at);
  const playerIds = resolvePlayerIds(
    options.game,
    options.scenario.setup.players,
  );
  const events: ReducerDiagnosticEvent[] = [];
  const bundle = createScenarioBundle(options.game, events);
  const normalSetup = options.game.contract.manifest.normalSetup;
  if (!normalSetup) {
    throw new ScenarioDefinitionValidationError({
      code: "NORMAL_SETUP_UNAVAILABLE",
      path: "scenario.setup.players",
      reason: "the game manifest does not expose normal setup",
    });
  }
  const table = normalSetup.createInitialTable({ playerIds });
  const reducerState = await bundle.initialize({
    table: table as Wire.JsonValue,
    playerIds: [...playerIds],
    rngSeed: options.scenario.setup.seed,
    setup:
      typeof options.scenario.setup.setupProfileId === "string"
        ? {
            profileId: options.scenario.setup.setupProfileId,
            optionValues: {},
          }
        : null,
  });

  const runtime = new ScenarioReplayImplementation<Game>({
    game: options.game,
    scenario: options.scenario,
    playerIds,
    reducerState,
    checkpoint: { segment: "setup", completed: 0 },
    trace: [],
    events,
  });
  await runtime.replayTo(checkpoint);
  return runtime;
}

export async function assertScenario<Game>(
  options: AssertScenarioOptions<Game>,
): Promise<void> {
  const replay = requireScenarioReplayImplementation(options.replay);
  if (!replay.complete) {
    throw new Error(
      `Scenario '${replay.scenarioId}' assertions require a full replay; checkpoint is ${replay.checkpoint.segment}:${replay.checkpoint.completed}.`,
    );
  }
  const context: ScenarioAssertionContext<Game> = {
    expect: createExpectApi({
      lastDiagnosticRejection: () => lastRejectedEvent(replay.diagnostics),
    }),
    state: replay.state,
    view: replay.view,
    interactions: replay.interactions,
    explain: replay.explain,
    get diagnostics() {
      return replay.diagnostics;
    },
    probe: (command) => replay.probe(command),
  };
  await options.assertion(context);
}

export async function probeScenarioCommand<Game>(options: {
  readonly replay: ScenarioReplay<Game>;
  readonly command: ScenarioCommandOf<Game>;
}): Promise<ScenarioProbeResult<Game>> {
  return requireScenarioReplayImplementation(options.replay).probe(
    options.command,
  );
}

class ScenarioReplayImplementation<Game> implements ScenarioReplay<Game> {
  readonly scenarioId: string;
  readonly scenario: ScenarioReplayDefinition<Game>;
  readonly game: Game;
  readonly playerIds: readonly string[];
  readonly bundle: ScenarioBundle;
  readonly events: ReducerDiagnosticEvent[];
  checkpoint: ScenarioCheckpoint;
  reducerState: Wire.ReducerSessionState;
  trace: ScenarioCommandTraceEntry<Game>[];

  constructor(state: ScenarioReplayState<Game>) {
    this.scenarioId = state.scenario.id;
    this.scenario = state.scenario;
    this.game = state.game;
    this.playerIds = [...state.playerIds];
    this.reducerState = structuredClone(state.reducerState);
    this.checkpoint = structuredClone(state.checkpoint);
    this.trace = structuredClone(
      state.trace,
    ) as ScenarioCommandTraceEntry<Game>[];
    this.events = structuredClone(state.events) as ReducerDiagnosticEvent[];
    this.bundle = createScenarioBundle(state.game as never, this.events);

    this.state = this.state.bind(this);
    this.view = this.view.bind(this);
    this.interactions = this.interactions.bind(this);
    this.explain = this.explain.bind(this);
  }

  get checkpointDigest(): string {
    return digestPluginRuntimeJson({
      digestVersion: "scenario-checkpoint@1",
      scenarioId: this.scenarioId,
      checkpoint: this.checkpoint,
      reducerState: this.reducerState,
      trace: this.trace,
    });
  }

  get complete(): boolean {
    return (
      this.checkpoint.segment === "when" &&
      this.checkpoint.completed === this.scenario.when.length
    );
  }

  get diagnostics(): ScenarioDiagnostics {
    const flow = readFlowState(this.reducerState);
    const projection = this.project(this.playerIds[0]!);
    return {
      events: structuredClone(this.events),
      lastDispatch: lastAcceptedDispatch(this.events),
      flow: {
        currentPhase: flow.currentPhase,
        currentStage: projection.currentStage ?? null,
        activeSeats: flow.activePlayers.flatMap((playerId) => {
          const seat = this.playerIds.indexOf(playerId);
          return seat < 0 ? [] : [{ seat }];
        }),
      },
    };
  }

  state(): never {
    return structuredClone(this.reducerState.domain) as never;
  }

  view(seat: ScenarioSeatRef): never {
    const playerId = this.playerId(seat, "seat");
    const projection = this.project(playerId);
    return structuredClone(projection.seats?.[playerId]?.view ?? null) as never;
  }

  interactions(seat: ScenarioSeatRef): readonly InteractionDescriptorLike[] {
    const playerId = this.playerId(seat, "seat");
    const projection = this.project(playerId);
    const refs =
      (projection.seats?.[playerId]?.availableInteractionRefs as
        | readonly string[]
        | undefined) ?? [];
    const interactionsByRef =
      (projection.interactionsByRef as
        | Readonly<Record<string, InteractionDescriptorLike>>
        | undefined) ?? {};
    return structuredClone(
      refs.flatMap((ref) => {
        const descriptor = interactionsByRef[ref];
        return descriptor ? [descriptor] : [];
      }),
    );
  }

  explain(
    seat: ScenarioSeatRef,
    interactionId: string,
  ): InteractionExplanationLike {
    return structuredClone(
      this.bundle.explainInteraction({
        state: this.reducerState,
        playerId: this.playerId(seat, "seat"),
        interactionId,
      }),
    ) as InteractionExplanationLike;
  }

  clone(): ScenarioReplay<Game> {
    return new ScenarioReplayImplementation<Game>({
      game: this.game,
      scenario: this.scenario,
      playerIds: this.playerIds,
      reducerState: this.reducerState,
      checkpoint: this.checkpoint,
      trace: this.trace,
      events: this.events,
    });
  }

  async replayTo(target: ScenarioCheckpoint): Promise<void> {
    const givenCount =
      target.segment === "setup"
        ? 0
        : target.segment === "given"
          ? target.completed
          : this.scenario.given.length;
    const whenCount = target.segment === "when" ? target.completed : 0;
    for (let index = 0; index < givenCount; index += 1) {
      await this.dispatchRequired("given", index, this.scenario.given[index]!);
    }
    this.checkpoint = { segment: "given", completed: givenCount };
    for (let index = 0; index < whenCount; index += 1) {
      await this.dispatchRequired("when", index, this.scenario.when[index]!);
    }
    this.checkpoint = structuredClone(target);
  }

  async probe(
    command: ScenarioCommandOf<Game>,
  ): Promise<ScenarioProbeResult<Game>> {
    const clone = requireScenarioReplayImplementation(this.clone());
    const result = await clone.dispatch(command, "probe", 0);
    if (result.kind === "accept") {
      const accepted = {
        kind: "accepted" as const,
        command,
        checkpointDigest: digestPluginRuntimeJson({
          digestVersion: "scenario-probe@1",
          from: this.checkpointDigest,
          command,
          reducerState: clone.reducerState,
          trace: result.trace,
        }),
        trace: result.trace,
        toBeAccepted() {},
        toRejectWith(expected: RejectionExpectation): never {
          throw new Error(
            `Expected probe to reject${expected.errorCode ? ` with ${expected.errorCode}` : ""}, but it was accepted.`,
          );
        },
      } satisfies ScenarioProbeResult<Game>;
      return accepted;
    }
    const rejected = {
      kind: "rejected" as const,
      command,
      errorCode: result.errorCode,
      ...(result.message === undefined ? {} : { message: result.message }),
      trace: result.trace,
      toBeAccepted(): never {
        throw new Error(
          `Expected probe to be accepted, but it rejected with ${result.errorCode}.`,
        );
      },
      toRejectWith(expected: RejectionExpectation): void {
        assertRejectionMatches(result, expected);
      },
    } satisfies ScenarioProbeResult<Game>;
    return rejected;
  }

  private async dispatchRequired(
    segment: ScenarioReplaySegment,
    index: number,
    command: ScenarioCommandOf<Game>,
  ): Promise<void> {
    const result = await this.dispatch(command, segment, index);
    if (result.kind === "reject") {
      throw new ScenarioReplayError({
        scenarioId: this.scenarioId,
        segment,
        index,
        interactionId: command.interactionId,
        errorCode: result.errorCode,
        reducerMessage: result.message,
        trace: result.trace,
      });
    }
    this.trace.push({
      segment,
      index,
      command: structuredClone(command),
      trace: result.trace,
    });
  }

  private async dispatch(
    command: ScenarioCommandOf<Game>,
    segment: ScenarioReplaySegment | "probe",
    index: number,
  ): Promise<
    | { readonly kind: "accept"; readonly trace: DispatchTraceSummaryEntry[] }
    | {
        readonly kind: "reject";
        readonly errorCode: string;
        readonly message?: string;
        readonly trace: DispatchTraceSummaryEntry[];
      }
  > {
    const phase = readFlowState(this.reducerState).currentPhase ?? "";
    const playerId = resolveScenarioSeatRef({
      ref: command.actor,
      playerIds: this.playerIds,
      path: `scenario.${segment}[${index}].actor`,
    });
    const params = resolveScenarioCommandParams({
      game: this.game as never,
      phase,
      interactionId: command.interactionId,
      params: command.params,
      playerIds: this.playerIds,
      path: `scenario.${segment}[${index}]`,
    });
    const result = await this.bundle.dispatch({
      state: this.reducerState,
      input: {
        kind: "interaction",
        playerId,
        interactionId: command.interactionId,
        params: params as Wire.JsonValue,
      },
    });
    if (result.kind === "reject") {
      return {
        kind: "reject",
        errorCode: result.errorCode,
        ...(result.message === undefined ? {} : { message: result.message }),
        trace: [],
      };
    }
    this.reducerState = structuredClone(result.state);
    return {
      kind: "accept",
      trace: summarizeWireTrace(result.trace),
    };
  }

  private playerId(seat: ScenarioSeatRef, path: string): string {
    return resolveScenarioSeatRef({
      ref: seat,
      playerIds: this.playerIds,
      path,
    });
  }

  private project(playerId: string): Wire.SeatProjectionBundle {
    return this.bundle.projectSeatsDynamic({
      state: this.reducerState,
      playerIds: [playerId],
    });
  }
}

function createScenarioBundle(
  game: ScenarioDefinitionGameLike,
  events: ReducerDiagnosticEvent[],
): ScenarioBundle {
  return createReducerBundle(game as never, {
    diagnostics: {
      event(event) {
        events.push(structuredClone(event));
      },
    },
  });
}

function validateReplayDefinition<Game>(
  game: ScenarioDefinitionGameLike,
  replay: ScenarioReplayDefinition<Game>,
): void {
  validateScenarioDefinition(game, {
    ...replay,
    then: () => undefined,
  });
}

function resolvePlayerIds(
  game: ScenarioDefinitionGameLike,
  count: number,
): string[] {
  const declared = game.contract.manifest.literals.playerIds;
  return Array.from(
    { length: count },
    (_, index) => declared[index] ?? `player-${index + 1}`,
  );
}

function normalizeCheckpoint<Game>(
  scenario: ScenarioReplayDefinition<Game>,
  checkpoint: ScenarioCheckpoint | undefined,
): ScenarioCheckpoint {
  if (checkpoint === undefined) {
    return { segment: "when", completed: scenario.when.length };
  }
  const maximum =
    checkpoint.segment === "setup"
      ? 0
      : checkpoint.segment === "given"
        ? scenario.given.length
        : scenario.when.length;
  if (
    !Number.isSafeInteger(checkpoint.completed) ||
    checkpoint.completed < 0 ||
    checkpoint.completed > maximum ||
    (checkpoint.segment === "setup" && checkpoint.completed !== 0)
  ) {
    throw new ScenarioDefinitionValidationError({
      code: "OUT_OF_RANGE",
      path: "at.completed",
      reason: `expected 0 through ${maximum} for ${checkpoint.segment}`,
    });
  }
  return structuredClone(checkpoint);
}

function readFlowState(state: Wire.ReducerSessionState): {
  readonly currentPhase: string | null;
  readonly activePlayers: readonly string[];
} {
  const flow = (state.domain as { flow?: unknown } | undefined)?.flow;
  if (typeof flow !== "object" || flow === null) {
    return { currentPhase: null, activePlayers: [] };
  }
  const record = flow as {
    readonly currentPhase?: unknown;
    readonly activePlayers?: unknown;
  };
  return {
    currentPhase:
      typeof record.currentPhase === "string" ? record.currentPhase : null,
    activePlayers: Array.isArray(record.activePlayers)
      ? record.activePlayers.filter(
          (playerId): playerId is string => typeof playerId === "string",
        )
      : [],
  };
}

function summarizeWireTrace(
  trace: readonly Wire.DispatchTrace[],
): DispatchTraceSummaryEntry[] {
  return trace.flatMap((entry): DispatchTraceSummaryEntry[] => {
    switch (entry.kind) {
      case "acceptedClientInput":
        return [
          {
            kind: "acceptedClientInput",
            interactionId: entry.input.interactionId,
            playerId: entry.input.playerId,
          },
        ];
      case "appliedEffect":
        return [
          {
            kind: "appliedInstruction",
            instruction: String(
              (
                entry.effect as {
                  readonly kind?: string;
                  readonly type?: string;
                }
              ).kind ??
                (entry.effect as { readonly type?: string }).type ??
                "effect",
            ),
          },
        ];
      case "rngConsumption":
        return [
          {
            kind: "rngConsumption",
            operation: entry.operation,
            traceEntry: entry.traceEntry,
          },
        ];
    }
  });
}

function lastAcceptedDispatch(
  events: readonly ReducerDiagnosticEvent[],
): ScenarioDiagnostics["lastDispatch"] {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.type === "submitAccepted") {
      return {
        submissionId: event.submissionId,
        trace: structuredClone(event.trace),
      };
    }
  }
  return null;
}

function lastRejectedEvent(
  diagnostics: ScenarioDiagnostics,
): Extract<ReducerDiagnosticEvent, { type: "submitRejected" }> | null {
  for (let index = diagnostics.events.length - 1; index >= 0; index -= 1) {
    const event = diagnostics.events[index];
    if (event?.type === "submitRejected") return event;
  }
  return null;
}

function assertRejectionMatches(
  rejection: { readonly errorCode: string; readonly message?: string },
  expected: RejectionExpectation,
): void {
  if (
    expected.errorCode !== undefined &&
    rejection.errorCode !== expected.errorCode
  ) {
    throw new Error(
      `Expected rejection errorCode '${expected.errorCode}', received '${rejection.errorCode}'.`,
    );
  }
  if (
    typeof expected.message === "string" &&
    rejection.message !== expected.message
  ) {
    throw new Error(
      `Expected rejection message '${expected.message}', received '${rejection.message ?? "undefined"}'.`,
    );
  }
  if (
    expected.message instanceof RegExp &&
    !expected.message.test(rejection.message ?? "")
  ) {
    throw new Error(
      `Expected rejection message '${rejection.message ?? ""}' to match ${String(expected.message)}.`,
    );
  }
}

function requireScenarioReplayImplementation<Game>(
  replay: ScenarioReplay<Game>,
): ScenarioReplayImplementation<Game> {
  if (!(replay instanceof ScenarioReplayImplementation)) {
    throw new Error(
      "Scenario replay was not created by replayScenario(); alternate replay implementations are not supported.",
    );
  }
  return replay;
}

import type { InteractionDescriptorLike } from "../definitions.js";
import type {
  ScenarioCheckpoint,
  ScenarioCommandTraceEntry,
  ScenarioReplay,
  ScenarioReplayDefinition,
} from "../definitions.js";
import type { ScenarioDefinitionGameLike } from "../scenario-definition-validation.js";
import {
  inspectScenarioReplayAuthority,
  replayScenario,
} from "../scenario-replay.js";
import { createFlowDiagnostic } from "./flow-diagnostic.js";
import type {
  ActorRef,
  InspectAction,
  InspectInteraction,
  InspectNode,
  InspectScenarioResult,
  PerspectiveRef,
  PerspectiveSelector,
  ScenarioDispatchTraceEntry,
  ScenarioIdentity,
  Sha256Digest,
} from "./types.js";

export class ScenarioInspectionError extends Error {
  readonly code:
    | "TEST_PERSPECTIVE_INVALID"
    | "TEST_SCENARIO_INVALID"
    | "TEST_SEED_RANGE_INVALID";
  readonly context: Readonly<Record<string, string | number | boolean>>;

  constructor(options: {
    readonly code: ScenarioInspectionError["code"];
    readonly message: string;
    readonly context?: Readonly<Record<string, string | number | boolean>>;
  }) {
    super(options.message);
    this.name = "ScenarioInspectionError";
    this.code = options.code;
    this.context = options.context ?? {};
  }
}

export type InspectScenarioOptions<Game extends ScenarioDefinitionGameLike> = {
  readonly game: Game;
  readonly scenario: ScenarioReplayDefinition<Game>;
  readonly identity: ScenarioIdentity;
  readonly perspective: PerspectiveSelector;
  readonly at?: ScenarioCheckpoint;
  readonly seed?: number;
};

export async function inspectScenario<
  const Game extends ScenarioDefinitionGameLike,
>(options: InspectScenarioOptions<Game>): Promise<InspectScenarioResult> {
  assertScenarioIdentity(options.identity, options.scenario);
  assertSeed(options.seed);
  const selectedScenario =
    options.seed === undefined
      ? options.scenario
      : {
          ...options.scenario,
          setup: { ...options.scenario.setup, seed: options.seed },
        };
  const checkpoint =
    options.at ??
    ({
      segment: "given",
      completed: selectedScenario.given.length,
    } satisfies ScenarioCheckpoint);
  const replay = await replayScenario({
    game: options.game,
    scenario: selectedScenario,
    at: checkpoint,
  });
  const node = inspectScenarioReplayNode({
    replay,
    perspective: options.perspective,
  });
  return {
    schemaVersion: 1,
    scenario: structuredClone(options.identity),
    node,
    seedSource: options.seed === undefined ? "scenario" : "override",
  };
}

export function inspectScenarioReplayNode<Game>(options: {
  readonly replay: ScenarioReplay<Game>;
  readonly perspective: PerspectiveSelector;
}): InspectNode {
  const baseAuthority = inspectScenarioReplayAuthority({
    replay: options.replay,
    perspective: { kind: "spectator" },
  });
  const perspective = resolvePerspective(
    options.perspective,
    baseAuthority.scenario.setup.players,
    baseAuthority.playerIds,
  );
  const authority = inspectScenarioReplayAuthority({
    replay: options.replay,
    perspective:
      perspective.kind === "spectator"
        ? perspective
        : { kind: "player", seat: perspective.actor.seat },
  });
  const actor = perspective.kind === "player" ? perspective.actor : null;
  const interactions = actor
    ? authority.interactions.map(({ descriptor, explanation }) =>
        inspectInteraction(actor, descriptor, explanation),
      )
    : [];
  const actions = actor
    ? authority.interactions.flatMap(
        ({ descriptor, explanation, actionability }): InspectAction[] => {
          if (
            !actionability.found ||
            !actionability.visible ||
            actionability.descriptor.availability.status !== "available" ||
            actionability.inputSatisfiability?.status !== "yes"
          ) {
            return [];
          }
          return [
            {
              actor,
              interactionId: actionability.descriptor.interactionId,
              inputs: explanation.inputs,
              explanation,
              hasConcreteCommand: true,
            },
          ];
        },
      )
    : [];
  const node: InspectNode = {
    checkpoint: authority.checkpoint,
    checkpointDigest: authority.checkpointDigest as Sha256Digest,
    setup: structuredClone(authority.scenario.setup),
    flow: createFlowDiagnostic({
      playerIds: authority.playerIds,
      scheduler: authority.scheduler,
    }),
    perspective,
    publicState: authority.publicState,
    view: authority.view,
    interactions,
    actions,
    entropy: {
      seed: authority.entropy.seed ?? authority.scenario.setup.seed,
      draws: structuredClone(authority.entropy.draws),
    },
    dispatchTrace: projectDispatchTrace(
      authority.commandTrace,
      authority.playerIds,
      perspective,
    ),
  };
  return node;
}

function resolvePerspective(
  selector: PerspectiveSelector,
  playerCount: number,
  declaredPlayerIds: readonly string[],
): PerspectiveRef {
  if (selector.kind === "spectator") return { kind: "spectator" };
  const seat = selector.seat;
  if (!Number.isSafeInteger(seat) || seat < 0 || seat >= playerCount) {
    throw new ScenarioInspectionError({
      code: "TEST_PERSPECTIVE_INVALID",
      message: `Perspective seat ${String(seat)} is outside this ${playerCount}-player scenario.`,
      context: {
        requestedSeat: seat,
        minimumSeat: 0,
        maximumSeat: Math.max(0, playerCount - 1),
      },
    });
  }
  return {
    kind: "player",
    actor: {
      seat,
      playerId: declaredPlayerIds[seat] ?? `player-${seat + 1}`,
    },
  };
}

function inspectInteraction(
  actor: ActorRef,
  descriptor: InteractionDescriptorLike,
  explanation: InspectInteraction["explanation"],
): InspectInteraction {
  const availability = descriptor.availability ?? {
    status: "blocked" as const,
    reason: "Interaction descriptor has no availability.",
  };
  return {
    actor,
    interactionId: String(descriptor.interactionId ?? ""),
    availability: {
      status: availability.status,
      ...("code" in availability && typeof availability.code === "string"
        ? { code: availability.code }
        : {}),
      ...("reason" in availability && typeof availability.reason === "string"
        ? { reason: availability.reason }
        : {}),
    },
    inputs: explanation.inputs,
    explanation,
  };
}

function projectDispatchTrace<Game>(
  commandTrace: readonly ScenarioCommandTraceEntry<Game>[],
  playerIds: readonly string[],
  perspective: PerspectiveRef,
): ScenarioDispatchTraceEntry[] {
  if (perspective.kind === "spectator") return [];
  const selectedSeat = perspective.actor.seat;
  return commandTrace.flatMap((entry): ScenarioDispatchTraceEntry[] => {
    if (entry.command.actor.seat !== selectedSeat) return [];
    return entry.trace.flatMap((trace): ScenarioDispatchTraceEntry[] => {
      switch (trace.kind) {
        case "acceptedClientInput": {
          const seat = playerIds.indexOf(trace.playerId);
          return seat < 0
            ? []
            : [
                {
                  kind: "acceptedCommand",
                  actor: { seat, playerId: trace.playerId },
                  interactionId: trace.interactionId,
                },
              ];
        }
        case "appliedInstruction":
          return [
            {
              kind: "appliedInstruction",
              instructionKind: trace.instruction,
            },
          ];
        case "rngConsumption":
          return [{ kind: "entropyDraw", drawIndex: trace.drawIndex }];
      }
    });
  });
}

function assertScenarioIdentity<Game>(
  identity: ScenarioIdentity,
  scenario: ScenarioReplayDefinition<Game>,
): void {
  if (identity.id !== scenario.id) {
    throw new ScenarioInspectionError({
      code: "TEST_SCENARIO_INVALID",
      message: "Scenario identity does not match the authored default export.",
      context: { identityId: identity.id, scenarioId: scenario.id },
    });
  }
}

function assertSeed(seed: number | undefined): void {
  if (seed !== undefined && !Number.isSafeInteger(seed)) {
    throw new ScenarioInspectionError({
      code: "TEST_SEED_RANGE_INVALID",
      message: "Seed override must be a safe integer.",
      context: { requestedSeed: seed },
    });
  }
}

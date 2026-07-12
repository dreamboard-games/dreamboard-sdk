import {
  advanceScenarioReplay,
  enumerateScenarioInteractionParams,
  replayScenario,
} from "../scenario-replay.js";
import type {
  ScenarioCheckpoint,
  ScenarioCommand,
  ScenarioReplay,
  ScenarioReplayDefinition,
} from "../definitions.js";
import { ScenarioReplayError } from "../definitions.js";
import type { ScenarioDefinitionGameLike } from "../scenario-definition-validation.js";
import { projectScenarioCommandParams } from "../scenario-player-refs.js";
import {
  compareCanonicalScenarioJson,
  digestScenarioJson,
} from "../canonical.js";
import {
  inspectScenario,
  inspectScenarioReplayNode,
  type InspectScenarioOptions,
} from "../inspection/inspect-scenario.js";
import type {
  PerspectiveSelector,
  InspectNode,
  ScenarioIdentity,
  Sha256Digest,
} from "../inspection/types.js";
import { createExploreCursor, readExploreCursor } from "./cursor.js";
import type {
  ExploreScenarioResult,
  ExploreSeedResult,
  ExploreTransitionResult,
} from "./types.js";

export const DEFAULT_EXPLORE_LIMIT = 50;
export const MAX_EXPLORE_LIMIT = 200;
export const DEFAULT_EXPLORE_EVALUATIONS = 5_000;
export const MAX_EXPLORE_EVALUATIONS = 100_000;
export const MAX_EXPLORE_SEEDS = 64;

export class ScenarioExploreError extends Error {
  readonly code: "TEST_EXPLORE_LIMIT_INVALID" | "TEST_SEED_RANGE_INVALID";
  readonly context: Readonly<Record<string, string | number | boolean>>;

  constructor(options: {
    readonly code: ScenarioExploreError["code"];
    readonly message: string;
    readonly context: Readonly<Record<string, string | number | boolean>>;
  }) {
    super(options.message);
    this.name = "ScenarioExploreError";
    this.code = options.code;
    this.context = options.context;
  }
}

type SeedRange = {
  readonly start: number;
  readonly end: number;
};

export type ExploreScenarioOptions<Game extends ScenarioDefinitionGameLike> =
  Omit<InspectScenarioOptions<Game>, "seed"> & {
    readonly seed?: number;
    readonly seedRange?: SeedRange;
    readonly limit?: number;
    readonly maxEvaluations?: number;
    readonly cursor?: string;
  };

export async function exploreScenario<
  const Game extends ScenarioDefinitionGameLike,
>(options: ExploreScenarioOptions<Game>): Promise<ExploreScenarioResult> {
  if (options.seedRange) {
    if (
      options.seed !== undefined ||
      options.cursor !== undefined ||
      options.limit !== undefined
    ) {
      throw new ScenarioExploreError({
        code: "TEST_SEED_RANGE_INVALID",
        message:
          "Seed-range exploration cannot be combined with a seed override, cursor, or transition-page limit.",
        context: { start: options.seedRange.start, end: options.seedRange.end },
      });
    }
    return exploreSeeds(options, options.seedRange);
  }
  return exploreTransitions(options);
}

async function exploreTransitions<Game extends ScenarioDefinitionGameLike>(
  options: ExploreScenarioOptions<Game>,
): Promise<ExploreTransitionResult> {
  const limit = options.limit ?? DEFAULT_EXPLORE_LIMIT;
  const maxEvaluations = options.maxEvaluations ?? DEFAULT_EXPLORE_EVALUATIONS;
  assertTransitionLimits(limit, maxEvaluations);
  const selectedScenario = scenarioWithSeed(options.scenario, options.seed);
  const checkpoint = defaultCheckpoint(selectedScenario, options.at);
  const replay = await replayScenario({
    game: options.game,
    scenario: selectedScenario,
    at: checkpoint,
  });
  const node = inspectScenarioReplayNode({
    replay,
    perspective: options.perspective,
  });
  const startOrdinal = options.cursor
    ? readExploreCursor({
        cursor: options.cursor,
        scenario: options.identity,
        checkpointDigest: node.checkpointDigest,
        perspective: node.perspective,
        seedOverride: options.seed,
      })
    : 0;
  if (node.perspective.kind === "spectator") {
    return {
      schemaVersion: 1,
      mode: "transitions",
      scenario: options.identity,
      perspective: node.perspective,
      node,
      candidates: [],
      omissions: [],
      page: {
        limit,
        evaluated: 0,
        truncated: false,
        nextCursor: null,
      },
    };
  }

  const accepted: ExploreTransitionResult["candidates"][number][] = [];
  const omissions: ExploreTransitionResult["omissions"][number][] = [];
  let evaluated = 0;
  for (const action of node.actions) {
    const remaining = maxEvaluations - evaluated;
    if (remaining <= 0) {
      omissions.push({
        actor: action.actor,
        interactionId: action.interactionId,
        code: "INPUT_DOMAIN_BUDGET",
      });
      continue;
    }
    const enumeration = enumerateScenarioInteractionParams({
      replay,
      seat: action.actor.seat,
      interactionId: action.interactionId,
      maxEvaluations: remaining,
    });
    if (
      !enumeration.found ||
      !enumeration.visible ||
      !enumeration.enumeration
    ) {
      continue;
    }
    evaluated += enumeration.enumeration.evaluated;
    if (enumeration.enumeration.status !== "enumerated") {
      omissions.push({
        actor: action.actor,
        interactionId: action.interactionId,
        code:
          enumeration.enumeration.status === "budget"
            ? "INPUT_DOMAIN_BUDGET"
            : "INPUT_DOMAIN_NOT_ENUMERABLE",
        ...(enumeration.enumeration.inputKey
          ? { inputKey: enumeration.enumeration.inputKey }
          : {}),
      });
      continue;
    }
    const assignments = [...enumeration.enumeration.assignments].sort(
      compareCanonicalScenarioJson,
    );
    for (const assignment of assignments) {
      const command: ScenarioCommand = {
        actor: { seat: action.actor.seat },
        interactionId: action.interactionId,
        params: projectScenarioCommandParams({
          game: options.game,
          phase: node.flow.phase,
          interactionId: action.interactionId,
          params: assignment,
          playerIds: node.setup.players
            ? Array.from(
                { length: node.setup.players },
                (_, seat) =>
                  options.game.contract.manifest.literals.playerIds[seat] ??
                  `player-${seat + 1}`,
              )
            : [],
          path: `explore.${action.interactionId}`,
        }),
      };
      const advanced = await advanceScenarioReplay({
        replay,
        command: command as never,
      });
      if (advanced.kind !== "accepted") continue;
      const afterNode = inspectScenarioReplayNode({
        replay: advanced.replay,
        perspective: options.perspective,
      });
      accepted.push({
        ordinal: accepted.length,
        command,
        after: {
          checkpointDigest: afterNode.checkpointDigest,
          flow: afterNode.flow,
          publicStateDigest: digestScenarioJson(
            afterNode.publicState,
          ) as Sha256Digest,
          viewDigest: digestScenarioJson(afterNode.view) as Sha256Digest,
          actions: afterNode.actions.map(({ actor, interactionId }) => ({
            actor,
            interactionId,
          })),
          entropy: afterNode.entropy,
          dispatchTrace: afterNode.dispatchTrace,
        },
      });
    }
  }

  const candidates = accepted.slice(startOrdinal, startOrdinal + limit);
  const nextOrdinal = startOrdinal + candidates.length;
  const truncated = nextOrdinal < accepted.length;
  return {
    schemaVersion: 1,
    mode: "transitions",
    scenario: structuredClone(options.identity),
    perspective: node.perspective,
    node,
    candidates,
    omissions,
    page: {
      limit,
      evaluated,
      truncated,
      nextCursor: truncated
        ? createExploreCursor({
            scenario: options.identity,
            checkpointDigest: node.checkpointDigest,
            perspective: node.perspective,
            seedOverride: options.seed,
            nextOrdinal,
          })
        : null,
    },
  };
}

async function exploreSeeds<Game extends ScenarioDefinitionGameLike>(
  options: ExploreScenarioOptions<Game>,
  range: SeedRange,
): Promise<ExploreSeedResult> {
  assertSeedRange(range);
  const checkpoint = defaultCheckpoint(options.scenario, options.at);
  const variants: ExploreSeedResult["variants"][number][] = [];
  for (let seed = range.start; seed <= range.end; seed += 1) {
    try {
      const inspected = await inspectScenario({
        game: options.game,
        scenario: options.scenario,
        identity: options.identity,
        perspective: options.perspective,
        at: checkpoint,
        seed,
      });
      const replay = await replayScenario({
        game: options.game,
        scenario: scenarioWithSeed(options.scenario, seed),
        at: checkpoint,
      });
      const counts = await concreteOptionCounts({
        replay,
        node: inspected.node,
        maxEvaluations: options.maxEvaluations ?? DEFAULT_EXPLORE_EVALUATIONS,
      });
      variants.push({
        seed,
        status: "replayed",
        checkpointDigest: inspected.node.checkpointDigest,
        entropy: inspected.node.entropy,
        observable: {
          publicState: inspected.node.publicState,
          view: inspected.node.view,
        },
        signature: {
          phase: inspected.node.flow.phase,
          step: inspected.node.flow.step,
          actions: inspected.node.actions.map(({ actor, interactionId }) => ({
            seat: actor.seat,
            interactionId,
            concreteOptionCount:
              counts.get(`${actor.seat}:${interactionId}`) ?? "lazy",
          })),
        },
      });
    } catch (error) {
      if (!(error instanceof ScenarioReplayError)) throw error;
      variants.push({
        seed,
        status: "rejected",
        rejection: {
          segment: error.segment,
          sourceIndex: error.index,
          interactionId: error.interactionId,
          errorCode: error.errorCode,
        },
      });
    }
  }
  return {
    schemaVersion: 1,
    mode: "seeds",
    scenario: structuredClone(options.identity),
    perspective: (await inspectSeedPerspective(options)).node.perspective,
    checkpoint,
    variants,
  };
}

async function inspectSeedPerspective<Game extends ScenarioDefinitionGameLike>(
  options: ExploreScenarioOptions<Game>,
) {
  return inspectScenario({
    game: options.game,
    scenario: options.scenario,
    identity: options.identity,
    perspective: options.perspective,
    at: { segment: "setup", completed: 0 },
  });
}

async function concreteOptionCounts<Game>(options: {
  readonly replay: ScenarioReplay<Game>;
  readonly node: InspectNode;
  readonly maxEvaluations: number;
}): Promise<Map<string, number | "lazy">> {
  assertTransitionLimits(DEFAULT_EXPLORE_LIMIT, options.maxEvaluations);
  const counts = new Map<string, number | "lazy">();
  let evaluated = 0;
  for (const action of options.node.actions) {
    const remaining = options.maxEvaluations - evaluated;
    if (remaining <= 0) {
      counts.set(`${action.actor.seat}:${action.interactionId}`, "lazy");
      continue;
    }
    const result = enumerateScenarioInteractionParams({
      replay: options.replay,
      seat: action.actor.seat,
      interactionId: action.interactionId,
      maxEvaluations: remaining,
    });
    if (!result.found || !result.visible || !result.enumeration) continue;
    evaluated += result.enumeration.evaluated;
    counts.set(
      `${action.actor.seat}:${action.interactionId}`,
      result.enumeration.status === "enumerated"
        ? result.enumeration.assignments.length
        : "lazy",
    );
  }
  return counts;
}

function scenarioWithSeed<Game>(
  scenario: ScenarioReplayDefinition<Game>,
  seed: number | undefined,
): ScenarioReplayDefinition<Game> {
  return seed === undefined
    ? scenario
    : { ...scenario, setup: { ...scenario.setup, seed } };
}

function defaultCheckpoint<Game>(
  scenario: ScenarioReplayDefinition<Game>,
  at: ScenarioCheckpoint | undefined,
): ScenarioCheckpoint {
  return (at ?? {
    segment: "given",
    completed: scenario.given.length,
  }) as ScenarioCheckpoint;
}

function assertTransitionLimits(limit: number, maxEvaluations: number): void {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_EXPLORE_LIMIT) {
    throw new ScenarioExploreError({
      code: "TEST_EXPLORE_LIMIT_INVALID",
      message: `Explore limit must be between 1 and ${MAX_EXPLORE_LIMIT}.`,
      context: { requested: limit, minimum: 1, maximum: MAX_EXPLORE_LIMIT },
    });
  }
  if (
    !Number.isSafeInteger(maxEvaluations) ||
    maxEvaluations < 1 ||
    maxEvaluations > MAX_EXPLORE_EVALUATIONS
  ) {
    throw new ScenarioExploreError({
      code: "TEST_EXPLORE_LIMIT_INVALID",
      message: `Explore max evaluations must be between 1 and ${MAX_EXPLORE_EVALUATIONS}.`,
      context: {
        requested: maxEvaluations,
        minimum: 1,
        maximum: MAX_EXPLORE_EVALUATIONS,
      },
    });
  }
}

function assertSeedRange(range: SeedRange): void {
  const width = range.end - range.start + 1;
  if (
    !Number.isSafeInteger(range.start) ||
    !Number.isSafeInteger(range.end) ||
    range.start > range.end ||
    !Number.isSafeInteger(width) ||
    width < 1 ||
    width > MAX_EXPLORE_SEEDS
  ) {
    throw new ScenarioExploreError({
      code: "TEST_SEED_RANGE_INVALID",
      message: `Seed range must contain 1 through ${MAX_EXPLORE_SEEDS} inclusive safe-integer seeds.`,
      context: {
        start: range.start,
        end: range.end,
        maximumWidth: MAX_EXPLORE_SEEDS,
      },
    });
  }
}

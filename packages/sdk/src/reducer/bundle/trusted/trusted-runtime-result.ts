import { assertJsonWithinLimits } from "../../../runtime-json";
import type {
  GameEvent,
  GameEventDetail,
  GameOutcome,
  OutcomeScoreComponent,
  OutcomeStanding,
  OutcomeTieBreak,
  ReducerAcceptOptions,
  ReducerReject,
  ReducerResult,
  SystemActionEvent,
} from "../../model";

const OUTCOME_STRING_LIMIT = 256;
const OUTCOME_LABEL_LIMIT = 128;
const OUTCOME_MAX_STANDINGS = 32;
const OUTCOME_MAX_COMPONENTS = 32;
const OUTCOME_MAX_TIE_BREAKS = 16;
const GAME_EVENT_STRING_LIMIT = 256;
const GAME_EVENT_LABEL_LIMIT = 128;
const GAME_EVENT_MAX_EVENTS = 32;
const GAME_EVENT_MAX_DETAILS = 16;

function failOutcome(message: string): never {
  throw new Error(`Invalid GameOutcome: ${message}`);
}

function failGameEvent(message: string): never {
  throw new Error(`Invalid GameEvent: ${message}`);
}

function assertNonEmptyBoundedString(
  value: unknown,
  label: string,
  maxLength = OUTCOME_STRING_LIMIT,
): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    failOutcome(`${label} must be a non-empty string`);
  }
  if (value.length > maxLength) {
    failOutcome(`${label} is too long`);
  }
}

function assertGameEventString(
  value: unknown,
  label: string,
  maxLength = GAME_EVENT_STRING_LIMIT,
): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    failGameEvent(`${label} must be a non-empty string`);
  }
  if (value.length > maxLength) {
    failGameEvent(`${label} is too long`);
  }
}

function assertFiniteNumber(
  value: unknown,
  label: string,
): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    failOutcome(`${label} must be a finite number`);
  }
}

function assertUniqueIds(
  entries: readonly (OutcomeScoreComponent | OutcomeTieBreak)[] | undefined,
  label: string,
): void {
  if (!entries) return;
  const seen = new Set<string>();
  for (const entry of entries) {
    assertNonEmptyBoundedString(entry.id, `${label}.id`, OUTCOME_LABEL_LIMIT);
    assertNonEmptyBoundedString(
      entry.label,
      `${label}.label`,
      OUTCOME_LABEL_LIMIT,
    );
    if (seen.has(entry.id)) {
      failOutcome(`${label} contains duplicate id '${entry.id}'`);
    }
    seen.add(entry.id);
  }
}

function assertStandingValues<PlayerId extends string>(
  standing: OutcomeStanding<PlayerId>,
): void {
  if (!Number.isInteger(standing.rank) || standing.rank < 1) {
    failOutcome(`standing for '${standing.playerId}' has invalid rank`);
  }
  if (
    standing.result !== "win" &&
    standing.result !== "draw" &&
    standing.result !== "loss" &&
    standing.result !== "eliminated"
  ) {
    failOutcome(`standing for '${standing.playerId}' has invalid result`);
  }
  if (standing.score !== undefined) {
    assertFiniteNumber(standing.score, `standing '${standing.playerId}'.score`);
  }
  if ((standing.scoreBreakdown?.length ?? 0) > OUTCOME_MAX_COMPONENTS) {
    failOutcome(
      `standing '${standing.playerId}' has too many score components`,
    );
  }
  if ((standing.tieBreaks?.length ?? 0) > OUTCOME_MAX_TIE_BREAKS) {
    failOutcome(`standing '${standing.playerId}' has too many tie-breaks`);
  }
  assertUniqueIds(standing.scoreBreakdown, "scoreBreakdown");
  assertUniqueIds(standing.tieBreaks, "tieBreaks");
  for (const component of standing.scoreBreakdown ?? []) {
    assertFiniteNumber(
      component.value,
      `standing '${standing.playerId}'.scoreBreakdown '${component.id}'`,
    );
  }
  for (const tieBreak of standing.tieBreaks ?? []) {
    if (typeof tieBreak.value === "number") {
      assertFiniteNumber(
        tieBreak.value,
        `standing '${standing.playerId}'.tieBreak '${tieBreak.id}'`,
      );
    } else {
      assertNonEmptyBoundedString(
        tieBreak.value,
        `standing '${standing.playerId}'.tieBreak '${tieBreak.id}'`,
        OUTCOME_LABEL_LIMIT,
      );
    }
  }
}

function normalizeGameOutcome<State, PlayerId extends string>(
  state: State,
  outcome: GameOutcome<PlayerId>,
): GameOutcome<PlayerId> {
  assertJsonWithinLimits(
    outcome,
    {
      maxDepth: 16,
      maxNodes: 2_000,
      maxStringBytes: 32_768,
      maxCollectionEntries: 1_000,
    },
    "GameOutcome",
  );
  assertNonEmptyBoundedString(
    outcome.reason?.code,
    "reason.code",
    OUTCOME_LABEL_LIMIT,
  );
  if (outcome.reason.message !== undefined) {
    assertNonEmptyBoundedString(outcome.reason.message, "reason.message");
  }
  if (outcome.standings.length === 0) {
    failOutcome("standings must not be empty");
  }
  if (outcome.standings.length > OUTCOME_MAX_STANDINGS) {
    failOutcome("standings contains too many rows");
  }

  const playerOrder = (state as { table?: { playerOrder?: readonly string[] } })
    .table?.playerOrder;
  if (!Array.isArray(playerOrder) || playerOrder.length === 0) {
    failOutcome("state.table.playerOrder must list configured players");
  }
  const playerOrderIndex = new Map(
    playerOrder.map((playerId, index) => [playerId, index]),
  );
  const seen = new Set<string>();
  for (const standing of outcome.standings) {
    assertNonEmptyBoundedString(
      standing.playerId,
      "standing.playerId",
      OUTCOME_LABEL_LIMIT,
    );
    if (!playerOrderIndex.has(standing.playerId)) {
      failOutcome(`unknown player '${standing.playerId}'`);
    }
    if (seen.has(standing.playerId)) {
      failOutcome(`duplicate player '${standing.playerId}'`);
    }
    seen.add(standing.playerId);
    assertStandingValues(standing);
  }
  for (const playerId of playerOrder) {
    if (!seen.has(playerId)) {
      failOutcome(`missing player '${playerId}'`);
    }
  }

  return {
    reason: { ...outcome.reason },
    standings: [...outcome.standings].sort((left, right) => {
      const rank = left.rank - right.rank;
      if (rank !== 0) return rank;
      return (
        (playerOrderIndex.get(left.playerId) ?? Number.MAX_SAFE_INTEGER) -
        (playerOrderIndex.get(right.playerId) ?? Number.MAX_SAFE_INTEGER)
      );
    }),
  };
}

function normalizeGameEventDetail(
  detail: GameEventDetail,
  index: number,
): GameEventDetail {
  assertGameEventString(
    detail.label,
    `details[${index}].label`,
    GAME_EVENT_LABEL_LIMIT,
  );
  if (typeof detail.value === "number") {
    assertFiniteNumber(detail.value, `details[${index}].value`);
  } else if (typeof detail.value === "string") {
    assertGameEventString(
      detail.value,
      `details[${index}].value`,
      GAME_EVENT_STRING_LIMIT,
    );
  } else if (typeof detail.value !== "boolean") {
    failGameEvent(`details[${index}].value must be string, number, or boolean`);
  }
  return {
    label: detail.label,
    value: detail.value,
  };
}

function normalizeSystemActionEvent(
  event: SystemActionEvent,
): SystemActionEvent {
  assertGameEventString(
    event.procedureId,
    "procedureId",
    GAME_EVENT_LABEL_LIMIT,
  );
  assertGameEventString(event.title, "title", GAME_EVENT_STRING_LIMIT);
  if (event.summary !== undefined) {
    assertGameEventString(event.summary, "summary", GAME_EVENT_STRING_LIMIT);
  }
  if ((event.details?.length ?? 0) > GAME_EVENT_MAX_DETAILS) {
    failGameEvent("systemAction has too many details");
  }
  return {
    kind: "systemAction",
    procedureId: event.procedureId,
    title: event.title,
    ...(event.summary !== undefined ? { summary: event.summary } : {}),
    ...(event.details !== undefined
      ? {
          details: event.details.map((detail, index) =>
            normalizeGameEventDetail(detail, index),
          ),
        }
      : {}),
  };
}

function normalizeGameEvents(events: readonly GameEvent[] = []): GameEvent[] {
  assertJsonWithinLimits(
    events,
    {
      maxDepth: 8,
      maxNodes: 1_000,
      maxStringBytes: 32_768,
      maxCollectionEntries: 1_000,
    },
    "GameEvent",
  );
  if (events.length > GAME_EVENT_MAX_EVENTS) {
    failGameEvent("accepted result has too many events");
  }
  return events.map((event, index) => {
    if (event.kind !== "systemAction") {
      failGameEvent(`events[${index}].kind is unsupported`);
    }
    return normalizeSystemActionEvent(event);
  });
}

export function acceptResult<State>(
  state: State,
  options: ReducerAcceptOptions<State> = {},
) {
  const events = normalizeGameEvents(options.events);
  return {
    type: "accept" as const,
    state,
    instructions: [...(options.instructions ?? [])],
    events,
  };
}

export function endGameResult<State, PlayerId extends string = string>(
  state: State,
  outcome: GameOutcome<PlayerId>,
  options: ReducerAcceptOptions<State> = {},
) {
  const terminal = normalizeGameOutcome(state, outcome);
  const events = normalizeGameEvents(options.events);
  return {
    type: "accept" as const,
    state,
    instructions: [...(options.instructions ?? [])],
    events,
    terminal,
  };
}

export function rejectResult(
  errorCode: string,
  message?: string,
): ReducerReject {
  return {
    type: "reject",
    errorCode,
    message,
  };
}

export function normalizeResult<State>(
  result: ReducerResult<State> | void,
  fallbackState: State,
): ReducerResult<State> {
  if (result === undefined || result === null) {
    return acceptResult(fallbackState);
  }
  return result;
}

export const runtimeResultHelpers = {
  accept: acceptResult,
  endGame: endGameResult,
  reject: rejectResult,
};

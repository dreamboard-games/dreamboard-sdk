import type { GameOutcome } from "@dreamboard-games/sdk/reducer";
import type { PlayerId, SpaceId } from "../shared/manifest-contract";
import type { PublicState, Roll, Score, SurveyMark } from "./game-contract";

export type { PublicState };

export const CLOUDLINE_ROUND_COUNT = 8;

export const surveyTargets = [
  [2, 5, 8, 11],
  [6, 9, 3, 7],
  [10, 4, 12, 6],
  [7, 11, 5, 9],
] as const;

export const surveyCells = surveyTargets.flatMap((rowTargets, row) =>
  rowTargets.map((target, col) => ({
    id: `cell-${row}-${col}` as SpaceId,
    row,
    col,
    target,
  })),
);

export const cellById = Object.fromEntries(
  surveyCells.map((cell) => [cell.id, cell]),
) as Record<SpaceId, (typeof surveyCells)[number]>;

export function createInitialPublicState(
  playerIds: readonly PlayerId[] = [],
): PublicState {
  return {
    round: 1,
    activePlayerIndex: 0,
    playerIds: [...playerIds],
    roll: null,
    marks: Object.fromEntries(playerIds.map((playerId) => [playerId, {}])),
    completed: false,
    scores: null,
    outcome: null,
  };
}

export function publishWeatherReading(
  state: PublicState,
  dice: readonly [number, number],
): PublicState {
  for (const [index, value] of dice.entries()) {
    if (!Number.isSafeInteger(value) || value < 1 || value > 6) {
      throw new Error(
        `Cloudline die ${index + 1} must be an integer from 1 through 6.`,
      );
    }
  }
  const roll: Roll = {
    round: state.round,
    dice: [dice[0], dice[1]],
    total: dice[0] + dice[1],
  };
  return {
    ...state,
    activePlayerIndex: 0,
    roll,
  };
}

export function activePlayerId(state: PublicState): PlayerId | null {
  if (state.completed || state.roll === null) return null;
  return state.playerIds[state.activePlayerIndex] ?? null;
}

export function emptyCells(state: PublicState, playerId: PlayerId): SpaceId[] {
  const marks = state.marks[playerId] ?? {};
  return surveyCells
    .map((cell) => cell.id)
    .filter((cellId) => marks[cellId] === undefined);
}

export function legalSurveyTargets(
  state: PublicState,
  playerId = activePlayerId(state),
): SpaceId[] {
  if (
    !playerId ||
    !state.roll ||
    state.completed ||
    playerId !== activePlayerId(state)
  ) {
    return [];
  }
  const empty = emptyCells(state, playerId);
  const matching = empty.filter(
    (cellId) => cellById[cellId]?.target === state.roll?.total,
  );
  return matching.length > 0 ? matching : empty;
}

export function validateSubmission(
  state: PublicState,
  {
    playerId = activePlayerId(state),
    cellId,
    expectedRound = state.round,
  }: {
    playerId?: PlayerId | null;
    cellId: SpaceId;
    expectedRound?: number;
  },
):
  | { ok: true; legalSpaceIds: SpaceId[] }
  | {
      ok: false;
      errorCode:
        | "CELL_ALREADY_MARKED"
        | "CELL_DOES_NOT_MATCH_ROLL"
        | "PHASE_NOT_MARKING"
        | "PLAYER_NOT_ACTIVE"
        | "STALE_SUBMISSION"
        | "UNKNOWN_CELL";
      message: string;
      legalSpaceIds?: SpaceId[];
    } {
  if (!state.roll || state.completed) {
    return {
      ok: false,
      errorCode: "PHASE_NOT_MARKING",
      message: "A survey mark can only be submitted while marking.",
    };
  }
  if (expectedRound !== state.round) {
    return {
      ok: false,
      errorCode: "STALE_SUBMISSION",
      message: "The submitted mark belongs to an earlier weather reading.",
    };
  }
  if (!playerId || playerId !== activePlayerId(state)) {
    return {
      ok: false,
      errorCode: "PLAYER_NOT_ACTIVE",
      message: "Players resolve the shared weather reading in seat order.",
    };
  }
  if (!cellById[cellId]) {
    return {
      ok: false,
      errorCode: "UNKNOWN_CELL",
      message: "The selected survey-grid cell does not exist.",
    };
  }
  if (state.marks[playerId]?.[cellId]) {
    return {
      ok: false,
      errorCode: "CELL_ALREADY_MARKED",
      message: "Choose an unmarked survey-grid cell.",
    };
  }
  const legalSpaceIds = legalSurveyTargets(state, playerId);
  if (!legalSpaceIds.includes(cellId)) {
    return {
      ok: false,
      errorCode: "CELL_DOES_NOT_MATCH_ROLL",
      message: "Choose an unmarked cell matching the weather reading.",
      legalSpaceIds,
    };
  }
  return { ok: true, legalSpaceIds };
}

function markKindForSubmission(
  state: PublicState,
  playerId: PlayerId,
): SurveyMark {
  const matching = emptyCells(state, playerId).filter(
    (cellId) => cellById[cellId]?.target === state.roll?.total,
  );
  if (matching.length === 0) {
    return { kind: "failed", round: state.round };
  }
  return {
    kind: "surveyed",
    round: state.round,
    rolledTotal: state.roll?.total ?? 0,
  };
}

export function submitSurveyMark(
  state: PublicState,
  options: {
    playerId?: PlayerId | null;
    cellId: SpaceId;
    expectedRound?: number;
  },
) {
  const playerId = options.playerId ?? activePlayerId(state);
  const validation = validateSubmission(state, {
    playerId,
    cellId: options.cellId,
    expectedRound: options.expectedRound ?? state.round,
  });
  if (!validation.ok || !playerId) {
    return { accepted: false as const, state, validation };
  }

  const mark = markKindForSubmission(state, playerId);
  const marks = {
    ...state.marks,
    [playerId]: {
      ...(state.marks[playerId] ?? {}),
      [options.cellId]: mark,
    },
  };
  const nextPlayerIndex = state.activePlayerIndex + 1;
  if (nextPlayerIndex < state.playerIds.length) {
    return {
      accepted: true as const,
      mark,
      validation,
      state: {
        ...state,
        activePlayerIndex: nextPlayerIndex,
        marks,
      },
    };
  }
  if (state.round >= CLOUDLINE_ROUND_COUNT) {
    const scores = scorePlayers(marks, state.playerIds);
    const outcome = outcomeFromScores(scores, state.playerIds);
    return {
      accepted: true as const,
      mark,
      validation,
      state: {
        ...state,
        marks,
        completed: true,
        scores,
        outcome,
      },
    };
  }
  return {
    accepted: true as const,
    mark,
    validation,
    state: {
      ...state,
      round: state.round + 1,
      activePlayerIndex: 0,
      marks,
      roll: null,
    },
  };
}

function isSurveyed(mark: SurveyMark | undefined): boolean {
  return mark?.kind === "surveyed";
}

function completeRows(marks: Record<string, SurveyMark>): number {
  return surveyTargets.filter((_, row) =>
    surveyTargets[row].every((__, col) =>
      isSurveyed(marks[`cell-${row}-${col}`]),
    ),
  ).length;
}

function completeColumns(marks: Record<string, SurveyMark>): number {
  return surveyTargets[0].filter((_, col) =>
    surveyTargets.every((__, row) => isSurveyed(marks[`cell-${row}-${col}`])),
  ).length;
}

function largestSurveyedRegion(marks: Record<string, SurveyMark>): number {
  const surveyed = new Set(
    surveyCells
      .filter((cell) => isSurveyed(marks[cell.id]))
      .map((cell) => cell.id),
  );
  const seen = new Set<SpaceId>();
  let largest = 0;
  for (const cellId of surveyed) {
    if (seen.has(cellId)) continue;
    const stack = [cellId];
    seen.add(cellId);
    let size = 0;
    while (stack.length > 0) {
      const current = stack.pop()!;
      size += 1;
      const { row, col } = cellById[current];
      const neighbors = [
        `cell-${row - 1}-${col}`,
        `cell-${row + 1}-${col}`,
        `cell-${row}-${col - 1}`,
        `cell-${row}-${col + 1}`,
      ] as SpaceId[];
      for (const neighbor of neighbors) {
        if (surveyed.has(neighbor) && !seen.has(neighbor)) {
          seen.add(neighbor);
          stack.push(neighbor);
        }
      }
    }
    largest = Math.max(largest, size);
  }
  return largest;
}

export function scorePlayerMarks(marks: Record<string, SurveyMark>): Score {
  const failedSurveyCount = Object.values(marks).filter(
    (mark) => mark.kind === "failed",
  ).length;
  const components: Score["components"] = {
    "complete-rows": completeRows(marks) * 6,
    "complete-columns": completeColumns(marks) * 6,
    "largest-region": largestSurveyedRegion(marks),
    "failed-surveys": failedSurveyCount === 0 ? 0 : failedSurveyCount * -2,
  };
  return {
    total: Object.values(components).reduce((sum, value) => sum + value, 0),
    components,
  };
}

export function scorePlayers(
  marksByPlayer: PublicState["marks"],
  playerIds = Object.keys(marksByPlayer) as PlayerId[],
): Partial<Record<PlayerId, Score>> {
  return Object.fromEntries(
    playerIds.map((playerId) => [
      playerId,
      scorePlayerMarks(marksByPlayer[playerId] ?? {}),
    ]),
  ) as Partial<Record<PlayerId, Score>>;
}

function scoreBreakdown(score: Score) {
  return [
    {
      id: "complete-rows",
      label: "Complete rows",
      value: score.components["complete-rows"],
    },
    {
      id: "complete-columns",
      label: "Complete columns",
      value: score.components["complete-columns"],
    },
    {
      id: "largest-region",
      label: "Largest region",
      value: score.components["largest-region"],
    },
    {
      id: "failed-surveys",
      label: "Failed surveys",
      value: score.components["failed-surveys"],
    },
  ] as const;
}

export function outcomeFromScores(
  scores: Partial<Record<PlayerId, Score>>,
  playerIds: readonly PlayerId[],
): GameOutcome<PlayerId> {
  const seatByPlayer = new Map(
    playerIds.map((playerId, seat) => [playerId, seat]),
  );
  const ranked = [...playerIds].sort((left, right) => {
    const scoreDelta = (scores[right]?.total ?? 0) - (scores[left]?.total ?? 0);
    return scoreDelta !== 0
      ? scoreDelta
      : (seatByPlayer.get(left) ?? 0) - (seatByPlayer.get(right) ?? 0);
  });
  const rankByPlayer = new Map<PlayerId, number>();
  let previousScore: number | undefined;
  let previousRank = 0;
  ranked.forEach((playerId, index) => {
    const score = scores[playerId]?.total ?? 0;
    const rank = score === previousScore ? previousRank : index + 1;
    rankByPlayer.set(playerId, rank);
    previousScore = score;
    previousRank = rank;
  });
  const topCount = ranked.filter(
    (playerId) => rankByPlayer.get(playerId) === 1,
  ).length;

  return {
    reason: {
      code: "EIGHT_ROUNDS_COMPLETE",
      message: "Every crew resolved all eight weather readings.",
    },
    standings: ranked.map((playerId) => {
      const rank = rankByPlayer.get(playerId) ?? 1;
      const score = scores[playerId] ?? scorePlayerMarks({});
      return {
        playerId,
        rank,
        result: rank === 1 ? (topCount === 1 ? "win" : "draw") : "loss",
        score: score.total,
        scoreBreakdown: scoreBreakdown(score),
      };
    }),
  };
}

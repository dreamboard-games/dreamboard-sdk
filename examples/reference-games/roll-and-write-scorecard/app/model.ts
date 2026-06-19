import type { PlayerId, SpaceId } from "../shared/manifest-contract";
import type { PublicState, Roll, Score, SurveyMark } from "./game-contract";

export type { PublicState };

export const cloudlineRolls = [
  { round: 1, dice: [2, 3], total: 5 },
  { round: 2, dice: [4, 3], total: 7 },
  { round: 3, dice: [6, 4], total: 10 },
  { round: 4, dice: [1, 5], total: 6 },
  { round: 5, dice: [3, 6], total: 9 },
  { round: 6, dice: [2, 2], total: 4 },
  { round: 7, dice: [5, 3], total: 8 },
  { round: 8, dice: [6, 5], total: 11 },
] as const satisfies readonly Roll[];

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

export function createInitialPublicState(playerIds: readonly PlayerId[] = []) {
  return {
    round: 1,
    activePlayerIndex: 0,
    playerIds: [...playerIds],
    roll: null,
    marks: Object.fromEntries(playerIds.map((playerId) => [playerId, {}])),
    completed: false,
    scores: null,
    outcome: null,
  } satisfies PublicState;
}

export function rollForRound(round: number): Roll {
  const roll = cloudlineRolls.find((item) => item.round === round);
  if (!roll) {
    throw new Error(`Unknown Cloudline round ${round}`);
  }
  return {
    round: roll.round,
    dice: [roll.dice[0], roll.dice[1]],
    total: roll.total,
  };
}

export function startRound(state: PublicState): PublicState {
  return {
    ...state,
    activePlayerIndex: 0,
    roll: rollForRound(state.round),
  };
}

export function activePlayerId(state: PublicState): PlayerId | null {
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
  if (!playerId || !state.roll || state.completed) return [];
  const empty = emptyCells(state, playerId);
  const matching = empty.filter(
    (cellId) => cellById[cellId]?.target === state.roll?.total,
  );
  return matching.length > 0 ? matching : empty;
}

export function createDraft(
  state: PublicState,
  options: { playerId?: PlayerId | null; cellId: SpaceId },
) {
  const playerId = options.playerId ?? activePlayerId(state);
  return {
    kind: "survey-mark" as const,
    playerId,
    cellId: options.cellId,
    round: state.round,
    rollTotal: state.roll?.total ?? null,
    validAt: `${state.round}:${state.roll?.dice.join("-") ?? "none"}`,
  };
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
      message: "The submitted draft belongs to an earlier roll.",
    };
  }
  if (!playerId || playerId !== activePlayerId(state)) {
    return {
      ok: false,
      errorCode: "PLAYER_NOT_ACTIVE",
      message: "Players resolve the shared roll in seat order.",
    };
  }
  if (!cellById[cellId]) {
    return {
      ok: false,
      errorCode: "UNKNOWN_CELL",
      message: "The selected scorecard cell does not exist.",
    };
  }
  if (state.marks[playerId]?.[cellId]) {
    return {
      ok: false,
      errorCode: "CELL_ALREADY_MARKED",
      message: "Choose an unmarked scorecard cell.",
    };
  }
  const legalSpaceIds = legalSurveyTargets(state, playerId);
  if (!legalSpaceIds.includes(cellId)) {
    return {
      ok: false,
      errorCode: "CELL_DOES_NOT_MATCH_ROLL",
      message: "Choose an unmarked cell matching the roll.",
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
  if (state.round >= cloudlineRolls.length) {
    const scores = scorePlayers(marks, state.playerIds);
    const standings = standingsFromScores(scores, state.playerIds);
    return {
      accepted: true as const,
      mark,
      validation,
      state: {
        ...state,
        marks,
        completed: true,
        scores,
        outcome: {
          reason: {
            code: "SURVEY_COMPLETE" as const,
            message: "Every player resolved all eight survey rolls.",
          },
          standings,
        },
      },
    };
  }
  return {
    accepted: true as const,
    mark,
    validation,
    state: startRound({
      ...state,
      round: state.round + 1,
      activePlayerIndex: 0,
      marks,
      roll: null,
    }),
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
  const rows = completeRows(marks);
  const columns = completeColumns(marks);
  const largestRegion = largestSurveyedRegion(marks);
  const failedSurveys = Object.values(marks).filter(
    (mark) => mark.kind === "failed",
  ).length;
  return {
    total: rows * 6 + columns * 6 + largestRegion - failedSurveys * 2,
    components: {
      completeRows: rows,
      completeColumns: columns,
      largestRegion,
      failedSurveys,
    },
  };
}

export function scorePlayers(
  marksByPlayer: PublicState["marks"],
  playerIds = Object.keys(marksByPlayer) as PlayerId[],
): Record<PlayerId, Score> {
  return Object.fromEntries(
    playerIds.map((playerId) => [
      playerId,
      scorePlayerMarks(marksByPlayer[playerId] ?? {}),
    ]),
  ) as Record<PlayerId, Score>;
}

function standingsFromScores(
  scores: Record<PlayerId, Score>,
  playerIds: PlayerId[],
) {
  const ranked = [...playerIds].sort(
    (left, right) => (scores[right]?.total ?? 0) - (scores[left]?.total ?? 0),
  );
  const best = scores[ranked[0] as PlayerId]?.total ?? 0;
  const winnerCount = ranked.filter(
    (playerId) => (scores[playerId]?.total ?? 0) === best,
  ).length;
  return ranked.map((playerId, index) => {
    const score = scores[playerId]?.total ?? 0;
    const tiedBest = score === best && winnerCount > 1;
    return {
      playerId,
      rank: tiedBest ? 1 : index + 1,
      result: tiedBest
        ? ("draw" as const)
        : index === 0
          ? ("win" as const)
          : ("loss" as const),
      score,
    };
  });
}

export function playDeterministicGame(playerIds: readonly PlayerId[]) {
  let state = startRound(createInitialPublicState(playerIds));
  for (const roll of cloudlineRolls) {
    for (const playerId of playerIds) {
      const selection = legalSurveyTargets(state, playerId)[0];
      if (!selection) {
        throw new Error(`No legal Cloudline selection for ${playerId}.`);
      }
      const result = submitSurveyMark(state, {
        playerId,
        cellId: selection,
        expectedRound: roll.round,
      });
      if (!result.accepted) {
        throw new Error((result.validation as { errorCode: string }).errorCode);
      }
      state = result.state;
    }
  }
  return state;
}

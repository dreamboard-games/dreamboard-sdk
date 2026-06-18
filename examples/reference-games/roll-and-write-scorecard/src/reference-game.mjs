import { DREAMBOARD_SDK_PACKAGE_SET } from "@dreamboard-games/sdk/package-set";
import coverage from "../scenarios/coverage.json" with { type: "json" };

export const cloudlineRolls = [
  { round: 1, dice: [2, 3], total: 5 },
  { round: 2, dice: [4, 3], total: 7 },
  { round: 3, dice: [6, 4], total: 10 },
  { round: 4, dice: [1, 5], total: 6 },
  { round: 5, dice: [3, 6], total: 9 },
  { round: 6, dice: [2, 2], total: 4 },
  { round: 7, dice: [5, 3], total: 8 },
  { round: 8, dice: [6, 5], total: 11 },
];

export const surveyTargets = [
  [2, 5, 8, 11],
  [6, 9, 3, 7],
  [10, 4, 12, 6],
  [7, 11, 5, 9],
];

export const surveyCells = surveyTargets.flatMap((rowTargets, row) =>
  rowTargets.map((target, col) => ({
    id: `cell-${row}-${col}`,
    row,
    col,
    target,
  })),
);

export const cellById = Object.fromEntries(
  surveyCells.map((cell) => [cell.id, cell]),
);

export const demoPlayers = ["player-1", "player-2"];

export function createInitialState({ playerIds = demoPlayers } = {}) {
  return {
    phase: "roll",
    round: 1,
    activePlayerIndex: 0,
    playerIds,
    roll: null,
    marks: Object.fromEntries(playerIds.map((playerId) => [playerId, {}])),
    draft: null,
    completed: false,
    scores: null,
    log: [],
  };
}

export function rollForRound(round) {
  const roll = cloudlineRolls.find((item) => item.round === round);
  if (!roll) {
    throw new Error(`Unknown Cloudline round ${round}`);
  }
  return roll;
}

export function startRound(state) {
  const roll = rollForRound(state.round);
  return {
    ...state,
    phase: "markSurvey",
    activePlayerIndex: 0,
    roll,
    draft: null,
    log: [
      ...state.log,
      {
        kind: "dice-rolled",
        round: roll.round,
        dice: roll.dice,
        total: roll.total,
      },
    ],
  };
}

export function activePlayerId(state) {
  return state.playerIds[state.activePlayerIndex];
}

export function emptyCells(state, playerId) {
  const marks = state.marks[playerId] ?? {};
  return surveyCells
    .map((cell) => cell.id)
    .filter((cellId) => marks[cellId] === undefined);
}

export function legalSurveyTargets(state, playerId = activePlayerId(state)) {
  const empty = emptyCells(state, playerId);
  const matching = empty.filter(
    (cellId) => cellById[cellId].target === state.roll?.total,
  );
  return matching.length > 0 ? matching : empty;
}

export function createDraft(
  state,
  { playerId = activePlayerId(state), cellId },
) {
  return {
    ...state,
    draft: {
      kind: "survey-mark",
      playerId,
      cellId,
      round: state.round,
      rollTotal: state.roll?.total,
      validAt: `${state.round}:${state.roll?.dice.join("-")}`,
    },
  };
}

export function validateSubmission(
  state,
  { playerId = activePlayerId(state), cellId, expectedRound = state.round },
) {
  if (state.phase !== "markSurvey" || state.completed) {
    return {
      ok: false,
      errorCode: "PHASE_NOT_MARKING",
      message: "A survey mark can only be submitted during markSurvey.",
    };
  }
  if (expectedRound !== state.round) {
    return {
      ok: false,
      errorCode: "STALE_SUBMISSION",
      message: "The submitted draft belongs to an earlier roll.",
    };
  }
  if (playerId !== activePlayerId(state)) {
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
  const legal = legalSurveyTargets(state, playerId);
  if (!legal.includes(cellId)) {
    return {
      ok: false,
      errorCode: "CELL_DOES_NOT_MATCH_ROLL",
      message: "Choose an unmarked cell matching the roll.",
      legalSpaceIds: legal,
    };
  }
  return { ok: true, legalSpaceIds: legal };
}

function markKindForSubmission(state, playerId, cellId) {
  const matching = emptyCells(state, playerId).filter(
    (emptyCellId) => cellById[emptyCellId].target === state.roll.total,
  );
  if (matching.length === 0) {
    return { kind: "failed", round: state.round };
  }
  return {
    kind: "surveyed",
    round: state.round,
    rolledTotal: state.roll.total,
  };
}

export function submitSurveyMark(
  state,
  { playerId = activePlayerId(state), cellId, expectedRound = state.round },
) {
  const validation = validateSubmission(state, {
    playerId,
    cellId,
    expectedRound,
  });
  if (!validation.ok) {
    return {
      accepted: false,
      state,
      validation,
    };
  }

  const mark = markKindForSubmission(state, playerId, cellId);
  const nextMarks = {
    ...state.marks,
    [playerId]: {
      ...state.marks[playerId],
      [cellId]: mark,
    },
  };
  const nextLog = [
    ...state.log,
    { kind: "survey-submitted", playerId, cellId, mark },
  ];
  const nextPlayerIndex = state.activePlayerIndex + 1;
  if (nextPlayerIndex < state.playerIds.length) {
    return {
      accepted: true,
      mark,
      validation,
      state: {
        ...state,
        activePlayerIndex: nextPlayerIndex,
        marks: nextMarks,
        draft: null,
        log: nextLog,
      },
    };
  }
  if (state.round >= cloudlineRolls.length) {
    const completedState = {
      ...state,
      phase: "complete",
      marks: nextMarks,
      draft: null,
      completed: true,
      scores: scorePlayers(nextMarks, state.playerIds),
      log: [...nextLog, { kind: "game-complete", round: state.round }],
    };
    return {
      accepted: true,
      mark,
      validation,
      state: completedState,
    };
  }
  const nextRound = {
    ...state,
    phase: "roll",
    round: state.round + 1,
    activePlayerIndex: 0,
    marks: nextMarks,
    roll: null,
    draft: null,
    log: nextLog,
  };
  return {
    accepted: true,
    mark,
    validation,
    state: startRound(nextRound),
  };
}

function isSurveyed(mark) {
  return mark?.kind === "surveyed";
}

function completeRows(marks) {
  return surveyTargets.filter((_, row) =>
    surveyTargets[row].every((__, col) =>
      isSurveyed(marks[`cell-${row}-${col}`]),
    ),
  ).length;
}

function completeColumns(marks) {
  return surveyTargets[0].filter((_, col) =>
    surveyTargets.every((__, row) => isSurveyed(marks[`cell-${row}-${col}`])),
  ).length;
}

function largestSurveyedRegion(marks) {
  const surveyed = new Set(
    surveyCells
      .filter((cell) => isSurveyed(marks[cell.id]))
      .map((cell) => cell.id),
  );
  const seen = new Set();
  let largest = 0;
  for (const cellId of surveyed) {
    if (seen.has(cellId)) continue;
    const stack = [cellId];
    seen.add(cellId);
    let size = 0;
    while (stack.length > 0) {
      const current = stack.pop();
      size += 1;
      const { row, col } = cellById[current];
      const neighbors = [
        `cell-${row - 1}-${col}`,
        `cell-${row + 1}-${col}`,
        `cell-${row}-${col - 1}`,
        `cell-${row}-${col + 1}`,
      ];
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

export function scorePlayerMarks(marks) {
  const rows = completeRows(marks);
  const columns = completeColumns(marks);
  const largestRegion = largestSurveyedRegion(marks);
  const failedSurveys = Object.values(marks).filter(
    (mark) => mark.kind === "failed",
  ).length;
  const total = rows * 6 + columns * 6 + largestRegion - failedSurveys * 2;
  return {
    total,
    components: {
      completeRows: rows,
      completeColumns: columns,
      largestRegion,
      failedSurveys,
    },
  };
}

export function scorePlayers(
  marksByPlayer,
  playerIds = Object.keys(marksByPlayer),
) {
  return Object.fromEntries(
    playerIds.map((playerId) => [
      playerId,
      scorePlayerMarks(marksByPlayer[playerId] ?? {}),
    ]),
  );
}

function playDeterministicGame() {
  let state = startRound(createInitialState());
  for (const roll of cloudlineRolls) {
    for (const playerId of demoPlayers) {
      const legal = legalSurveyTargets(state, playerId);
      const selection = legal[0];
      const result = submitSurveyMark(state, {
        playerId,
        cellId: selection,
        expectedRound: roll.round,
      });
      if (!result.accepted) {
        throw new Error(result.validation.errorCode);
      }
      state = result.state;
    }
  }
  return state;
}

const initialState = createInitialState();
const diceState = startRound(initialState);
const draftState = createDraft(diceState, {
  playerId: "player-1",
  cellId: "cell-0-1",
});
const submittedResult = submitSurveyMark(diceState, {
  playerId: "player-1",
  cellId: "cell-0-1",
});
const invalidResult = submitSurveyMark(diceState, {
  playerId: "player-1",
  cellId: "cell-1-0",
});
const staleResult = submitSurveyMark(diceState, {
  playerId: "player-1",
  cellId: "cell-0-1",
  expectedRound: 0,
});
const completeState = playDeterministicGame();

export const scenarioMetadata = {
  initial: {
    id: "roll-and-write-scorecard.initial",
    state: initialState,
  },
  dice: {
    id: "roll-and-write-scorecard.dice",
    state: diceState,
    legalSpaceIds: legalSurveyTargets(diceState, "player-1"),
  },
  draft: {
    id: "roll-and-write-scorecard.draft",
    state: draftState,
  },
  submitted: {
    id: "roll-and-write-scorecard.submitted",
    result: submittedResult,
  },
  invalid: {
    id: "roll-and-write-scorecard.invalid",
    result: invalidResult,
    staleResult,
  },
  complete: {
    id: "roll-and-write-scorecard.complete",
    state: completeState,
  },
};

export const referenceGame = {
  id: "roll-and-write-scorecard",
  displayName: "Roll And Write Scorecard",
  sdkPackageSetVersion: DREAMBOARD_SDK_PACKAGE_SET.sdkVersion,
  rulesBrief: "Cloudline Survey",
  players: { min: 1, max: 4 },
  loop: {
    rounds: cloudlineRolls.length,
    seededRolls: cloudlineRolls,
    activeRoll: cloudlineRolls[0],
    resolution: "seat-order",
  },
  guidance: {
    phase: {
      id: "markSurvey",
      label: "Mark the survey grid",
      summary: "Resolve the shared dice roll on each player scorecard.",
      objective:
        "Choose an unmarked cell matching the roll; if none remain, mark any open cell as a failed survey.",
    },
    setup: {
      profileId: "standard",
      name: "Standard Cloudline Survey",
      summary: "Prepare one scorecard per player and the seeded dice sequence.",
      steps: [
        {
          id: "prepare-scorecards",
          label: "Prepare player scorecards",
          description: "Give each player a private 4 by 4 survey grid.",
        },
        {
          id: "prepare-dice",
          label: "Prepare dice",
          description: "Use the seeded two-die roll list for all eight rounds.",
        },
      ],
    },
  },
  scorecard: {
    boardId: "survey-grid",
    scope: "perPlayer",
    rows: 4,
    cols: 4,
    cells: surveyCells,
    marks: {
      "cell-0-0": { kind: "surveyed", round: 1, rolledTotal: 2 },
      "cell-1-1": { kind: "failed", round: 2 },
      "cell-2-0": { kind: "surveyed", round: 3, rolledTotal: 10 },
    },
  },
  rules: {
    summary:
      "Each round rolls two shared dice. Players resolve the roll in seat order on their own scorecard.",
    legalMark:
      "If an unmarked cell matches the roll total, choose exactly one matching cell. If no match remains, choose any unmarked cell and record a failed survey.",
    scoring: {
      completeRows: 6,
      completeColumns: 6,
      largestRegion: 1,
      failedSurveyPenalty: -2,
    },
  },
  interactions: [
    {
      id: "mark-cell",
      label: "Mark cell",
      help: "Choose one highlighted scorecard cell, then submit the pending mark.",
      input: "board-space",
      board: "survey-grid",
      collector: "boardTarget.playerSpace",
      rule: "choose one unmarked cell matching the current roll total, or any unmarked cell when no match remains",
    },
    {
      id: "roll-first",
      label: "Roll first",
      help: "The shared roll must exist before any scorecard cell can be marked.",
      blockedReason: "Roll first, then choose a matching unmarked cell.",
      blockedCode: "ROLL_REQUIRED",
      input: "none",
      rule: "players cannot mark scorecards before the round roll is available",
    },
  ],
  scenarios: scenarioMetadata,
  scoring: [
    "6 points for each complete surveyed row",
    "6 points for each complete surveyed column",
    "1 point per surveyed cell in the largest orthogonal region",
    "-2 points per failed survey",
  ],
  proofCommands: [
    "pnpm reference-games:test:packed --game roll-and-write-scorecard",
    "pnpm ui:test --scenario roll-and-write-scorecard.mark-cell.mobile",
    "pnpm --filter @dreamboard-games/ui-workbench test tests/scenario-keyboard.spec.ts",
  ],
  coverage,
};

if (
  typeof process !== "undefined" &&
  import.meta.url === `file://${process.argv[1]}`
) {
  console.log(
    JSON.stringify({
      id: referenceGame.id,
      sdkPackageSetVersion: referenceGame.sdkPackageSetVersion,
      cells: referenceGame.scorecard.cells.length,
      interactions: referenceGame.interactions.length,
      scenarios: Object.keys(referenceGame.scenarios),
    }),
  );
}

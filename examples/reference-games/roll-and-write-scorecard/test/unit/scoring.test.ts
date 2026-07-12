import assert from "node:assert/strict";
import test from "node:test";
import type { PlayerId, SpaceId } from "../../shared/manifest-contract";
import type { Score, SurveyMark } from "../../app/game-contract";
import { outcomeFromScores, scorePlayerMarks } from "../../app/model";

const surveyed = (round: number, rolledTotal = 7): SurveyMark => ({
  kind: "surveyed",
  round,
  rolledTotal,
});

function marks(cellIds: readonly string[]): Record<string, SurveyMark> {
  return Object.fromEntries(
    cellIds.map((cellId, index) => [cellId, surveyed(index + 1)]),
  );
}

test("scores row, column, orthogonal-region, and failed-survey point components", () => {
  const result = scorePlayerMarks({
    ...marks([
      "cell-0-0",
      "cell-0-1",
      "cell-0-2",
      "cell-0-3",
      "cell-1-0",
      "cell-2-0",
      "cell-3-0",
    ]),
    ["cell-3-3" as SpaceId]: { kind: "failed", round: 8 },
  });

  assert.deepEqual(result.components, {
    "complete-rows": 6,
    "complete-columns": 6,
    "largest-region": 7,
    "failed-surveys": -2,
  });
  assert.equal(result.total, 17);
});

test("diagonal surveyed cells are not connected", () => {
  const result = scorePlayerMarks(
    marks(["cell-0-0", "cell-1-1", "cell-2-2", "cell-3-3"]),
  );

  assert.equal(result.components["largest-region"], 1);
  assert.equal(result.total, 1);
  assert.equal(Object.is(result.components["failed-surveys"], -0), false);
});

test("assigns competition ranks and all four authoritative score components", () => {
  const playerIds = [
    "player-1",
    "player-2",
    "player-3",
    "player-4",
  ] as const satisfies readonly PlayerId[];
  const score = (total: number): Score => ({
    total,
    components: {
      "complete-rows": total,
      "complete-columns": 0,
      "largest-region": 0,
      "failed-surveys": 0,
    },
  });
  const outcome = outcomeFromScores(
    {
      [playerIds[0]]: score(10),
      [playerIds[1]]: score(8),
      [playerIds[2]]: score(8),
      [playerIds[3]]: score(1),
    },
    playerIds,
  );

  assert.equal(outcome.reason.code, "EIGHT_ROUNDS_COMPLETE");
  assert.deepEqual(
    outcome.standings.map(({ rank, result }) => ({ rank, result })),
    [
      { rank: 1, result: "win" },
      { rank: 2, result: "loss" },
      { rank: 2, result: "loss" },
      { rank: 4, result: "loss" },
    ],
  );
  assert.deepEqual(
    outcome.standings[0]?.scoreBreakdown?.map(({ id }) => id),
    ["complete-rows", "complete-columns", "largest-region", "failed-surveys"],
  );
});

test("top-score ties draw and solo completion wins", () => {
  const players = [
    "player-1",
    "player-2",
  ] as const satisfies readonly PlayerId[];
  const tiedScore = scorePlayerMarks({});
  const tied = outcomeFromScores(
    { [players[0]]: tiedScore, [players[1]]: tiedScore },
    players,
  );
  assert.deepEqual(
    tied.standings.map(({ rank, result }) => ({ rank, result })),
    [
      { rank: 1, result: "draw" },
      { rank: 1, result: "draw" },
    ],
  );

  const solo = outcomeFromScores({ [players[0]]: tiedScore }, [players[0]]);
  assert.equal(solo.standings[0]?.rank, 1);
  assert.equal(solo.standings[0]?.result, "win");
});

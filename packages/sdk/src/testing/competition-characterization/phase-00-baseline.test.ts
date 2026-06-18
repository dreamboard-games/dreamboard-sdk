import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { boardInput, boardTarget, createTableQueries } from "../../reducer";
import { createSpatialTable } from "../../reducer/table/table-test-fixtures";
import type { RuntimeTableRecord } from "../../reducer/advanced";

type CharacterizationState = {
  table: RuntimeTableRecord;
};

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../..",
);

function sourcePath(relativePath: string) {
  return path.join(repoRoot, relativePath);
}

function createSurveyState(): CharacterizationState {
  const table = createSpatialTable();
  const sourceBoard = table.boards.byId["square-board"];
  for (const playerId of table.playerOrder) {
    const id = `survey-grid:${playerId}`;
    table.boards.byId[id] = {
      ...sourceBoard,
      id,
      baseId: "survey-grid",
      scope: "perPlayer",
    };
  }
  return { table };
}

describe("competition game authoring phase 00 current-SDK baseline", () => {
  test("per-player square board spaces can drive a drafted mark interaction", () => {
    const state = createSurveyState();
    const q = createTableQueries(state.table);
    const target = boardTarget
      .playerSpace<CharacterizationState, "survey-grid", "cell-a1" | "cell-a2">(
        "survey-grid",
      )
      .where({
        id: "rolled-total-matches-cell",
        errorCode: "ROLL_TOTAL_MISMATCH",
        message: "That square does not match the rolled total.",
        test: ({ playerId, targetId }) =>
          targetId.playerId === playerId && targetId.spaceId === "cell-a1",
      })
      .build();
    const input = boardInput.playerSpace({ target });
    const ctx = { state, playerId: "player-1" as const, q };

    expect(target.eligible(ctx)).toEqual([
      {
        boardId: "survey-grid",
        playerId: "player-1",
        spaceId: "cell-a1",
      },
    ]);
    expect(
      target.validate(ctx, {
        boardId: "survey-grid",
        playerId: "player-1",
        spaceId: "cell-a2",
      }),
    ).toEqual({
      errorCode: "ROLL_TOTAL_MISMATCH",
      message: "That square does not match the rolled total.",
    });
    expect(input.meta).toEqual({
      targetKind: "space",
      boardId: "survey-grid",
      valueKind: "player-board-space",
    });
  });

  test("generated board UI binds surfaces and generated grid adapters", async () => {
    const source = await readFile(
      sourcePath("packages/sdk/src/runtime/workspace-contract/board.ts"),
      "utf8",
    );

    expect(source).toContain("surface<Board extends string>");
    expect(source).toContain("slot: {");
    expect(source).toContain("playerSpace: createBoardTargetInputSlot");
    expect(source).toContain("HexGrid");
    expect(source).toContain("SquareGrid");
  });

  test("terminal outcome is hard-cut to canonical GameOutcome shape", async () => {
    const source = await readFile(
      sourcePath("packages/sdk/src/reducer/model/runtime.ts"),
      "utf8",
    );

    expect(source).toContain("export type GameOutcome");
    expect(source).toContain("standings:");
    expect(source).toContain("scoreBreakdown?");
    expect(source).toContain("tieBreaks?");
    expect(source).not.toContain(
      ["export type", "Terminal", "Outcome"].join(" "),
    );
    expect(source).not.toContain(["winner", "Player", "Id?"].join(""));
    expect(source).not.toContain(["final", "Scores?"].join(""));
  });

  test("phase and interaction labels are humanized when no authored guidance exists", async () => {
    const [descriptorSource, phaseIndicatorSource] = await Promise.all([
      readFile(
        sourcePath(
          "packages/sdk/src/reducer/bundle/trusted/interaction-descriptor.ts",
        ),
        "utf8",
      ),
      readFile(
        sourcePath("packages/sdk/src/ui/components/PhaseIndicator.tsx"),
        "utf8",
      ),
    ]);

    expect(descriptorSource).toContain("humanizeInteractionId");
    expect(phaseIndicatorSource).toContain("formatPhase");
  });

  test("automated procedures have an explicit GameEvent channel", async () => {
    const [runtimeSource, argsSource] = await Promise.all([
      readFile(sourcePath("packages/sdk/src/reducer/model/runtime.ts"), "utf8"),
      readFile(
        sourcePath("packages/sdk/src/reducer/model/spec/runtime-args.ts"),
        "utf8",
      ),
    ]);

    expect(runtimeSource).toContain("export type GameEvent");
    expect(runtimeSource).toContain("export type ReducerAcceptOptions");
    expect(argsSource).toContain("options?: ReducerAcceptOptions");
  });
});

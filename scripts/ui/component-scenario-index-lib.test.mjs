import assert from "node:assert/strict";
import test from "node:test";
import {
  scenariosForCapability,
  scenariosForContract,
  selectScenariosForSourceFiles,
} from "./component-scenario-index-lib.mjs";

const index = {
  contracts: {
    CardDragSurface: {
      id: "CardDragSurface",
      sourceFiles: ["packages/sdk/src/ui/components/card-drag/**"],
      scenarioIds: ["cards.drag.mobile"],
    },
  },
  scenarios: {
    "cards.drag.mobile": {
      id: "cards.drag.mobile",
      sourceFiles: ["examples/ui-scenarios/src/cards/drag-between-zones.ts"],
      capabilities: ["pointer-drag"],
    },
    "hearts.sealed-pass.mobile": {
      id: "hearts.sealed-pass.mobile",
      sourceFiles: [],
      capabilities: ["touch-drag"],
    },
    "hex-network-trading.growing-network.desktop": {
      id: "hex-network-trading.growing-network.desktop",
      sourceFiles: [],
      capabilities: ["pointer-drag"],
    },
    "worker-placement-tableau.first-craft.desktop": {
      id: "worker-placement-tableau.first-craft.desktop",
      sourceFiles: [],
      capabilities: ["runtime-draft"],
    },
  },
  sharedFallbacks: ["packages/sdk/src/testing/ui-fixture/**"],
};

test("selects scenarios by contract source ownership", () => {
  assert.deepEqual(
    selectScenariosForSourceFiles(index, [
      "packages/sdk/src/ui/components/card-drag/CardDragSurface.tsx",
    ]).scenarioIds,
    ["cards.drag.mobile"],
  );
});

test("selects scenarios by scenario source ownership", () => {
  assert.deepEqual(
    selectScenariosForSourceFiles(index, [
      "examples/ui-scenarios/src/cards/drag-between-zones.ts",
    ]).scenarioIds,
    ["cards.drag.mobile"],
  );
});

test("selects the smoke matrix for shared fixture sources", () => {
  assert.deepEqual(
    selectScenariosForSourceFiles(index, [
      "packages/sdk/src/testing/ui-fixture/compiler.ts",
    ]).scenarioIds,
    [
      "hearts.sealed-pass.mobile",
      "hex-network-trading.growing-network.desktop",
      "worker-placement-tableau.first-craft.desktop",
    ],
  );
});

test("selects the smoke matrix for unknown owned UI sources", () => {
  assert.deepEqual(
    selectScenariosForSourceFiles(index, [
      "packages/ui-workbench/src/new-runtime-surface.ts",
    ]).scenarioIds,
    [
      "hearts.sealed-pass.mobile",
      "hex-network-trading.growing-network.desktop",
      "worker-placement-tableau.first-craft.desktop",
    ],
  );
});

test("selects no scenarios for unrelated docs", () => {
  assert.deepEqual(
    selectScenariosForSourceFiles(index, ["docs/notes.md"]).scenarioIds,
    [],
  );
});

test("queries scenarios by contract and capability", () => {
  assert.deepEqual(scenariosForContract(index, "CardDragSurface"), [
    "cards.drag.mobile",
  ]);
  assert.deepEqual(scenariosForCapability(index, "runtime-draft"), [
    "worker-placement-tableau.first-craft.desktop",
  ]);
});

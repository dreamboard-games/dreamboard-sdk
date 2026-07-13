import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { requiredGenericUIScenarioIds } from "../ui/required-ui-scenarios.mjs";
import { root } from "../ui/reference-games-lib.mjs";
import { assertReducerNativeReferenceUIScenario } from "./compile-scenario.mjs";
import { discoverUIScenarioModules } from "./discover-scenarios.mjs";

const validUIScenario = {
  id: "reference.valid.desktop",
  behaviorScenario: "../scenarios/complete-game.scenario.ts",
};

const validBehaviorScenario = {
  setup: { players: 2, seed: 1 },
  given: [],
  when: [],
};

test("reference-game UI scenarios accept only reducer-native replay checkpoints", () => {
  assert.doesNotThrow(() =>
    assertReducerNativeReferenceUIScenario({
      uiScenario: validUIScenario,
      behaviorScenario: validBehaviorScenario,
    }),
  );

  for (const field of ["baseId", "initialState", "authority"]) {
    assert.throws(
      () =>
        assertReducerNativeReferenceUIScenario({
          uiScenario: { ...validUIScenario, [field]: {} },
          behaviorScenario: validBehaviorScenario,
        }),
      new RegExp(`cannot author .*${field}`),
    );
  }

  assert.throws(
    () =>
      assertReducerNativeReferenceUIScenario({
        uiScenario: { ...validUIScenario, behaviorScenario: {} },
        behaviorScenario: validBehaviorScenario,
      }),
    /must reference a reducer-native behaviorScenario by relative source path/,
  );
  assert.throws(
    () =>
      assertReducerNativeReferenceUIScenario({
        uiScenario: validUIScenario,
        behaviorScenario: {
          ...validBehaviorScenario,
          when() {},
        },
      }),
    /must use reducer-native setup\/given\/when arrays/,
  );

  for (const field of ["initialState", "baseId", "from"]) {
    assert.throws(
      () =>
        assertReducerNativeReferenceUIScenario({
          uiScenario: validUIScenario,
          behaviorScenario: { ...validBehaviorScenario, [field]: {} },
        }),
      new RegExp(`cannot author .*${field}`),
    );
  }
});

test("generic UI scenario discovery retains exactly the seven protocol scenarios", async () => {
  const discovered = await discoverUIScenarioModules();
  const scenarios = await Promise.all(
    discovered.map(async ({ modulePath }) => {
      const source = await readFile(modulePath, "utf8");
      return {
        id: source.match(/\bid:\s*["']([^"']+)["']/)?.[1],
        usesPrimitiveScenario: source.includes("createPrimitiveScenario({"),
      };
    }),
  );
  assert.deepEqual(scenarios.map(({ id }) => id).sort(), [
    ...requiredGenericUIScenarioIds,
  ]);
  assert.ok(
    scenarios.every(({ usesPrimitiveScenario }) => usesPrimitiveScenario),
    "generic UI scenarios must retain the protocol scenario helper",
  );
  const helperSource = await readFile(
    path.join(root, "examples/ui-scenarios/src/scenario-helper.mjs"),
    "utf8",
  );
  assert.match(
    helperSource,
    /authority:\s*{\s*kind:\s*["']protocol["']/,
    "generic UI scenarios must retain protocol authority",
  );
});

test("retained component scenario index contains only source-selection metadata", async () => {
  const index = JSON.parse(
    await readFile(
      path.join(root, "fixtures/ui/component-scenario-index.json"),
      "utf8",
    ),
  );
  assert.equal(index.schemaVersion, 3);
  for (const scenario of Object.values(index.scenarios)) {
    for (const removedField of [
      "fixtureFile",
      "renderModule",
      "fixtureDigest",
      "renderModuleDigest",
    ]) {
      assert.equal(
        Object.hasOwn(scenario, removedField),
        false,
        `${scenario.id} must not retain ${removedField}`,
      );
    }
  }
});

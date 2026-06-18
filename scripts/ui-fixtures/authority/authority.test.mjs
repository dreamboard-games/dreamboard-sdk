import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, rm, symlink } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { executeProtocolAuthority } from "./protocol-authority.mjs";
import { executeReducerAuthority } from "./reducer-authority.mjs";
import { root } from "../../ui/reference-games-lib.mjs";
import { loadScenarioModule } from "../load-scenario-module.mjs";

const sdkRequire = createRequire(
  new URL("../../../packages/sdk/package.json", import.meta.url),
);

async function withPackageLinks(callback) {
  const links = [
    {
      link: path.join(root, "node_modules/@dreamboard-games/sdk"),
      target: path.join(root, "packages/sdk"),
    },
    {
      link: path.join(
        root,
        "node_modules/@dreamboard-games/plugin-runtime-contract",
      ),
      target: path.join(root, "packages/plugin-runtime-contract"),
    },
    {
      link: path.join(root, "node_modules/react"),
      target: path.dirname(sdkRequire.resolve("react/package.json")),
    },
  ];
  const created = [];
  for (const item of links) {
    try {
      await mkdir(path.dirname(item.link), { recursive: true });
      await symlink(item.target, item.link, "dir");
      created.push(item.link);
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
  }
  try {
    return await callback();
  } finally {
    await Promise.all(
      created.reverse().map((link) => rm(link, { force: true })),
    );
  }
}

function digest(seed) {
  return `sha256:${seed.padStart(64, "0")}`;
}

test("protocol authority materializes protocol fixture inputs", async () => {
  const result = await executeProtocolAuthority({
    id: "primitive.button.desktop",
    capabilities: ["click"],
    replay: [],
    authority: {
      kind: "protocol",
      viewer: { seatId: "player-1", playerId: "player-1" },
      tape: {
        session: {
          sessionId: "primitive.button.desktop.session",
          players: [{ playerId: "player-1", displayName: "Player 1" }],
        },
        frames: [
          {
            id: "initial",
            projectionDigest: digest("1"),
            frame: {
              gameVersion: 1,
              actionSetVersion: digest("2"),
              perspectivePlayerId: "player-1",
              view: {},
              flow: {
                currentPhase: "primitive",
                currentStage: "primitive",
                activePlayers: ["player-1"],
                simultaneousPhase: null,
              },
              availableInteractions: [],
              zones: {},
              recentEvents: [],
            },
          },
        ],
        steps: [
          {
            id: "initial.host-frame",
            kind: "host.frame",
            frameId: "initial",
          },
        ],
      },
    },
  });

  assert.equal(result.finalFrame.id, "initial");
  assert.equal(result.viewer.playerId, "player-1");
  assert.deepEqual(result.replaySteps, []);
  assert.deepEqual(result.capabilitiesForReplay([], ["desktop"]), [
    "accessibility-scan",
    "click",
    "reduced-motion",
  ]);
});

test("reducer authority executes the reducer bundle supplied by a scenario module", async () => {
  await withPackageLinks(async () => {
    const scenario = await loadScenarioModule(
      path.join(
        root,
        "examples/reference-games/hearts/src/scenarios/pass-three.scenario.mjs",
      ),
    );
    assert.equal(
      typeof scenario.authority.bundle.projectSeatsDynamic,
      "function",
    );
    assert.equal(typeof scenario.authority.bundle.validateInput, "function");
    assert.equal(typeof scenario.authority.bundle.dispatch, "function");

    const result = await executeReducerAuthority(scenario);
    assert.equal(result.viewer.playerId, "player-1");
    assert.equal(result.protocol.frames.length, 2);
    assert.ok(
      result.protocol.steps.some((step) => step.kind === "client.submit"),
    );
    assert.equal(result.sourceSteps.length, 3);
  });
});

test("scenario loader rejects modules outside the reference-game roots", async () => {
  await assert.rejects(
    () => loadScenarioModule(path.join(root, "package.json")),
    /outside/,
  );
});

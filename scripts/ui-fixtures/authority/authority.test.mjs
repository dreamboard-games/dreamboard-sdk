import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { executeProtocolAuthority } from "./protocol-authority.mjs";
import { root, readJson } from "../../ui/reference-games-lib.mjs";
import { compileScenarioModule } from "../compile-scenario.mjs";
import { loadScenarioModule } from "../load-scenario-module.mjs";

const sdkRequire = createRequire(
  new URL("../../../packages/sdk/package.json", import.meta.url),
);
const { GlobalRegistrator } = sdkRequire("@happy-dom/global-registrator");

GlobalRegistrator.register();
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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
    {
      link: path.join(root, "node_modules/react-dom"),
      target: path.dirname(sdkRequire.resolve("react-dom/package.json")),
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

test("workspace fixture compilation materializes reducer authority from v2 source", async () => {
  await withPackageLinks(async () => {
    const gameDir = path.join(root, "examples/reference-games/hearts");
    const metadata = await readJson(path.join(gameDir, "reference-game.json"));
    const scenario = await loadScenarioModule(
      path.join(gameDir, "test/ui-scenarios/pass-three.mobile.scenario.ts"),
    );
    const outputRoot = await mkdtemp(
      path.join(os.tmpdir(), "dreamboard-authority-test-"),
    );
    const fixture = await compileScenarioModule({
      game: {
        id: metadata.id,
        displayName: metadata.displayName,
        mechanics: metadata.mechanics,
        uiPatterns: metadata.uiPatterns,
      },
      gameDir,
      scenario,
      outputRoot,
      sdkCommit: "test",
    });

    assert.equal(fixture.id, "hearts.pass-three.mobile");
    assert.ok(fixture.capabilities.includes("runtime-submit"));
    const fixtureJson = JSON.parse(
      await readFile(path.join(outputRoot, fixture.file), "utf8"),
    );
    assert.equal(
      fixtureJson.source.renderModule,
      "modules/hearts.pass-three.mobile.mjs",
    );
    assert.ok(
      fixtureJson.source.sourceFiles.includes(
        "examples/reference-games/hearts/app/game.ts",
      ),
    );
    assert.ok(
      fixtureJson.source.sourceFiles.includes(
        "examples/reference-games/hearts/ui/App.tsx",
      ),
    );
    assert.ok(
      fixtureJson.source.sourceFiles.includes(
        "examples/reference-games/hearts/test/ui-scenarios/pass-three.mobile.scenario.ts",
      ),
    );
  });
});

test("scenario loader rejects modules outside the reference-game roots", async () => {
  await assert.rejects(
    () => loadScenarioModule(path.join(root, "package.json")),
    /outside/,
  );
});

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  rm,
  symlink,
  unlink,
} from "node:fs/promises";
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

async function withPackageLinks(gameDirs, callback) {
  const packageRoots = [
    root,
    ...gameDirs.map((gameDir) => path.resolve(gameDir)),
  ];
  const links = packageRoots.flatMap((packageRoot) => [
    {
      link: path.join(packageRoot, "node_modules/@dreamboard-games/sdk"),
      target: path.join(root, "packages/sdk"),
    },
    {
      link: path.join(
        packageRoot,
        "node_modules/@dreamboard-games/plugin-runtime-contract",
      ),
      target: path.join(root, "packages/plugin-runtime-contract"),
    },
    {
      link: path.join(packageRoot, "node_modules/react"),
      target: path.dirname(sdkRequire.resolve("react/package.json")),
    },
    {
      link: path.join(packageRoot, "node_modules/react-dom"),
      target: path.dirname(sdkRequire.resolve("react-dom/package.json")),
    },
    {
      link: path.join(packageRoot, "node_modules/zod"),
      target: path.dirname(sdkRequire.resolve("zod/package.json")),
    },
  ]);
  const restore = [];
  for (const item of links) {
    await mkdir(path.dirname(item.link), { recursive: true });
    const existing = await lstat(item.link).catch((error) => {
      if (error?.code === "ENOENT") return null;
      throw error;
    });
    if (existing) {
      assert.ok(
        existing.isSymbolicLink(),
        `${item.link} must be a symlink for fixture testing`,
      );
      const previousTarget = await readlink(item.link);
      await unlink(item.link);
      restore.push(async () => {
        await rm(item.link, { force: true });
        await symlink(previousTarget, item.link, "dir");
      });
    } else {
      restore.push(() => rm(item.link, { force: true }));
    }
    await symlink(item.target, item.link, "dir");
  }
  try {
    return await callback();
  } finally {
    for (const restoreLink of restore.reverse()) {
      await restoreLink();
    }
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

test("workspace fixture compilation materializes reducer authority from a reducer-native replay", async () => {
  const gameDir = path.join(root, "examples/reference-games/hearts");
  await withPackageLinks([gameDir], async () => {
    const metadata = await readJson(path.join(gameDir, "reference-game.json"));
    const scenario = await loadScenarioModule(
      path.join(gameDir, "test/ui-scenarios/sealed-pass.mobile.scenario.ts"),
    );
    const outputRoot = await mkdtemp(
      path.join(os.tmpdir(), "dreamboard-authority-test-"),
    );
    const repeatedOutputRoot = await mkdtemp(
      path.join(os.tmpdir(), "dreamboard-authority-repeat-test-"),
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
    const repeatedFixture = await compileScenarioModule({
      game: {
        id: metadata.id,
        displayName: metadata.displayName,
        mechanics: metadata.mechanics,
        uiPatterns: metadata.uiPatterns,
      },
      gameDir,
      scenario,
      outputRoot: repeatedOutputRoot,
      sdkCommit: "different-provenance-commit",
    });

    assert.equal(fixture.id, "hearts.sealed-pass.mobile");
    assert.equal(
      repeatedFixture.sha256,
      fixture.sha256,
      "fixture digests must not depend on bundle commit provenance",
    );
    assert.ok(fixture.capabilities.includes("accessibility-scan"));
    const fixtureJson = JSON.parse(
      await readFile(path.join(outputRoot, fixture.file), "utf8"),
    );
    assert.equal(
      fixtureJson.source.renderModule,
      "modules/hearts.sealed-pass.mobile.mjs",
    );
    assert.ok(
      fixtureJson.source.sourceFiles.includes(
        "examples/reference-games/hearts/app/phases/passing.ts",
      ),
    );
    assert.ok(
      fixtureJson.source.sourceFiles.includes(
        "examples/reference-games/hearts/ui/components/game-ui.tsx",
      ),
    );
    assert.ok(
      fixtureJson.source.sourceFiles.includes(
        "examples/reference-games/hearts/test/scenarios/complete-game.scenario.ts",
      ),
    );
  });
});

test("workspace fixture compilation materializes a reducer-native checkpoint from one source closure", async () => {
  const gameDir = path.join(
    root,
    "examples/reference-games/roll-and-write-scorecard",
  );
  await withPackageLinks([gameDir], async () => {
    const metadata = await readJson(path.join(gameDir, "reference-game.json"));
    const scenario = await loadScenarioModule(
      path.join(
        gameDir,
        "test/ui-scenarios/mark-cell.terminal.mobile.scenario.ts",
      ),
    );
    const outputRoot = await mkdtemp(
      path.join(os.tmpdir(), "dreamboard-reducer-native-authority-test-"),
    );
    try {
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

      assert.equal(
        fixture.id,
        "roll-and-write-scorecard.mark-cell.terminal.mobile",
      );
      const fixtureJson = JSON.parse(
        await readFile(path.join(outputRoot, fixture.file), "utf8"),
      );
      assert.equal(
        fixtureJson.protocol.frames[0].frame.flow.currentPhase,
        "gameOver",
      );
      assert.ok(
        fixtureJson.source.sourceFiles.includes(
          "examples/reference-games/roll-and-write-scorecard/test/scenarios/complete-game.scenario.ts",
        ),
      );
      assert.equal(JSON.stringify(fixtureJson).includes('"given"'), false);
    } finally {
      await rm(outputRoot, { recursive: true, force: true });
    }
  });
});

test("scenario loader rejects modules outside the reference-game roots", async () => {
  await assert.rejects(
    () => loadScenarioModule(path.join(root, "package.json")),
    /outside/,
  );
});

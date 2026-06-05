import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import {
  browserInteractionSnapshotSchema,
  createBrowserInteractionActuatorAttributes,
  createBrowserInteractionRegistry,
  createBrowserInteractionRootAttributes,
  createGameplayActuatorAttributes,
  createGameplayInteractionRootAttributes,
  defineBrowserInteractionSurface,
  encodeCanonicalCandidateValue,
  normalizeBrowserInteractionRecords,
  resolveBrowserInteractionIntent,
  validateBrowserInteractionSnapshot,
  type BrowserInteractionRawRecord,
} from "./index.js";

const interactionRoot = createGameplayInteractionRootAttributes({
  scopeId: "active-plugin",
  interactionKey: "playerTurn.offerTrade",
  interactionId: "offerTrade",
  descriptorDigest: "sha256:descriptor",
  draftDigest: "sha256:draft",
  readiness: "ready",
});

function record(
  attributes: Record<string, string | boolean>,
): BrowserInteractionRawRecord {
  return { attributes };
}

describe("browser interaction protocol core", () => {
  test("normalizes equivalent semantic records to identical deterministic snapshots", () => {
    const toggleA = createGameplayActuatorAttributes({
      scopeId: "active-plugin",
      interactionKey: "playerTurn.offerTrade",
      interactionId: "offerTrade",
      intent: "toggle",
      inputKey: "targetPlayerIds",
      candidateValue: { seat: "p2", nested: { b: 2, a: 1 } },
      candidateState: "selected",
      actuatorKind: "click",
    });
    const submit = createGameplayActuatorAttributes({
      scopeId: "active-plugin",
      interactionKey: "playerTurn.offerTrade",
      interactionId: "offerTrade",
      intent: "submit",
      actuatorKind: "click",
    });
    const recordsA = [
      record({ ...toggleA, "data-label-copy": "Trade with Bob" }),
      record(interactionRoot),
      record(submit),
    ];
    const recordsB = [
      record({ ...submit, "data-label-copy": "Submit offer" }),
      record({
        ...createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "toggle",
          inputKey: "targetPlayerIds",
          candidateValue: { nested: { a: 1, b: 2 }, seat: "p2" },
          candidateState: "selected",
          actuatorKind: "click",
        }),
        "data-label-copy": "Different words",
      }),
      record(interactionRoot),
    ];

    expect(normalizeBrowserInteractionRecords(recordsA)).toEqual(
      normalizeBrowserInteractionRecords(recordsB),
    );
    expect(
      browserInteractionSnapshotSchema.safeParse(
        normalizeBrowserInteractionRecords(recordsA),
      ).success,
    ).toBe(true);
  });

  test("rejects surface vocabulary collisions", () => {
    expect(() =>
      createBrowserInteractionRegistry([
        defineBrowserInteractionSurface({
          surface: "gameplay",
          intents: ["submit"],
        }),
        defineBrowserInteractionSurface({
          surface: "gameplay",
          intents: ["invoke"],
        }),
      ]),
    ).toThrow("different intent vocabulary");
  });

  test("diagnoses duplicate exact enabled actuators", () => {
    const actuator = createGameplayActuatorAttributes({
      scopeId: "active-plugin",
      interactionKey: "playerTurn.offerTrade",
      interactionId: "offerTrade",
      intent: "submit",
      actuatorKind: "click",
    });
    const snapshot = normalizeBrowserInteractionRecords([
      record(interactionRoot),
      record(actuator),
      record(actuator),
    ]);

    expect(snapshot.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "duplicate-enabled-actuator",
    );
    expect(validateBrowserInteractionSnapshot(snapshot)).toHaveLength(1);
  });

  test("reports ambiguous intent resolution instead of picking by order", () => {
    const snapshot = normalizeBrowserInteractionRecords([
      record(interactionRoot),
      record(
        createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "toggle",
          inputKey: "targetPlayerIds",
          candidateValue: "p1",
          actuatorKind: "click",
        }),
      ),
      record(
        createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "toggle",
          inputKey: "targetPlayerIds",
          candidateValue: "p2",
          actuatorKind: "click",
        }),
      ),
    ]);

    expect(
      resolveBrowserInteractionIntent(snapshot, {
        surface: "gameplay",
        scopeId: "active-plugin",
        interactionKey: "playerTurn.offerTrade",
        intent: "toggle",
        inputKey: "targetPlayerIds",
      }),
    ).toMatchObject({ ok: false, code: "ambiguous" });
  });

  test("diagnoses unbound actuator records as unavailable protocol defects", () => {
    const snapshot = normalizeBrowserInteractionRecords([
      record(
        createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "submit",
          actuatorKind: "click",
        }),
      ),
    ]);

    expect(snapshot.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "orphan-actuator",
    );
    expect(
      resolveBrowserInteractionIntent(snapshot, {
        surface: "gameplay",
        scopeId: "active-plugin",
        interactionKey: "playerTurn.offerTrade",
        intent: "submit",
      }),
    ).toMatchObject({ ok: false, code: "invalid-snapshot" });
  });

  test("describes preparation without executing controls", () => {
    const candidateValue = "visible-after-reveal";
    const snapshot = normalizeBrowserInteractionRecords([
      record(interactionRoot),
      record(
        createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "reveal",
          inputKey: "choice",
          actuatorKind: "click",
          prepares: {
            intent: "select",
            inputKey: "choice",
            candidateValue,
            actuatorKind: "click",
          },
        }),
      ),
    ]);

    const resolution = resolveBrowserInteractionIntent(snapshot, {
      surface: "gameplay",
      scopeId: "active-plugin",
      interactionKey: "playerTurn.offerTrade",
      intent: "select",
      inputKey: "choice",
      candidateValue,
    });

    expect(resolution).toMatchObject({
      ok: false,
      code: "preparation-required",
    });
    expect(resolution.ok).toBe(false);
    if (!resolution.ok) {
      expect(resolution.preparation?.[0]?.intent).toBe("reveal");
    }
  });

  test("detects preparation cycles", () => {
    const snapshot = normalizeBrowserInteractionRecords([
      record(interactionRoot),
      record(
        createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "arm",
          actuatorKind: "click",
          prepares: { intent: "reveal", actuatorKind: "click" },
        }),
      ),
      record(
        createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "reveal",
          actuatorKind: "click",
          prepares: { intent: "arm", actuatorKind: "click" },
        }),
      ),
    ]);

    expect(snapshot.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "preparation-cycle",
    );
  });

  test("resolves one exact candidate actuator with stable semantic fields", () => {
    const candidateValue = { id: "p2", role: "trade-target" };
    const snapshot = normalizeBrowserInteractionRecords([
      record(interactionRoot),
      record(
        createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "toggle",
          inputKey: "targetPlayerIds",
          candidateValue,
          candidateState: "unselected",
          actuatorKind: "click",
        }),
      ),
    ]);
    const resolution = resolveBrowserInteractionIntent(snapshot, {
      surface: "gameplay",
      scopeId: "active-plugin",
      interactionKey: "playerTurn.offerTrade",
      intent: "toggle",
      inputKey: "targetPlayerIds",
      candidateValueKey: encodeCanonicalCandidateValue({
        role: "trade-target",
        id: "p2",
      }),
    });

    expect(resolution.ok).toBe(true);
    if (resolution.ok) {
      expect(resolution.actuator.candidateValue).toEqual(candidateValue);
      expect(resolution.actuator.candidateState).toBe("unselected");
    }
  });

  test("normalizes and resolves a registered private host surface", () => {
    const registry = createBrowserInteractionRegistry([
      defineBrowserInteractionSurface({
        surface: "gameplay",
        intents: [
          "arm",
          "reveal",
          "invoke",
          "select",
          "toggle",
          "increment",
          "decrement",
          "fill",
          "submit",
        ],
      }),
      defineBrowserInteractionSurface({
        surface: "host",
        intents: ["switchControlledPlayer"],
      }),
    ]);
    const snapshot = normalizeBrowserInteractionRecords(
      [
        record(
          createBrowserInteractionRootAttributes({
            surface: "host",
            scopeId: "session",
            interactionKey: "host.switchControlledPlayer",
            interactionId: "switchControlledPlayer",
            readiness: "ready",
          }),
        ),
        record(
          createBrowserInteractionActuatorAttributes({
            surface: "host",
            scopeId: "session",
            interactionKey: "host.switchControlledPlayer",
            interactionId: "switchControlledPlayer",
            intent: "switchControlledPlayer",
            inputKey: "playerId",
            candidateValue: "player-2",
            candidateState: "unselected",
            actuatorKind: "click",
          }),
        ),
      ],
      { registry },
    );

    expect(snapshot.diagnostics).toEqual([]);
    expect(
      browserInteractionSnapshotSchema.safeParse(snapshot).success,
    ).toBe(true);
    expect(
      resolveBrowserInteractionIntent(snapshot, {
        surface: "host",
        scopeId: "session",
        interactionKey: "host.switchControlledPlayer",
        intent: "switchControlledPlayer",
        inputKey: "playerId",
        candidateValue: "player-2",
      }),
    ).toMatchObject({ ok: true });
  });

  test("keeps the browser-interaction subpath free of consumer-specific imports", () => {
    const root = new URL(".", import.meta.url).pathname;
    const files = listFiles(root).filter(
      (file) => file.endsWith(".ts") && !file.endsWith(".test.ts"),
    );
    const source = files.map((file) => readFileSync(file, "utf8")).join("\n");

    expect(source).not.toContain("playwright");
    expect(source).not.toContain("tools/perf");
    expect(source).not.toContain("@dreamboard/");
    expect(source).not.toContain("/Users/mac/code/dreamboard");
  });
});

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return listFiles(path);
    return path;
  });
}

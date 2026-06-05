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
  encodeBrowserInteractionEffect,
  encodeCanonicalCandidateValue,
  gameplayCommitEffect,
  gameplayInvokeEffect,
  gameplaySetCandidateEffect,
  gameplaySetScalarEffect,
  normalizeBrowserInteractionRecords,
  resolveBrowserInteractionEffect,
  resolveBrowserInteractionIntent,
  validateBrowserInteractionSnapshot,
  type BrowserInteractionEffectPattern,
  type BrowserInteractionRawRecord,
  type BrowserInteractionSurfaceEffect,
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

  test("resolves a string candidate from a toggle semantic effect", () => {
    const effect = gameplaySetCandidateEffect({
      inputKey: "targetPlayerIds",
      candidateValue: "player-2",
      beforeSelected: false,
      afterSelected: true,
    });
    const snapshot = normalizeBrowserInteractionRecords([
      record(interactionRoot),
      record(
        createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "toggle",
          inputKey: "targetPlayerIds",
          candidateValue: "player-2",
          candidateState: "unselected",
          actuatorKind: "click",
          semanticEffects: [effect],
        }),
      ),
    ]);

    expect(
      resolveBrowserInteractionEffect(snapshot, {
        surface: "gameplay",
        scopeId: "active-plugin",
        interactionKey: "playerTurn.offerTrade",
        effect,
      }),
    ).toMatchObject({ ok: true, match: "exact" });
  });

  test("resolves a boolean candidate from a select semantic effect", () => {
    const effect = gameplaySetCandidateEffect({
      inputKey: "acceptTrade",
      candidateValue: true,
      beforeSelected: false,
      afterSelected: true,
    });
    const snapshot = normalizeBrowserInteractionRecords([
      record(interactionRoot),
      record(
        createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "select",
          inputKey: "acceptTrade",
          candidateValue: true,
          candidateState: "unselected",
          actuatorKind: "click",
          semanticEffects: [effect],
        }),
      ),
    ]);

    const resolution = resolveBrowserInteractionEffect(snapshot, {
      surface: "gameplay",
      scopeId: "active-plugin",
      interactionKey: "playerTurn.offerTrade",
      effect,
    });

    expect(resolution.ok).toBe(true);
    if (resolution.ok) {
      expect(resolution.actuator.intent).toBe("select");
    }
  });

  test("resolves manual commit from an invoke-like rendered control", () => {
    const effect = gameplayCommitEffect();
    const snapshot = normalizeBrowserInteractionRecords([
      record(interactionRoot),
      record(
        createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "invoke",
          actuatorKind: "click",
          semanticEffects: [effect],
        }),
      ),
    ]);

    expect(
      resolveBrowserInteractionEffect(snapshot, {
        surface: "gameplay",
        scopeId: "active-plugin",
        interactionKey: "playerTurn.offerTrade",
        effect,
      }),
    ).toMatchObject({ ok: true, match: "exact" });
  });

  test("resolves direct invoke with input context", () => {
    const effect = gameplayInvokeEffect();
    const snapshot = normalizeBrowserInteractionRecords([
      record(interactionRoot),
      record(
        createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "invoke",
          inputKey: "action",
          candidateValue: "counter",
          actuatorKind: "click",
          semanticEffects: [effect],
        }),
      ),
    ]);

    const resolution = resolveBrowserInteractionEffect(snapshot, {
      surface: "gameplay",
      scopeId: "active-plugin",
      interactionKey: "playerTurn.offerTrade",
      effect,
    });

    expect(resolution.ok).toBe(true);
    if (resolution.ok) {
      expect(resolution.actuator.inputKey).toBe("action");
      expect(resolution.actuator.candidateValue).toBe("counter");
    }
  });

  test("resolves scalar fill with the requested value instead of current value", () => {
    const effect = gameplaySetScalarEffect({ inputKey: "amount", value: 7 });
    const fillPattern: BrowserInteractionEffectPattern = {
      kind: "match",
      effectKind: "setScalar",
      fields: { inputKey: "amount" },
      scalar: { field: "value", min: 0, max: 10, integer: true },
    };
    const snapshot = normalizeBrowserInteractionRecords([
      record(interactionRoot),
      record(
        createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "fill",
          inputKey: "amount",
          candidateValue: 2,
          actuatorKind: "fill",
          acceptedEffectPatterns: [fillPattern],
        }),
      ),
    ]);

    const resolution = resolveBrowserInteractionEffect(snapshot, {
      surface: "gameplay",
      scopeId: "active-plugin",
      interactionKey: "playerTurn.offerTrade",
      effect,
    });

    expect(resolution).toMatchObject({ ok: true, match: "accepted-pattern" });
    if (resolution.ok) {
      expect(resolution.effect).toEqual(effect);
      expect(resolution.actuator.candidateValue).toBe(2);
    }
  });

  test("prefers an exact scalar stepper effect over a matching fill capability", () => {
    const effect = gameplaySetScalarEffect({ inputKey: "amount", value: 3 });
    const fillPattern: BrowserInteractionEffectPattern = {
      kind: "match",
      effectKind: "setScalar",
      fields: { inputKey: "amount" },
      scalar: { field: "value", min: 0, max: 10, integer: true },
    };
    const snapshot = normalizeBrowserInteractionRecords([
      record(interactionRoot),
      record(
        createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "fill",
          inputKey: "amount",
          actuatorKind: "fill",
          acceptedEffectPatterns: [fillPattern],
        }),
      ),
      record(
        createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "increment",
          inputKey: "amount",
          actuatorKind: "click",
          semanticEffects: [effect],
        }),
      ),
    ]);

    const resolution = resolveBrowserInteractionEffect(snapshot, {
      surface: "gameplay",
      scopeId: "active-plugin",
      interactionKey: "playerTurn.offerTrade",
      effect,
    });

    expect(resolution).toMatchObject({ ok: true, match: "exact" });
    if (resolution.ok) {
      expect(resolution.actuator.intent).toBe("increment");
    }
  });

  test("fails closed on ambiguous scalar accepted-effect capabilities", () => {
    const effect = gameplaySetScalarEffect({ inputKey: "amount", value: 3 });
    const fillPattern: BrowserInteractionEffectPattern = {
      kind: "match",
      effectKind: "setScalar",
      fields: { inputKey: "amount" },
      scalar: { field: "value", min: 0, max: 10, integer: true },
    };
    const snapshot = normalizeBrowserInteractionRecords([
      record(interactionRoot),
      record(
        createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "fill",
          inputKey: "amount",
          actuatorKind: "fill",
          actuatorId: "amount-fill",
          acceptedEffectPatterns: [fillPattern],
        }),
      ),
      record(
        createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "fill",
          inputKey: "amount",
          actuatorKind: "keyboard",
          actuatorId: "amount-keyboard",
          acceptedEffectPatterns: [fillPattern],
        }),
      ),
    ]);

    const resolution = resolveBrowserInteractionEffect(snapshot, {
      surface: "gameplay",
      scopeId: "active-plugin",
      interactionKey: "playerTurn.offerTrade",
      effect,
    });

    expect(resolution).toMatchObject({ ok: false, code: "ambiguous" });
    expect(
      resolution.ok ? [] : resolution.diagnostics.map((item) => item.code),
    ).toContain("duplicate-accepted-effect-pattern-match");
  });

  test("describes exact candidate preparation with a semantic pattern", () => {
    const effect = gameplaySetCandidateEffect({
      inputKey: "choice",
      candidateValue: "hidden",
      beforeSelected: false,
      afterSelected: true,
    });
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
          preparationPatterns: [{ kind: "exact", effect }],
        }),
      ),
    ]);

    const resolution = resolveBrowserInteractionEffect(snapshot, {
      surface: "gameplay",
      scopeId: "active-plugin",
      interactionKey: "playerTurn.offerTrade",
      effect,
    });

    expect(resolution).toMatchObject({
      ok: false,
      code: "preparation-required",
    });
    expect(
      resolution.ok ? undefined : resolution.preparation?.[0]?.intent,
    ).toBe("reveal");
  });

  test("describes fan-out reveal preparation for one input", () => {
    const effect = gameplaySetCandidateEffect({
      inputKey: "choice",
      candidateValue: "any-candidate",
      beforeSelected: false,
      afterSelected: true,
    });
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
          preparationPatterns: [
            {
              kind: "match",
              effectKind: "setCandidate",
              fields: { inputKey: "choice" },
            },
          ],
        }),
      ),
    ]);

    expect(
      resolveBrowserInteractionEffect(snapshot, {
        surface: "gameplay",
        scopeId: "active-plugin",
        interactionKey: "playerTurn.offerTrade",
        effect,
      }),
    ).toMatchObject({ ok: false, code: "preparation-required" });
  });

  test("describes interaction-wide arm preparation", () => {
    const effect = gameplaySetScalarEffect({ inputKey: "amount", value: 2 });
    const snapshot = normalizeBrowserInteractionRecords([
      record(interactionRoot),
      record(
        createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "arm",
          actuatorKind: "click",
          preparationPatterns: [
            {
              kind: "match",
              effectKind: "setScalar",
            },
          ],
        }),
      ),
    ]);

    expect(
      resolveBrowserInteractionEffect(snapshot, {
        surface: "gameplay",
        scopeId: "active-plugin",
        interactionKey: "playerTurn.offerTrade",
        effect,
      }),
    ).toMatchObject({ ok: false, code: "preparation-required" });
  });

  test("describes host menu preparation with a registered generic surface", () => {
    const hostEffect: BrowserInteractionSurfaceEffect = {
      kind: "switchControlledPlayer",
      inputKey: "playerId",
      candidateValue: "player-2",
    };
    const registry = createBrowserInteractionRegistry([
      defineBrowserInteractionSurface({
        surface: "host",
        intents: ["openMenu", "switchControlledPlayer"],
        effectKinds: ["switchControlledPlayer"],
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
            intent: "openMenu",
            actuatorKind: "click",
            preparationPatterns: [
              {
                kind: "match",
                effectKind: "switchControlledPlayer",
                fields: { inputKey: "playerId" },
              },
            ],
          }),
        ),
      ],
      { registry },
    );

    expect(
      resolveBrowserInteractionEffect(snapshot, {
        surface: "host",
        scopeId: "session",
        interactionKey: "host.switchControlledPlayer",
        effect: hostEffect,
      }),
    ).toMatchObject({ ok: false, code: "preparation-required" });
  });

  test("fails closed on duplicate exact effect actuators", () => {
    const effect = gameplaySetCandidateEffect({
      inputKey: "targetPlayerIds",
      candidateValue: "player-2",
      beforeSelected: false,
      afterSelected: true,
    });
    const snapshot = normalizeBrowserInteractionRecords([
      record(interactionRoot),
      record(
        createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "toggle",
          inputKey: "targetPlayerIds",
          actuatorKind: "click",
          semanticEffects: [effect],
        }),
      ),
      record(
        createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "select",
          inputKey: "targetPlayerIds",
          actuatorKind: "keyboard",
          semanticEffects: [effect],
        }),
      ),
    ]);

    const resolution = resolveBrowserInteractionEffect(snapshot, {
      surface: "gameplay",
      scopeId: "active-plugin",
      interactionKey: "playerTurn.offerTrade",
      effect,
    });

    expect(resolution).toMatchObject({ ok: false, code: "ambiguous" });
    expect(
      resolution.ok ? [] : resolution.diagnostics.map((item) => item.code),
    ).toContain("duplicate-enabled-effect-actuator");
  });

  test("diagnoses overlapping preparation patterns", () => {
    const effect = gameplaySetCandidateEffect({
      inputKey: "choice",
      candidateValue: "hidden",
      beforeSelected: false,
      afterSelected: true,
    });
    const snapshot = normalizeBrowserInteractionRecords([
      record(interactionRoot),
      record(
        createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "toggle",
          inputKey: "choice",
          actuatorKind: "click",
          semanticEffects: [effect],
          enabled: false,
        }),
      ),
      record(
        createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "reveal",
          actuatorKind: "click",
          actuatorId: "exact-reveal",
          preparationPatterns: [{ kind: "exact", effect }],
        }),
      ),
      record(
        createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "arm",
          actuatorKind: "keyboard",
          actuatorId: "wide-arm",
          preparationPatterns: [
            {
              kind: "match",
              effectKind: "setCandidate",
              fields: { inputKey: "choice" },
            },
          ],
        }),
      ),
    ]);

    expect(snapshot.diagnostics.map((item) => item.code)).toContain(
      "ambiguous-preparation-pattern",
    );
  });

  test("detects semantic preparation cycles", () => {
    const armEffect: BrowserInteractionSurfaceEffect = { kind: "arm" };
    const revealEffect: BrowserInteractionSurfaceEffect = { kind: "reveal" };
    const registry = createBrowserInteractionRegistry([
      defineBrowserInteractionSurface({
        surface: "generic",
        intents: ["arm", "reveal"],
        effectKinds: ["arm", "reveal"],
      }),
    ]);
    const snapshot = normalizeBrowserInteractionRecords(
      [
        record(
          createBrowserInteractionRootAttributes({
            surface: "generic",
            scopeId: "scope",
            interactionKey: "generic.flow",
            interactionId: "flow",
            readiness: "ready",
          }),
        ),
        record(
          createBrowserInteractionActuatorAttributes({
            surface: "generic",
            scopeId: "scope",
            interactionKey: "generic.flow",
            interactionId: "flow",
            intent: "arm",
            actuatorKind: "click",
            semanticEffects: [armEffect],
            preparationPatterns: [{ kind: "exact", effect: revealEffect }],
          }),
        ),
        record(
          createBrowserInteractionActuatorAttributes({
            surface: "generic",
            scopeId: "scope",
            interactionKey: "generic.flow",
            interactionId: "flow",
            intent: "reveal",
            actuatorKind: "click",
            semanticEffects: [revealEffect],
            preparationPatterns: [{ kind: "exact", effect: armEffect }],
          }),
        ),
      ],
      { registry },
    );

    expect(snapshot.diagnostics.map((item) => item.code)).toContain(
      "preparation-cycle",
    );
  });

  test("fails closed on a disabled exact-effect actuator", () => {
    const effect = gameplaySetCandidateEffect({
      inputKey: "targetPlayerIds",
      candidateValue: "player-2",
      beforeSelected: false,
      afterSelected: true,
    });
    const snapshot = normalizeBrowserInteractionRecords([
      record(interactionRoot),
      record(
        createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "toggle",
          inputKey: "targetPlayerIds",
          actuatorKind: "click",
          enabled: false,
          semanticEffects: [effect],
        }),
      ),
    ]);

    const resolution = resolveBrowserInteractionEffect(snapshot, {
      surface: "gameplay",
      scopeId: "active-plugin",
      interactionKey: "playerTurn.offerTrade",
      effect,
    });

    expect(resolution).toMatchObject({ ok: false, code: "unavailable" });
    expect(
      resolution.ok ? [] : resolution.diagnostics.map((item) => item.code),
    ).toContain("disabled-effect-actuator");
  });

  test("normalizes effect ordering and canonical effect encoding", () => {
    const effectA = gameplaySetCandidateEffect({
      inputKey: "choice",
      candidateValue: { z: 1, a: 2 },
      beforeSelected: false,
      afterSelected: true,
    });
    const effectB = gameplaySetScalarEffect({ inputKey: "amount", value: 3 });
    const snapshot = normalizeBrowserInteractionRecords([
      record(interactionRoot),
      record(
        createGameplayActuatorAttributes({
          scopeId: "active-plugin",
          interactionKey: "playerTurn.offerTrade",
          interactionId: "offerTrade",
          intent: "toggle",
          inputKey: "choice",
          actuatorKind: "click",
          semanticEffects: [effectB, effectA],
        }),
      ),
    ]);
    const actuator = snapshot.surfaces
      .flatMap((surface) =>
        "interactions" in surface ? surface.interactions : [],
      )
      .flatMap((interaction) => interaction.actuators)[0];

    expect(
      actuator?.semanticEffects.map(encodeBrowserInteractionEffect),
    ).toEqual(
      [...(actuator?.semanticEffects ?? [])]
        .map(encodeBrowserInteractionEffect)
        .sort(),
    );
    expect(encodeBrowserInteractionEffect(effectA)).toContain('"a":2');
  });

  test("rejects intent-only records for effect resolution", () => {
    const effect = gameplayCommitEffect();
    const snapshot = normalizeBrowserInteractionRecords([
      record(interactionRoot),
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

    expect(
      resolveBrowserInteractionEffect(snapshot, {
        surface: "gameplay",
        scopeId: "active-plugin",
        interactionKey: "playerTurn.offerTrade",
        effect,
      }),
    ).toMatchObject({ ok: false, code: "not-found" });
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
    expect(browserInteractionSnapshotSchema.safeParse(snapshot).success).toBe(
      true,
    );
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

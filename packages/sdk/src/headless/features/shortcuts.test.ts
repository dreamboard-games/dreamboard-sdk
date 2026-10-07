import { expect, test } from "vitest";
import { createGameInstance } from "../instance.js";
import { shortcutsFeature } from "./shortcuts.js";
import { createTestSource } from "../../testing/sources/test-source.js";
import { frame, session } from "../sources/__fixtures__/frames.js";
import type { SourceSnapshot } from "../model.js";
function snapshot(version = 1, me = "alice"): SourceSnapshot {
  const { basis, ...seat } = frame(version);
  void basis;
  return {
    me,
    players: session.players,
    version,
    frame: {
      ...seat,
      availableInteractions: [
        {
          kind: "action",
          interactionId: "draw",
          interactionKey: "play.draw",
          phaseName: "play",
          label: "Draw",
          availability: { status: "available" },
          commit: { mode: "manual" },
          inputs: [
            {
              key: "count",
              kind: "form",
              domain: { type: "boundedNumber", min: 1, max: 5, step: 1 },
            },
          ],
        },
      ],
      zones: {
        deck: {
          table: {
            tiles: [],
            cardIds: [],
            cardViewsById: {},
            cardBacksById: {},
            playableByCardId: {},
          },
        },
      },
    },
  };
}
function setup() {
  const source = createTestSource(snapshot());
  const game = createGameInstance()({
    source,
    features: (game, context) => ({
      shortcuts: shortcutsFeature(game, context),
    }),
  });
  return { source, game };
}
const target = { kind: "zone" as const, zoneId: "deck", hostId: "table" };
const options = {
  bindings: [
    {
      keys: ["1", "3", "9"],
      label: "Draw cards",
      interaction: "play.draw",
      target: "zone" as const,
      zoneId: "deck",
      inputs: ({ key }: { key: string }) => ({ count: Number(key) }),
    },
  ],
};
test("unconfigured is inert; eligible authored draw count submits one atomic payload and preserves drafts", async () => {
  const { source, game } = setup();
  expect(game.shortcuts.handle("3", target)).toBeNull();
  game.interactions.get("play.draw").getInput("count").setValue(1);
  const drafts = game.state.drafts;
  const unregister = game.shortcuts.register(options);
  expect(game.shortcuts.getHints(target)).toEqual([
    { keys: ["1", "3"], label: "Draw cards", interaction: "play.draw" },
  ]);
  expect(game.shortcuts.handle("9", target)).toBeNull();
  expect(
    game.shortcuts.handle("3", { ...target, hostId: "missing" }),
  ).toBeNull();
  expect(game.state.drafts).toBe(drafts);
  const pending = game.shortcuts.handle("3", target)!;
  expect(source.submissions).toHaveLength(1);
  expect(source.submissions[0].params).toEqual({ count: 3 });
  expect(game.state.drafts).toBe(drafts);
  expect(game.shortcuts.handle("1", target)).toBeNull();
  source.submissions[0].resolve({ accepted: true });
  await pending;
  // Result alone cannot release the authoritative-frame barrier.
  expect(game.shortcuts.handle("1", target)).toBeNull();
  source.emit(snapshot(2));
  expect(game.shortcuts.getHints(target)).toHaveLength(1);
  unregister.dispose();
  expect(game.shortcuts.getHints(target)).toEqual([]);
  expect(game.shortcuts.handle("3", target)).toBeNull();
  game.dispose();
});
test("atomic submit validates the projected domain without mutating drafts; stale handles cannot act on a new source", async () => {
  const { source, game } = setup();
  const action = game.interactions.get("play.draw");
  expect(action.getIsReady({ count: 3 })).toBe(true);
  expect(action.getIsReady({ count: 9 })).toBe(false);
  expect(await action.submit({ count: 9 })).toEqual({
    accepted: false,
    errorCode: "UNAVAILABLE",
  });
  expect(source.submissions).toHaveLength(0);
  expect(game.state.drafts).toEqual({});
  const next = createTestSource(snapshot());
  game.setOptions({ ...game.getOptions(), source: next });
  expect(await action.submit({ count: 3 })).toEqual({
    accepted: false,
    errorCode: "CLOSED",
  });
  expect(next.submissions).toHaveLength(0);
  game.dispose();
});
test("conflicting authored bindings do not dispatch; registration cleanup cannot remove a newer registration", () => {
  const { game, source } = setup();
  const old = game.shortcuts.register({
    bindings: [...options.bindings, ...options.bindings],
  });
  expect(game.shortcuts.handle("3", target)).toBeNull();
  expect(game.shortcuts.getHints(target)).toEqual([]);
  expect(source.submissions).toHaveLength(0);
  old.dispose();
  const next = game.shortcuts.register(options);
  old.dispose();
  expect(game.shortcuts.getHints(target)).toHaveLength(1);
  next.dispose();
  game.dispose();
});
test("card-specific availability and hidden seat references share canonical atomic submit validation", async () => {
  const hidden = `card-ref:sha256:${"a".repeat(64)}`;
  const initial = snapshot();
  const base = {
    kind: "action" as const,
    interactionId: "flip",
    interactionKey: "play.flip",
    phaseName: "play",
    label: "Flip",
    availability: { status: "blocked" as const, reason: "Choose a card" },
    commit: { mode: "manual" as const },
    inputs: [
      {
        key: "card",
        kind: "card" as const,
        domain: {
          type: "cardTarget" as const,
          targetKind: "card" as const,
          projection: "resolved" as const,
          zoneIds: ["deck"],
          eligibleTargets: [] as string[],
        },
      },
    ],
  };
  const route = {
    ...base,
    availability: { status: "available" as const },
    inputs: [
      {
        ...base.inputs[0],
        domain: { ...base.inputs[0].domain, eligibleTargets: [hidden] },
      },
    ],
  };
  const projected: SourceSnapshot = {
    ...initial,
    frame: {
      ...initial.frame,
      availableInteractions: [base],
      zones: {
        deck: {
          table: {
            tiles: [],
            cardIds: [hidden],
            cardViewsById: {},
            cardBacksById: {},
            playableByCardId: { [hidden]: [route] },
          },
        },
      },
    },
  };
  const source = createTestSource(projected);
  const game = createGameInstance()({
    source,
    features: (game, context) => ({
      shortcuts: shortcutsFeature(game, context),
    }),
  });
  const unregister = game.shortcuts.register({
    bindings: [
      {
        keys: ["f"],
        label: "Flip",
        interaction: "play.flip",
        target: "card",
        input: "card",
        inputs: ({ target }) => ({ card: target.value }),
      },
      {
        keys: ["t"],
        label: "Flip top card",
        interaction: "play.flip",
        target: "zone",
        zoneId: "deck",
        inputs: () => ({ card: hidden }),
      },
    ],
  });
  const card = { kind: "card" as const, value: hidden };
  expect(game.cards.get(hidden).hidden).toBe(true);
  expect(game.interactions.get("play.flip").getIsAvailable()).toBe(false);
  expect(
    game.interactions.get("play.flip").getIsAvailable({ card: hidden }),
  ).toBe(true);
  expect(game.shortcuts.getHints(target)).toEqual([
    { keys: ["t"], label: "Flip top card", interaction: "play.flip" },
  ]);
  const zonePending = game.shortcuts.handle("t", target)!;
  expect(source.submissions[0].params).toEqual({ card: hidden });
  source.submissions[0].resolve({ accepted: true });
  await zonePending;
  source.emit({ ...projected, version: 2 });
  const pending = game.shortcuts.handle("f", card)!;
  expect(source.submissions[1].params).toEqual({ card: hidden });
  source.submissions[1].resolve({ accepted: true });
  await pending;
  source.emit(snapshot(3));
  expect(game.shortcuts.handle("f", card)).toBeNull();
  expect(game.shortcuts.getHints(card)).toEqual([]);
  unregister.dispose();
  game.dispose();
});

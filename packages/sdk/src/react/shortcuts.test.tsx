import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { act, StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { createGameInstance } from "../headless/instance.js";
import { shortcutsFeature } from "../headless/features/shortcuts.js";
import { useShortcutsAdapter } from "./shortcuts.js";
import { createTestSource } from "../testing/sources/test-source.js";
import { frame, session } from "../headless/sources/__fixtures__/frames.js";
import type { SourceSnapshot } from "../headless/model.js";
beforeAll(() => {
  GlobalRegistrator.register();
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());
const snapshot = (version = 1): SourceSnapshot => {
  const { basis, ...seat } = frame(version);
  void basis;
  return {
    me: "alice",
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
};
test("opt-in adapter ignores competing browser/UI input, handles once, and cleans up StrictMode replay", async () => {
  const source = createTestSource(snapshot());
  const game = createGameInstance()({
    source,
    features: (game, context) => ({
      shortcuts: shortcutsFeature(game, context),
    }),
  });
  const target = { kind: "zone" as const, zoneId: "deck", hostId: "table" };
  const session = { getActiveTarget: () => target };
  const onResult = vi.fn();
  const options = {
    bindings: [
      {
        keys: ["3"],
        label: "Draw",
        target: "zone" as const,
        zoneId: "deck",
        interaction: "play.draw",
        inputs: () => ({ count: 3 }),
      },
    ],
  };
  function Child() {
    useShortcutsAdapter(game, game.shortcuts, session, options, onResult);
    return <button>Draw</button>;
  }
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () =>
    root.render(
      <StrictMode>
        <Child />
      </StrictMode>,
    ),
  );
  async function key(
    init: KeyboardEventInit = {},
    element: EventTarget = window,
  ) {
    const event = new KeyboardEvent("keydown", {
      key: "3",
      cancelable: true,
      bubbles: true,
      ...init,
    });
    await act(async () => {
      element.dispatchEvent(event);
    });
    return event;
  }
  for (const init of [
    { repeat: true },
    { isComposing: true },
    { ctrlKey: true },
    { metaKey: true },
    { altKey: true },
    { shiftKey: true },
    { key: "4" },
  ])
    expect((await key(init)).defaultPrevented).toBe(false);
  for (const tag of ["input", "textarea", "select"]) {
    const edit = document.createElement(tag);
    host.append(edit);
    expect((await key({}, edit)).defaultPrevented).toBe(false);
    edit.remove();
  }
  const edit = document.createElement("div");
  edit.contentEditable = "true";
  host.append(edit);
  expect((await key({}, edit)).defaultPrevented).toBe(false);
  edit.remove();
  const modal = document.createElement("div");
  modal.setAttribute("aria-modal", "true");
  document.body.append(modal);
  expect((await key()).defaultPrevented).toBe(false);
  modal.remove();
  expect(source.submissions).toHaveLength(0);
  expect((await key()).defaultPrevented).toBe(true);
  expect(source.submissions).toHaveLength(1);
  expect((await key()).defaultPrevented).toBe(false);
  await act(async () => {
    source.submissions[0].resolve({ accepted: true });
  });
  expect(onResult).toHaveBeenCalledOnce();
  source.emit(snapshot(2));
  await act(async () => root.unmount());
  expect((await key()).defaultPrevented).toBe(false);
  expect(game.shortcuts.getHints(target)).toEqual([]);
  game.dispose();
  host.remove();
});
test("late result after unmount or source switch does not notify the new lifetime", async () => {
  const source = createTestSource(snapshot());
  const game = createGameInstance()({
    source,
    features: (game, context) => ({
      shortcuts: shortcutsFeature(game, context),
    }),
  });
  const session = {
    getActiveTarget: () => ({
      kind: "zone" as const,
      zoneId: "deck",
      hostId: "table",
    }),
  };
  const onResult = vi.fn();
  function Child() {
    useShortcutsAdapter(
      game,
      game.shortcuts,
      session,
      {
        bindings: [
          {
            keys: ["3"],
            label: "Draw",
            target: "zone",
            zoneId: "deck",
            interaction: "play.draw",
            inputs: () => ({ count: 3 }),
          },
        ],
      },
      onResult,
    );
    return null;
  }
  const host = document.createElement("div");
  const root = createRoot(host);
  await act(async () => root.render(<Child />));
  await act(async () =>
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "3", cancelable: true }),
    ),
  );
  const next = createTestSource(snapshot());
  game.setOptions({ ...game.getOptions(), source: next });
  await act(async () =>
    source.submissions[0].resolve({ accepted: false, errorCode: "OLD" }),
  );
  expect(onResult).not.toHaveBeenCalled();
  await act(async () =>
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "3", cancelable: true }),
    ),
  );
  await act(async () => root.unmount());
  await act(async () =>
    next.submissions[0].resolve({ accepted: false, errorCode: "OLD" }),
  );
  expect(onResult).not.toHaveBeenCalled();
  game.dispose();
});

test("bound hooks share one physical target, publish hints, and clear across frame and source changes", async () => {
  const { createGameHook } = await import("./create-game-hook.js");
  const { GameProvider, useGame, useGameShortcuts, useShortcutTarget } =
    createGameHook()({
      features: (game, context) => ({
        shortcuts: shortcutsFeature(game, context),
      }),
    });
  const source = createTestSource(snapshot());
  const errors = vi.fn();
  function App({ drawKey = "3" }: { drawKey?: string }) {
    useGame();
    const [, setTick] = useState(0);
    const shortcuts = useGameShortcuts({
      bindings: [
        {
          keys: [drawKey],
          label: "Draw",
          target: "zone",
          zoneId: "deck",
          interaction: "play.draw",
          inputs: ({ key }) => ({ count: Number(key) }),
        },
      ],
    });
    const zone = useShortcutTarget({
      kind: "zone",
      zoneId: "deck",
      hostId: "table",
    });
    return (
      <>
        <button {...zone.props}>Deck</button>
        <output>{JSON.stringify(shortcuts)}</output>
        <button data-rerender onClick={() => setTick((value) => value + 1)}>
          Rerender
        </button>
      </>
    );
  }
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () =>
    root.render(
      <StrictMode>
        <GameProvider source={source} onError={errors}>
          <App />
        </GameProvider>
      </StrictMode>,
    ),
  );
  const button = host.querySelector("button")!;
  document.elementFromPoint = () => button;
  await act(async () =>
    window.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerType: "mouse",
        clientX: 10,
        clientY: 10,
      }),
    ),
  );
  expect(host.querySelector("output")!.textContent).toContain(
    '"hostId":"table"',
  );
  expect(host.querySelector("output")!.textContent).toContain('"Draw"');
  await act(async () =>
    root.render(
      <StrictMode>
        <GameProvider source={source} onError={errors}>
          <App drawKey="2" />
        </GameProvider>
      </StrictMode>,
    ),
  );
  expect(host.querySelector("output")!.textContent).toContain('"keys":["2"]');
  await act(async () =>
    host.querySelector<HTMLButtonElement>("[data-rerender]")!.click(),
  );
  expect(host.querySelector("output")!.textContent).toContain('"keys":["2"]');
  const oldKey = new KeyboardEvent("keydown", { key: "3", cancelable: true });
  await act(async () => window.dispatchEvent(oldKey));
  expect(oldKey.defaultPrevented).toBe(false);
  expect(source.submissions).toHaveLength(0);
  const event = new KeyboardEvent("keydown", { key: "2", cancelable: true });
  await act(async () => window.dispatchEvent(event));
  expect(event.defaultPrevented).toBe(true);
  expect(source.submissions[0].params).toEqual({ count: 2 });
  await act(async () =>
    source.submissions[0].resolve({
      accepted: false,
      errorCode: "RULE_REJECT",
    }),
  );
  expect(errors).toHaveBeenCalledOnce();
  await act(async () => source.emit(snapshot(2)));
  expect(host.querySelector("output")!.textContent).toBe(
    '{"target":null,"hints":[]}',
  );
  const unhandled = new KeyboardEvent("keydown", {
    key: "3",
    cancelable: true,
  });
  await act(async () => window.dispatchEvent(unhandled));
  expect(unhandled.defaultPrevented).toBe(false);
  // A deliberate keyboard focus uses the same canonical target as pointer movement.
  const matches = button.matches.bind(button);
  vi.spyOn(button, "matches").mockImplementation(
    (selector) => selector === ":focus-visible" || matches(selector),
  );
  await act(async () => button.focus());
  expect(host.querySelector("output")!.textContent).toContain(
    '"hostId":"table"',
  );
  const next = createTestSource(snapshot());
  await act(async () =>
    root.render(
      <GameProvider source={next} onError={errors}>
        <App />
      </GameProvider>,
    ),
  );
  expect(host.querySelector("output")!.textContent).toBe(
    '{"target":null,"hints":[]}',
  );
  await act(async () => root.unmount());
  host.remove();
});

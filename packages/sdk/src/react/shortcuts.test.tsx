import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { act, StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { createGameInstance } from "../headless/instance.js";
import { shortcutsFeature } from "../headless/features/shortcuts.js";
import { useShortcutsAdapter } from "./shortcuts.js";
import { createSourceLifecycle } from "../headless/sources/lifecycle.js";
import { createTestSource } from "../testing/sources/test-source.js";
import { frame, session } from "../headless/sources/__fixtures__/frames.js";
import type { SourceSnapshot } from "../headless/model.js";
import type { SourceCommand } from "../headless/sources/types.js";
beforeAll(() => {
  GlobalRegistrator.register();
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());
const snapshot = (version = 1): SourceSnapshot => {
  const { basis, ...seat } = frame(version);
  void basis;
  const deck = {
    tiles: [],
    cardIds: [],
    cardViewsById: {},
    cardBacksById: {},
    playableByCardId: {},
  };
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
          table: deck,
          alice: deck,
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
  const session = {
    getActiveTarget: () => target,
    getShortcutActivity: () => ({ focusedTarget: null, pointerActive: false }),
  };
  const onResult = vi.fn();
  const options = {
    bindings: [
      {
        kind: "interaction" as const,
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
  // UI libraries can keep closed surfaces mounted. None of these rendered
  // visibility/ARIA states should suppress an otherwise eligible binding.
  const dormant = document.createElement("div");
  dormant.innerHTML = `
    <div role="dialog" hidden style="display:none">Closed dialog</div>
    <div role="menu" style="display:none">Closed menu</div>
    <div style="visibility:hidden"><div role="listbox">Hidden list</div></div>
    <div role="dialog" style="opacity:0">Transparent dialog</div>
    <div aria-hidden="true"><div role="menu">Dormant menu</div></div>
    <dialog>Closed native dialog</dialog>
  `;
  document.body.append(dormant);
  const modal = document.createElement("div");
  modal.setAttribute("aria-modal", "true");
  document.body.append(modal);
  expect((await key()).defaultPrevented).toBe(false);
  modal.remove();
  for (const role of ["dialog", "menu", "listbox"]) {
    const visible = document.createElement("div");
    visible.setAttribute("role", role);
    visible.textContent = "Open surface";
    dormant.append(visible);
    expect((await key()).defaultPrevented).toBe(false);
    visible.remove();
  }
  const native = dormant.querySelector("dialog")!;
  native.setAttribute("open", "");
  expect((await key()).defaultPrevented).toBe(false);
  native.removeAttribute("open");
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
  dormant.remove();
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
    getShortcutActivity: () => ({ focusedTarget: null, pointerActive: false }),
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
            kind: "interaction" as const,
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

test("bound hooks retain admitted frame targets, clear replaced controls and source lifetimes, and publish current hints", async () => {
  const { createGameHook } = await import("./create-game-hook.js");
  const { GameProvider, useGame, useGameShortcuts, useShortcutTarget } =
    createGameHook()({
      features: (game, context) => ({
        shortcuts: shortcutsFeature(game, context),
      }),
    });
  const source = createTestSource(snapshot());
  const errors = vi.fn();
  function App({
    drawKey = "3",
    hostId = "table",
  }: {
    drawKey?: string;
    hostId?: string;
  }) {
    useGame();
    const [, setTick] = useState(0);
    const shortcuts = useGameShortcuts({
      bindings: [
        {
          kind: "interaction" as const,
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
      hostId,
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
  expect(host.querySelector("output")!.textContent).toContain(
    '"hostId":"table"',
  );
  const repeated = new KeyboardEvent("keydown", { key: "2", cancelable: true });
  await act(async () => window.dispatchEvent(repeated));
  expect(repeated.defaultPrevented).toBe(true);
  expect(source.submissions).toHaveLength(2);
  await act(async () => source.submissions[1].resolve({ accepted: true }));
  await act(async () => source.emit(snapshot(3)));
  const third = new KeyboardEvent("keydown", { key: "2", cancelable: true });
  await act(async () => window.dispatchEvent(third));
  expect(third.defaultPrevented).toBe(true);
  expect(source.submissions).toHaveLength(3);
  await act(async () => source.submissions[2].resolve({ accepted: true }));
  await act(async () => source.emit(snapshot(4)));
  // The old host still exists: replacing the same DOM control must clear its
  // old identity even though the layout effect has installed the new props.
  await act(async () =>
    root.render(
      <StrictMode>
        <GameProvider source={source} onError={errors}>
          <App drawKey="2" hostId="alice" />
        </GameProvider>
      </StrictMode>,
    ),
  );
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
    '"hostId":"alice"',
  );
  const next = createTestSource(snapshot());
  await act(async () =>
    root.render(
      <StrictMode>
        <GameProvider source={next} onError={errors}>
          <App />
        </GameProvider>
      </StrictMode>,
    ),
  );
  expect(host.querySelector("output")!.textContent).toBe(
    '{"target":null,"hints":[]}',
  );
  await act(async () => root.unmount());
  host.remove();
});

test("local hooks use real card focus, retain its host while hovering elsewhere, and stop during gestures and new lifetimes", async () => {
  const { createGameHook } = await import("./create-game-hook.js");
  const { GameProvider, useGameShortcuts, useShortcutTarget, useCardGesture } =
    createGameHook()({
      features: (game, context) => ({
        shortcuts: shortcutsFeature(game, context),
      }),
    });
  const hidden = `card-ref:sha256:${"c".repeat(64)}`;
  const initial = localSnapshot();
  const projected: SourceSnapshot = {
    ...initial,
    frame: {
      ...initial.frame,
      zones: {
        deck: {
          ...initial.frame.zones.deck,
          table: { ...initial.frame.zones.deck.table, cardIds: [hidden] },
        },
      },
    },
  };
  const source = createSeatSource(projected);
  const calls = vi.fn();
  const errors = vi.fn();
  function App({ showCard = true }: { showCard?: boolean }) {
    const shortcuts = useGameShortcuts({
      bindings: [
        {
          kind: "local",
          keys: ["s"],
          label: "Order",
          target: "zone",
          zoneId: "deck",
          run: calls,
        },
      ],
    });
    const card = useCardGesture(hidden, { drag: false });
    const other = useShortcutTarget({
      kind: "zone",
      zoneId: "deck",
      hostId: "alice",
    });
    return (
      <>
        {showCard && (
          <button data-card {...card.props}>
            Card
          </button>
        )}
        <button data-other {...other.props}>
          Other host
        </button>
        <output>{JSON.stringify(shortcuts)}</output>
      </>
    );
  }
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const render = async (current = source, showCard = true) =>
    act(async () =>
      root.render(
        <GameProvider source={current} onError={errors}>
          <App showCard={showCard} />
        </GameProvider>,
      ),
    );
  await render();
  const card = host.querySelector<HTMLButtonElement>("[data-card]")!;
  const other = host.querySelector<HTMLButtonElement>("[data-other]")!;
  const key = async (
    init: KeyboardEventInit = {},
    element: EventTarget = window,
  ) => {
    const event = new KeyboardEvent("keydown", {
      key: "s",
      bubbles: true,
      cancelable: true,
      ...init,
    });
    await act(async () => {
      element.dispatchEvent(event);
    });
    return event;
  };
  document.elementFromPoint = () => card;
  await act(async () =>
    window.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerType: "mouse",
        clientX: 30,
        clientY: 30,
      }),
    ),
  );
  expect((await key()).defaultPrevented).toBe(false);
  expect(calls).not.toHaveBeenCalled();
  // Mouse focus is real scope even before the browser changes :focus-visible modality.
  vi.spyOn(card, "matches").mockReturnValue(false);
  await act(async () => card.focus());
  expect(document.activeElement).toBe(card);
  expect(host.querySelector("output")!.textContent).toContain('"kind":"local"');
  expect(calls).not.toHaveBeenCalled();
  document.elementFromPoint = () => other;
  await act(async () =>
    window.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerType: "mouse",
        clientX: 40,
        clientY: 30,
      }),
    ),
  );
  expect(host.querySelector("output")!.textContent).toContain(
    '"hostId":"alice"',
  );
  expect((await key()).defaultPrevented).toBe(true);
  expect(calls).toHaveBeenLastCalledWith({
    key: "s",
    target: { kind: "zone", zoneId: "deck", hostId: "table" },
  });
  for (const init of [
    { repeat: true },
    { isComposing: true },
    { ctrlKey: true },
    { metaKey: true },
    { altKey: true },
    { shiftKey: true },
  ])
    expect((await key(init)).defaultPrevented).toBe(false);
  const edit = document.createElement("input");
  host.append(edit);
  expect((await key({}, edit)).defaultPrevented).toBe(false);
  const menu = document.createElement("div");
  menu.setAttribute("role", "menu");
  host.append(menu);
  expect((await key()).defaultPrevented).toBe(false);
  menu.remove();
  await act(async () =>
    card.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        pointerType: "mouse",
        button: 0,
        pointerId: 1,
        clientX: 30,
        clientY: 30,
      }),
    ),
  );
  expect((await key()).defaultPrevented).toBe(false);
  expect(host.querySelector("output")!.textContent).not.toContain(
    '"kind":"local"',
  );
  await act(async () =>
    window.dispatchEvent(
      new PointerEvent("pointerup", {
        pointerType: "mouse",
        pointerId: 1,
        clientX: 30,
        clientY: 30,
      }),
    ),
  );
  expect((await key()).defaultPrevented).toBe(true);
  expect(calls).toHaveBeenCalledTimes(2);
  expect(source.submissions).toEqual([]);
  await render(source, false);
  expect(document.activeElement).toBe(document.body);
  expect((await key()).defaultPrevented).toBe(false);
  expect(host.querySelector("output")!.textContent).not.toContain(
    '"kind":"local"',
  );
  expect(calls).toHaveBeenCalledTimes(2);
  await render();
  const restoredCard = host.querySelector<HTMLButtonElement>("[data-card]")!;
  await act(async () => source.emit({ ...projected, me: "bob", version: 2 }));
  expect((await key()).defaultPrevented).toBe(false);
  await act(async () => {
    restoredCard.blur();
    restoredCard.focus();
  });
  expect((await key()).defaultPrevented).toBe(true);
  const next = createSeatSource(projected);
  await render(next);
  expect((await key()).defaultPrevented).toBe(false);
  expect(next.submissions).toEqual([]);
  await act(async () => root.unmount());
  expect((await key()).defaultPrevented).toBe(false);
  expect(errors).not.toHaveBeenCalled();
  host.remove();
});

test("local card focus follows its current zone and host across frames and clears when the card disappears", async () => {
  const { createGameHook } = await import("./create-game-hook.js");
  const { GameProvider, useGameShortcuts, useCardGesture } = createGameHook()({
    features: (game, context) => ({
      shortcuts: shortcutsFeature(game, context),
    }),
  });
  const cardId = `card-ref:sha256:${"d".repeat(64)}`;
  const initial = localSnapshot();
  const empty = initial.frame.zones.deck.table;
  function projected(version: number, zoneId: string, hostId: string) {
    return {
      ...initial,
      version,
      frame: {
        ...initial.frame,
        zones: Object.fromEntries(
          ["deck", "hand"].map((zone) => [
            zone,
            Object.fromEntries(
              ["table", "alice"].map((host) => [
                host,
                {
                  ...empty,
                  cardIds: zone === zoneId && host === hostId ? [cardId] : [],
                },
              ]),
            ),
          ]),
        ),
      },
    };
  }
  const source = createSeatSource(projected(1, "deck", "table"));
  const calls = vi.fn();
  function App() {
    const shortcuts = useGameShortcuts({
      bindings: ["deck", "hand"].map((zoneId) => ({
        kind: "local",
        keys: ["s"],
        label: `Order ${zoneId}`,
        target: "zone",
        zoneId,
        run: calls,
      })),
    });
    const card = useCardGesture(cardId, { drag: false });
    return (
      <>
        <button {...card.props}>Card</button>
        <output>{JSON.stringify(shortcuts.hints)}</output>
      </>
    );
  }
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () =>
    root.render(
      <GameProvider source={source}>
        <App />
      </GameProvider>,
    ),
  );
  const card = host.querySelector("button")!;
  await act(async () => card.focus());
  async function key() {
    const event = new KeyboardEvent("keydown", {
      key: "s",
      cancelable: true,
      bubbles: true,
    });
    await act(async () => card.dispatchEvent(event));
    return event;
  }
  expect(host.querySelector("output")!.textContent).toContain("Order deck");
  expect((await key()).defaultPrevented).toBe(true);
  for (const [version, zoneId, hostId] of [
    [2, "deck", "alice"],
    [3, "hand", "alice"],
  ] as const) {
    await act(async () => source.emit(projected(version, zoneId, hostId)));
    expect(document.activeElement).toBe(card);
    expect(host.querySelector("output")!.textContent).toContain(
      `Order ${zoneId}`,
    );
    expect((await key()).defaultPrevented).toBe(true);
    expect(calls).toHaveBeenLastCalledWith({
      key: "s",
      target: { kind: "zone", zoneId, hostId },
    });
  }
  await act(async () => source.emit(projected(4, "", "")));
  expect(document.activeElement).toBe(card);
  expect(host.querySelector("output")!.textContent).toBe("[]");
  expect((await key()).defaultPrevented).toBe(false);
  // Reappearing data must not restore focus scope without a new focus event.
  await act(async () => source.emit(projected(5, "hand", "alice")));
  expect((await key()).defaultPrevented).toBe(false);
  expect(calls).toHaveBeenCalledTimes(3);
  expect(source.submissions).toEqual([]);
  await act(async () => root.unmount());
  host.remove();
});

test("local callback errors use onError and cannot notify after lifetime changes, including seat and source round trips", async () => {
  const { createGameHook } = await import("./create-game-hook.js");
  const { GameProvider, useGameShortcuts, useShortcutTarget } =
    createGameHook()({
      features: (game, context) => ({
        shortcuts: shortcutsFeature(game, context),
      }),
    });
  const source = createSeatSource(localSnapshot());
  const errors = vi.fn();
  const error = new Error("Authored local action failed");
  let run: () => void | Promise<void> = () => {
    throw error;
  };
  function App() {
    useGameShortcuts({
      bindings: [
        {
          kind: "local",
          keys: ["s"],
          label: "Order",
          target: "zone",
          zoneId: "deck",
          run: () => run(),
        },
      ],
    });
    const target = useShortcutTarget({
      kind: "zone",
      zoneId: "deck",
      hostId: "table",
    });
    return (
      <>
        <button {...target.props}>Deck</button>
        <input type="radio" aria-label="Hand order" {...target.props} />
        <input type="number" aria-label="Count" />
      </>
    );
  }
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const render = async (current = source) =>
    act(async () =>
      root.render(
        <GameProvider source={current} onError={errors}>
          <App />
        </GameProvider>,
      ),
    );
  const focus = async () =>
    act(async () => {
      const button = host.querySelector("button")!;
      button.blur();
      button.focus();
    });
  const key = async () =>
    act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "s", cancelable: true }),
      );
    });
  await render();
  await focus();
  await key();
  expect(errors).toHaveBeenLastCalledWith(error);
  run = () => {};
  const radio = host.querySelector<HTMLInputElement>("input[type='radio']")!;
  await act(async () => radio.focus());
  const radioEvent = new KeyboardEvent("keydown", {
    key: "s",
    cancelable: true,
    bubbles: true,
  });
  await act(async () => {
    radio.dispatchEvent(radioEvent);
  });
  expect(radioEvent.defaultPrevented).toBe(true);
  const arrow = new KeyboardEvent("keydown", {
    key: "ArrowRight",
    cancelable: true,
    bubbles: true,
  });
  await act(async () => {
    radio.dispatchEvent(arrow);
  });
  expect(arrow.defaultPrevented).toBe(false);
  const number = host.querySelector<HTMLInputElement>("input[type='number']")!;
  await act(async () => number.focus());
  const numberEvent = new KeyboardEvent("keydown", {
    key: "s",
    cancelable: true,
    bubbles: true,
  });
  await act(async () => {
    number.dispatchEvent(numberEvent);
  });
  expect(numberEvent.defaultPrevented).toBe(false);
  let reject!: (cause: Error) => void;
  run = () =>
    new Promise<void>((_, fail) => {
      reject = fail;
    });
  for (const change of [
    "seat-return",
    "source-return",
    "seat",
    "source",
    "unmount",
  ] as const) {
    await focus();
    await key();
    if (change === "seat-return") {
      await act(async () => {
        source.emit({ ...localSnapshot(2), me: "bob" });
        source.emit(localSnapshot(3));
      });
    }
    if (change === "source-return") {
      await render(createSeatSource(localSnapshot()));
      await render(source);
    }
    if (change === "seat")
      await act(async () => source.emit({ ...localSnapshot(4), me: "bob" }));
    if (change === "source") await render(createSeatSource(localSnapshot()));
    if (change === "unmount") await act(async () => root.unmount());
    await act(async () => reject(error));
    expect(errors).toHaveBeenCalledOnce();
  }
  expect(source.submissions).toEqual([]);
  host.remove();
});

function localSnapshot(version = 1): SourceSnapshot {
  const initial = snapshot(version);
  return {
    ...initial,
    players: [...initial.players, { playerId: "bob", displayName: "Bob" }],
    frame: { ...initial.frame, availableInteractions: [] },
  };
}

function createSeatSource(initial: SourceSnapshot) {
  const sessionId = crypto.randomUUID();
  const submissions: SourceCommand[] = [];
  const lifecycle = createSourceLifecycle({
    followHostSeat: true,
    send(command) {
      submissions.push(command);
      throw new Error("Local shortcuts must not submit commands.");
    },
    recover() {},
    close() {},
  });
  function emit(value: SourceSnapshot) {
    lifecycle.session({ sessionId, players: value.players });
    lifecycle.frame({
      ...value.frame,
      basis: {
        sessionId,
        version: value.version,
        perspectivePlayerId: value.me,
        actionSetVersion: `shortcuts-${value.version}`,
      },
    });
  }
  emit(initial);
  return { ...lifecycle.source, emit, submissions };
}

import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createGameHook } from "./create-game-hook.js";
import { dragFeature } from "../headless/features/drag.js";
import { GESTURE_THRESHOLDS } from "../headless/gesture.js";
import { createTestSource } from "../testing/sources/test-source.js";
import type { InteractionDescriptor } from "../headless/model.js";
import type { SourceSnapshot } from "../headless/sources/types.js";

beforeAll(() => {
  GlobalRegistrator.register();
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());
const roots: Root[] = [];
afterEach(async () => {
  vi.useRealTimers();
  await act(async () => roots.splice(0).forEach((root) => root.unmount()));
  document.body.replaceChildren();
});

const discard: InteractionDescriptor = {
  interactionId: "discard",
  interactionKey: "play.discard",
  phaseName: "play",
  kind: "action",
  label: "Discard",
  availability: { status: "available" },
  commit: { mode: "autoWhenReady" },
  inputs: [
    {
      key: "card",
      kind: "card",
      domain: {
        type: "cardTarget",
        projection: "resolved",
        targetKind: "card",
        zoneIds: ["hand"],
        eligibleTargets: ["red", "blue"],
      },
    },
  ],
};
function snapshot(version = 1): SourceSnapshot {
  return {
    me: "alice",
    players: [{ playerId: "alice", displayName: "Alice" }],
    version,
    frame: {
      events: [],
      view: {},
      flow: {
        currentPhase: "play",
        activePlayers: ["alice"],
        simultaneousPhase: null,
      },
      availableInteractions: [discard],
      zones: {
        hand: {
          alice: {
            tiles: [],
            cardIds: ["red", "blue"],
            cardViewsById: {
              red: { id: "red", cardType: "ranked", properties: {} },
              blue: { id: "blue", cardType: "ranked", properties: {} },
            },
            cardBacksById: {},
            playableByCardId: { red: [discard], blue: [discard] },
          },
        },
      },
    },
  };
}

const { GameProvider, useGame, useCardGesture, useDropArea, useDragOverlay } =
  createGameHook()({
    features: (core, context) => ({ drag: dragFeature(core, context) }),
    debug: false,
  });
function Card({ id, draggable }: { id: string; draggable: boolean }) {
  const card = useGame((game) => game.cards.find(id));
  const gesture = useCardGesture(id, { drag: draggable ? {} : false });
  return card ? (
    <button
      {...card.getProps()}
      {...gesture.props}
      data-active={gesture.isActive || undefined}
      data-testid={id}
    >
      {id}
    </button>
  ) : null;
}
let areaRenders = 0;
function Discard() {
  areaRenders++;
  const area = useDropArea({ interaction: "play.discard" });
  return <div {...area.props} data-testid="discard" />;
}
function Overlay() {
  const overlay = useDragOverlay();
  return overlay ? (
    <div
      ref={overlay.ref}
      data-testid="overlay"
      data-card={overlay.cardId}
      data-settling={overlay.settling}
    />
  ) : null;
}
function Drafts() {
  return (
    <output data-testid="drafts">
      {JSON.stringify(useGame((g) => g.state.drafts))}
    </output>
  );
}

async function mount(draggable = true) {
  const source = createTestSource(snapshot());
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  roots.push(root);
  await act(async () =>
    root.render(
      <GameProvider source={source}>
        <Card id="red" draggable={draggable} />
        <Card id="blue" draggable={draggable} />
        <Discard />
        <Overlay />
        <Drafts />
      </GameProvider>,
    ),
  );
  const get = (id: string) =>
    document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  return { source, get };
}

type PointerInit = {
  pointerType: "mouse" | "touch" | "pen";
  x: number;
  y: number;
};
const pointer = (type: string, { pointerType, x, y }: PointerInit) =>
  new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    pointerType,
    button: 0,
    clientX: x,
    clientY: y,
  });
async function down(element: Element, init: PointerInit) {
  await act(async () => {
    element.dispatchEvent(pointer("pointerdown", init));
  });
}
async function move(init: PointerInit) {
  await act(async () => {
    window.dispatchEvent(pointer("pointermove", init));
  });
}
async function up(init: PointerInit) {
  await act(async () => {
    window.dispatchEvent(pointer("pointerup", init));
  });
}
async function click(element: Element) {
  await act(async () => {
    // A pointer-made click; keyboard activation reports detail 0.
    element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }),
    );
  });
}
/** Browser hit testing is not implemented by happy-dom. */
function hitTesting(hit: () => Element | null) {
  document.elementFromPoint = () => hit();
  document.elementsFromPoint = () => {
    const element = hit();
    return element ? [element] : [];
  };
}

test("a tap leaves selection to the card's own click", async () => {
  const { get } = await mount();
  const mouse = { pointerType: "mouse", x: 10, y: 10 } as const;
  await down(get("red")!, mouse);
  await up(mouse);
  await click(get("red")!);
  expect(get("drafts")!.textContent).toContain('"card":"red"');
});

test("holding a card inspects it and the following click does not select it", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const { get } = await mount();
  const touch = { pointerType: "touch", x: 10, y: 10 } as const;
  await down(get("red")!, touch);
  await act(async () => vi.advanceTimersByTime(GESTURE_THRESHOLDS.holdMs));
  expect(get("red")!.dataset.inspecting).toBe("hold");
  await up(touch);
  expect(get("red")!.dataset.inspecting).toBeUndefined();
  await click(get("red")!);
  expect(get("drafts")!.textContent).toBe("{}");
});

test("only the press's own click is swallowed; a new press or the keyboard still clicks", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const { get } = await mount();
  let clicks = 0;
  const other = document.createElement("button");
  other.addEventListener("click", () => clicks++);
  document.body.append(other);
  const touch = { pointerType: "touch", x: 10, y: 10 } as const;
  const hold = async () => {
    await down(get("red")!, touch);
    await act(async () => vi.advanceTimersByTime(GESTURE_THRESHOLDS.holdMs));
    await up(touch);
  };
  const clickOther = (detail: number) =>
    act(async () => {
      other.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, detail }),
      );
    });
  await hold();
  await clickOther(0);
  expect(clicks).toBe(1);
  await clickOther(1);
  expect(clicks).toBe(1);
  await clickOther(1);
  expect(clicks).toBe(2);
  await hold();
  await act(async () => {
    window.dispatchEvent(pointer("pointerdown", touch));
  });
  await clickOther(1);
  expect(clicks).toBe(3);
});

test("physical pointer focus survives motion-driven boundaries and Alt uses that same card", async () => {
  const { get, source } = await mount();
  let hit: Element | null = get("red");
  hitTesting(() => hit);
  const mouse = (x: number) => ({ pointerType: "mouse", x, y: 10 }) as const;
  const key = (type: string) =>
    act(async () =>
      window.dispatchEvent(
        new KeyboardEvent(type, { key: "Alt", altKey: type === "keydown" }),
      ),
    );
  await move(mouse(10));
  expect(get("red")!.dataset.active).toBe("true");
  expect(get("red")!.dataset.inspecting).toBeUndefined();
  // A neighbour moves under the parked mouse and sends boundary events.
  hit = get("blue");
  await act(async () => {
    get("red")!.dispatchEvent(
      new PointerEvent("pointerout", {
        bubbles: true,
        pointerType: "mouse",
        relatedTarget: get("blue"),
      }),
    );
    get("blue")!.dispatchEvent(pointer("pointerover", mouse(10)));
  });
  await move(mouse(10));
  await key("keydown");
  expect(get("red")!.dataset.inspecting).toBe("hover");
  expect(get("blue")!.dataset.active).toBeUndefined();
  await key("keyup");
  await move(mouse(11));
  expect(get("blue")!.dataset.active).toBe("true");
  await key("keydown");
  expect(get("blue")!.dataset.inspecting).toBe("hover");
  await act(async () => source.emit(snapshot(2)));
  expect(get("blue")!.dataset.inspecting).toBeUndefined();
  expect(get("blue")!.dataset.active).toBe("true");
  // Inspection ends on a frame, while admitted physical focus survives.
  await move(mouse(12));
  await key("keydown");
  expect(get("blue")!.dataset.inspecting).toBe("hover");
  hit = null;
  await move(mouse(13));
  expect(get("blue")!.dataset.inspecting).toBeUndefined();
  // happy-dom does not implement the browser's keyboard modality pseudo-class.
  const matches = get("red")!.matches.bind(get("red")!);
  vi.spyOn(get("red")!, "matches").mockImplementation(
    (selector) => selector === ":focus-visible" || matches(selector),
  );
  await act(async () => get("red")!.focus());
  await key("keydown");
  expect(get("red")!.dataset.inspecting).toBe("hover");
  expect(get("red")!.dataset.active).toBe("true");
  await act(async () => window.dispatchEvent(new Event("blur")));
  expect(get("red")!.dataset.active).toBeUndefined();
  expect(get("red")!.dataset.inspecting).toBeUndefined();
});

test("a removed card clears parked focus without a pointer movement", async () => {
  const { get, source } = await mount(false);
  hitTesting(() => get("red"));
  await move({ pointerType: "mouse", x: 10, y: 10 });
  expect(get("red")!.dataset.active).toBe("true");
  const current = snapshot(2);
  const hand = current.frame.zones.hand.alice;
  const removed: SourceSnapshot = {
    ...current,
    frame: {
      ...current.frame,
      zones: {
        hand: {
          alice: {
            ...hand,
            cardIds: ["blue"],
            cardViewsById: { blue: hand.cardViewsById.blue },
            playableByCardId: { blue: [discard] },
          },
        },
      },
    },
  };
  await act(async () => source.emit(removed));
  expect(get("red")).toBeNull();
  await act(async () =>
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Alt" })),
  );
  expect(get("blue")!.dataset.active).toBeUndefined();
  expect(get("blue")!.dataset.inspecting).toBeUndefined();
});

test("pointer down activates the actual pressed face after a parked-pointer animation", async () => {
  const { get } = await mount();
  hitTesting(() => get("red"));
  const mouse = { pointerType: "mouse", x: 10, y: 10 } as const;
  await move(mouse);
  await down(get("blue")!, mouse);
  expect(get("red")!.dataset.active).toBeUndefined();
  expect(get("blue")!.dataset.active).toBe("true");
  await up(mouse);
  await click(get("blue")!);
  expect(get("drafts")!.textContent).toContain('"card":"blue"');
});

test.each([false, true])(
  "a non-drag mouse browse uses its release surface for hover and Alt (drag enabled: %s)",
  async (draggable) => {
    const { get, source } = await mount(draggable);
    if (draggable) {
      const frame = snapshot(2);
      const hand = frame.frame.zones.hand.alice;
      await act(async () =>
        source.emit({
          ...frame,
          frame: {
            ...frame.frame,
            zones: {
              hand: {
                alice: {
                  ...hand,
                  playableByCardId: { red: [], blue: [discard] },
                },
              },
            },
          },
        }),
      );
    }
    let hit: Element | null = get("red");
    hitTesting(() => hit);
    const mouse = (x: number) => ({ pointerType: "mouse", x, y: 10 }) as const;
    await move(mouse(10));
    await down(get("red")!, mouse(10));
    hit = get("blue");
    await move(mouse(50));
    expect(get("overlay")).toBeNull();
    await up(mouse(50));
    expect(get("red")!.dataset.active).toBeUndefined();
    expect(get("blue")!.dataset.active).toBe("true");
    await act(async () =>
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Alt" })),
    );
    expect(get("blue")!.dataset.inspecting).toBe("hover");
    expect(get("red")!.dataset.inspecting).toBeUndefined();
    await click(get("red")!);
    expect(get("drafts")!.textContent).toBe("{}");
  },
);

test("a stationary mouse tap keeps its pressed card despite motion under the pointer", async () => {
  const { get } = await mount(false);
  let hit: Element | null = get("red");
  hitTesting(() => hit);
  const mouse = { pointerType: "mouse", x: 10, y: 10 } as const;
  await move(mouse);
  await down(get("red")!, mouse);
  hit = get("blue");
  await up(mouse);
  expect(get("red")!.dataset.active).toBe("true");
  expect(get("blue")!.dataset.active).toBeUndefined();
});

test("a card dragged onto an area runs its interaction and settles until the frame", async () => {
  const { get, source } = await mount();
  hitTesting(() => get("discard"));
  const at = (y: number) => ({ pointerType: "touch", x: 10, y }) as const;
  await down(get("red")!, at(200));
  await move(at(180));
  expect(get("red")!.dataset.dragging).toBe("true");
  expect(get("overlay")!.dataset.card).toBe("red");
  expect(get("overlay")!.style.position).toBe("fixed");
  expect(get("discard")!.dataset.dropTarget).toBe("true");
  expect(get("discard")!.dataset.dropOver).toBe("true");
  await move(at(40));
  // happy-dom lays the card out at the origin, so the grab offset is the press point.
  expect(get("overlay")!.style.top).toBe(`${40 - 200}px`);
  await up(at(40));
  expect(source.submissions).toEqual([
    expect.objectContaining({
      interactionId: "discard",
      params: { card: "red" },
    }),
  ]);
  // The overlay waits for the authoritative frame instead of snapping back.
  expect(get("overlay")!.dataset.settling).toBe("true");
  await act(async () => {
    source.submissions[0].resolve({ accepted: true });
    source.emit(snapshot(2));
  });
  expect(get("overlay")).toBeNull();
  expect(get("red")!.dataset.dragging).toBeUndefined();
});

test.each(["mouse", "pen", "touch"] as const)(
  "only touch uses coarse snapping: %s",
  async (pointerType) => {
    const { get, source } = await mount();
    hitTesting(() => null);
    vi.spyOn(get("discard")!, "getBoundingClientRect").mockReturnValue(
      new DOMRect(100, 100, 100, 100),
    );
    await down(get("red")!, { pointerType, x: 110, y: 250 });
    // 24 px is outside the precise band but inside the touch band.
    await move({ pointerType, x: 110, y: 76 });
    expect(get("discard")!.dataset.dropOver === "true").toBe(
      pointerType === "touch",
    );
    await up({ pointerType, x: 110, y: 76 });
    expect(source.submissions).toHaveLength(pointerType === "touch" ? 1 : 0);
  },
);

test("moving within one area does not render on every pointer move", async () => {
  const { get } = await mount();
  hitTesting(() => get("discard"));
  const at = (y: number) => ({ pointerType: "touch", x: 10, y }) as const;
  await down(get("red")!, at(200));
  await move(at(180));
  expect(get("discard")!.dataset.dropOver).toBe("true");
  const settled = areaRenders;
  for (let y = 170; y > 100; y -= 10) await move(at(y));
  expect(areaRenders).toBe(settled);
  expect(get("overlay")!.style.top).toBe(`${110 - 200}px`);
  await up(at(110));
});

test("a drop outside every area changes nothing", async () => {
  const { get, source } = await mount();
  hitTesting(() => null);
  const mouse = (x: number) => ({ pointerType: "mouse", x, y: 10 }) as const;
  await down(get("red")!, mouse(10));
  await move(mouse(60));
  expect(get("overlay")).not.toBeNull();
  await up(mouse(60));
  expect(get("overlay")).toBeNull();
  expect(source.submissions).toEqual([]);
  expect(get("drafts")!.textContent).toBe("{}");
});

test.each([0, 1500])(
  "a cancelled drag's click is not a tap after %i ms",
  async (delay) => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { get, source } = await mount();
    hitTesting(() => get("discard"));
    const at = (y: number) => ({ pointerType: "mouse", x: 10, y }) as const;
    await down(get("red")!, at(200));
    await move(at(150));
    await act(async () => source.emit(snapshot(2)));
    expect(get("overlay")).toBeNull();
    await act(async () => vi.advanceTimersByTime(delay));
    await up(at(40));
    await click(get("red")!);
    expect(source.submissions).toEqual([]);
    expect(get("drafts")!.textContent).toBe("{}");
  },
);

test.each([
  { x: 109, y: 200 },
  { x: 100, y: 209 },
])("browsing to $x,$y does not select on release", async ({ x, y }) => {
  const { get, source } = await mount();
  await down(get("red")!, { pointerType: "touch", x: 100, y: 200 });
  const moved = { pointerType: "touch", x, y } as const;
  await move(moved);
  expect(get("overlay")).toBeNull();
  await up(moved);
  // A short browse can still produce a native click without pointercancel.
  await click(get("red")!);
  expect(get("drafts")!.textContent).toBe("{}");
  expect(source.submissions).toEqual([]);
});

test("a sideways finger browses and never drags", async () => {
  const { get } = await mount();
  const at = (x: number) => ({ pointerType: "touch", x, y: 200 }) as const;
  await down(get("red")!, at(200));
  await move(at(150));
  expect(get("overlay")).toBeNull();
  expect(get("red")!.dataset.dragging).toBeUndefined();
  await act(async () => {
    window.dispatchEvent(pointer("pointercancel", at(150)));
  });
});

test("inspection-only controls never start a drag even when the card has routes", async () => {
  const { get } = await mount(false);
  expect(get("red")!.style.touchAction).toBe("manipulation");
  const mouse = { pointerType: "mouse", x: 10, y: 10 } as const;
  await down(get("red")!, mouse);
  await move({ ...mouse, x: 100 });
  expect(get("overlay")).toBeNull();
  expect(get("red")!.dataset.dragging).toBeUndefined();
  await up({ ...mouse, x: 100 });
  expect(get("drafts")!.textContent).toBe("{}");
});

test("inspection-only controls still inspect on hold and activate by keyboard", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const { get } = await mount(false);
  const touch = { pointerType: "touch", x: 10, y: 10 } as const;
  await down(get("red")!, touch);
  await act(async () => vi.advanceTimersByTime(GESTURE_THRESHOLDS.holdMs));
  expect(get("red")!.dataset.inspecting).toBe("hold");
  await up(touch);
  await act(async () =>
    get("red")!.dispatchEvent(
      new MouseEvent("click", { bubbles: true, detail: 0 }),
    ),
  );
  expect(get("drafts")!.textContent).toContain('"card":"red"');
});

test("the topmost opaque surface blocks hover and mouse modality never revives keyboard focus", async () => {
  const { get } = await mount();
  const red = get("red")!;
  const matches = red.matches.bind(red);
  vi.spyOn(red, "matches").mockImplementation(
    (selector) => selector === ":focus-visible" || matches(selector),
  );
  await act(async () => red.focus());
  expect(red.dataset.active).toBe("true");
  const cover = document.createElement("div");
  document.body.append(cover);
  document.elementFromPoint = () => cover;
  document.elementsFromPoint = () => [cover, red];
  await move({ pointerType: "mouse", x: 50, y: 50 });
  expect(red.dataset.active).toBeUndefined();
  hitTesting(() => null);
  await move({ pointerType: "mouse", x: 51, y: 50 });
  expect(red.dataset.active).toBeUndefined();
  cover.remove();
});
test("leaving the iframe clears card hover and Alt inspection", async () => {
  const { get } = await mount();
  hitTesting(() => get("red"));
  await move({ pointerType: "mouse", x: 60, y: 60 });
  await act(async () =>
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Alt", altKey: true }),
    ),
  );
  expect(get("red")!.dataset.inspecting).toBe("hover");
  await act(async () =>
    get("red")!.dispatchEvent(
      new PointerEvent("pointerout", {
        bubbles: true,
        pointerType: "mouse",
        relatedTarget: null,
      }),
    ),
  );
  expect(get("red")!.dataset.active).toBeUndefined();
  expect(get("red")!.dataset.inspecting).toBeUndefined();
});

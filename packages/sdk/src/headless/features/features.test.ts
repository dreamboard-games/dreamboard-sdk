import { describe, expect, it, vi } from "vitest";
import { createGameInstance, AmbiguousTargetError } from "../instance.js";
import type { InteractionDescriptor } from "../model.js";
import {
  createTestSource,
  type TestSource,
} from "../../testing/sources/test-source.js";
import type { SourceSnapshot } from "../sources/types.js";
import type {
  RuntimeBoardState,
  RuntimeHexBoardState,
} from "../../reducer/model/table.js";
import { createHexBoardGeometry } from "../../shared/hex-board.js";
import { handFeature } from "./hand.js";
import { boardFeature } from "./board.js";
import { dragFeature } from "./drag.js";
import { panZoomFeature } from "./pan-zoom.js";
import type { PointerInput } from "./pointer-session.js";

function hexBoard(id = "island", playerId?: string): RuntimeHexBoardState {
  const spaces = [{ id: "center", q: 0, r: 0 }];
  const geometry = createHexBoardGeometry({ id: "island", spaces });
  return {
    id,
    baseId: "island",
    layout: "hex",
    scope: playerId ? "perPlayer" : "shared",
    playerId,
    orientation: "pointy",
    fields: {},
    spaces: Object.fromEntries(
      spaces.map((space) => [space.id, { ...space, fields: {} }]),
    ),
    edges: geometry.edges.map((edge) => ({ ...edge, fields: {} })),
    vertices: geometry.vertices.map((vertex) => ({ ...vertex, fields: {} })),
    relations: [],
    containers: {},
  };
}
function descriptor(): InteractionDescriptor {
  return {
    interactionId: "move",
    interactionKey: "play.move",
    phaseName: "play",
    kind: "action",
    label: "Move",
    availability: { status: "available" },
    commit: { mode: "manual" },
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
      {
        key: "space",
        kind: "board-space",
        domain: {
          type: "boardTarget",
          projection: "resolved",
          targetKind: "space",
          boardId: "island",
          eligibleTargets: ["center"],
        },
      },
    ],
  };
}
function source(board: RuntimeBoardState = hexBoard()) {
  const action = descriptor();
  return createTestSource({
    me: "alice",
    players: [{ playerId: "alice", displayName: "Alice" }],
    version: 1,
    frame: {
      events: [],
      view: {
        boards: {
          byId: { [board.id]: JSON.parse(JSON.stringify(board)) },
          hex: {},
          square: {},
        },
      },
      flow: {
        currentPhase: "play",

        activePlayers: ["alice"],
        simultaneousPhase: null,
      },
      availableInteractions: [action],
      zones: {
        hand: {
          cardIds: ["red", "blue", "hidden"],
          cardViewsById: {
            red: JSON.stringify({ rank: 2 }),
            blue: JSON.stringify({ rank: 1 }),
          },
          playableByCardId: { red: [action], blue: [action] },
        },
      },
    },
  });
}
function emitFrame(source: TestSource, frame: SourceSnapshot["frame"]) {
  const snapshot = source.store.get().snapshot!;
  source.emit({ ...snapshot, version: snapshot.version + 1, frame });
}
function setup(board?: RuntimeBoardState) {
  const input = source(board);
  const game = createGameInstance()({
    source: input,
    features: (core, context) => ({
      hand: handFeature(core, {
        sort: (a, b) =>
          Number(a.view?.rank ?? Infinity) - Number(b.view?.rank ?? Infinity),
      }),
      board: boardFeature(core, context),
      drag: dragFeature(core, context),
      viewport: panZoomFeature(core, context, { maxScale: 2 }),
    }),
  });
  return { game, input };
}
function pointer() {
  const captured = new Set<number>();
  const surface = {
    setPointerCapture: vi.fn((id: number) => {
      captured.add(id);
    }),
    hasPointerCapture: (id: number) => captured.has(id),
    releasePointerCapture: vi.fn((id: number) => {
      captured.delete(id);
    }),
    getBoundingClientRect: () => ({ left: 0, top: 0, height: 300 }),
  };
  return {
    surface,
    captured,
    event: (value: Partial<PointerInput> = {}): PointerInput => ({
      pointerId: 1,
      button: 0,
      clientX: 10,
      clientY: 20,
      currentTarget: surface,
      preventDefault: vi.fn(),
      ...value,
    }),
  };
}

describe("headless features", () => {
  it("sorts projected hands without mutating zone order or exposing hidden data", () => {
    const { game } = setup();
    const hand = game.zones.get("hand")!;
    expect(hand.getSortedCardIds()).toEqual(["blue", "red", "hidden"]);
    expect(hand.getCards().map((card) => card.id)).toEqual([
      "red",
      "blue",
      "hidden",
    ]);
    expect(hand.getSelectableCardIds()).toEqual(["red", "blue"]);
    expect(hand.getCards()[2]!.view).toBeNull();
    game.cards.get("red")!.select();
    expect(game.zones.get("hand")!.getSelectedCardIds()).toEqual(["red"]);
    expect(hand.getSelectedCardIds()).toEqual([]);
    game.dispose();
  });

  it("keeps hex boundary identities and round-trips origin plus viewport coordinates", () => {
    const { game } = setup(hexBoard("island:alice", "alice"));
    const board = game.boards.get("island:alice")!;
    expect(board.game).toBe(game);
    const layout = board.getLayout({
      hexSize: 24,
      origin: { x: 31, y: -9 },
      viewport: { x: 70, y: 20, scale: 1.5 },
    });
    expect(layout.viewBox).toEqual(
      board.getLayout({ hexSize: 24, origin: { x: 31, y: -9 } }).viewBox,
    );
    expect(layout.getEdges()).toHaveLength(6);
    expect(layout.getVertices()).toHaveLength(6);
    expect(
      layout.getEdges().every((edge) => edge.id.startsWith("island:edge:")),
    ).toBe(true);
    const cell = layout.getSpaces()[0]!;
    expect(layout.pointToSpace(cell.center.x, cell.center.y)).toBe("center");
    expect(layout.pointToSpace(9999, 9999)).toBeUndefined();
    expect(cell.getIsSelectable()).toBe(true);
    cell.getSelectHandler()();
    expect(game.state.drafts["play.move"]).toMatchObject({ space: "center" });
    expect(cell.getIsSelected()).toBe(false);
    expect(
      game.boards
        .get("island:alice")!
        .getLayout({ hexSize: 24 })
        .getSpaces()[0]!
        .getIsSelected(),
    ).toBe(true);
    game.dispose();
  });

  it("freezes captured layout geometry without retaining mutable option objects", () => {
    const { game } = setup();
    const origin = { x: 12, y: 9 };
    const viewport = { x: 4, y: 7, scale: 2 };
    const layout = game.boards
      .get("island")!
      .getLayout({ hexSize: 12, origin, viewport });
    const cell = layout.getSpaces()[0]!;
    const points = cell.points();
    for (const value of [
      layout,
      layout.viewBox,
      layout.getSpaces(),
      layout.getEdges(),
      layout.getVertices(),
      ...layout.getSpaces(),
      ...layout.getEdges(),
      ...layout.getVertices(),
      cell.center,
      points,
      ...points,
      ...layout
        .getEdges()
        .flatMap((edge) => [edge.center, edge.line, ...edge.line]),
      ...layout.getVertices().map((vertex) => vertex.center),
    ]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
    expect(Reflect.set(cell.center, "x", 999)).toBe(false);
    expect(Reflect.set(layout.viewBox, "width", 999)).toBe(false);
    expect(Reflect.set(layout.getSpaces(), "0", null)).toBe(false);
    origin.x = 999;
    viewport.scale = 99;
    expect(cell.points()).toBe(points);
    expect(layout.pointToSpace(cell.center.x, cell.center.y)).toBe("center");
    expect(Object.isFrozen(origin)).toBe(false);
    expect(Object.isFrozen(viewport)).toBe(false);
    game.dispose();
  });

  it("keeps old board getters captured while handlers resolve current eligibility", () => {
    const { game, input } = setup();
    const emit = (eligibleTargets: string[]) =>
      emitFrame(input, {
        ...input.store.get().snapshot!.frame,
        availableInteractions: [
          {
            ...descriptor(),
            inputs: descriptor().inputs.map((value) =>
              value.key === "space"
                ? { ...value, domain: { ...value.domain, eligibleTargets } }
                : value,
            ),
          },
        ],
      });
    emit([]);
    const cell = game.boards
      .get("island")!
      .getLayout({ hexSize: 12 })
      .getSpaces()[0]!;
    const props = cell.getTargetProps();
    expect(props.disabled).toBe(true);
    emit(["center"]);
    props.onClick();
    expect(game.state.drafts["play.move"]?.space).toBe("center");
    expect(cell.getIsEligible()).toBe(false);
    expect(cell.getIsSelected()).toBe(false);
    emit([]);
    cell.getSelectHandler()();
    expect(game.state.drafts["play.move"]?.space).toBeUndefined();
    game.dispose();
  });

  it("supports authored square incidence and reports generic layout limits", () => {
    const square: RuntimeBoardState = {
      id: "square",
      scope: "shared",
      fields: {},
      layout: "square",
      spaces: {
        a: { id: "a", row: 0, col: 0, fields: {} },
        b: { id: "b", row: 0, col: 1, fields: {} },
      },
      relations: [],
      containers: {},
      edges: [
        { id: "authored-edge", spaceIds: ["a", "b"], fields: {} },
        { id: "unlocated-boundary", spaceIds: ["a"], fields: {} },
      ],
      vertices: [],
    };
    const { game } = setup(square);
    const layout = game.boards
      .get("square")!
      .getLayout({ hexSize: 10, viewport: { x: 5, y: 3, scale: 2 } });
    expect(layout.getEdges().map((edge) => edge.id)).toEqual(["authored-edge"]);
    expect(game.boards.get("square")!.data).toMatchObject({
      edges: expect.arrayContaining([
        { id: "unlocated-boundary", spaceIds: ["a"], fields: {} },
      ]),
    });
    for (const cell of layout.getSpaces())
      expect(layout.pointToSpace(cell.center.x, cell.center.y)).toBe(cell.id);
    game.dispose();
    const generic = setup({
      id: "generic",
      layout: "generic",
      scope: "shared",
      fields: {},
      spaces: {},
      relations: [],
      containers: {},
    });
    expect(generic.game.boards.get("generic")!.data).toMatchObject({
      id: "generic",
    });
    expect(() =>
      generic.game.boards.get("generic")!.getLayout({ hexSize: 10 }),
    ).toThrow("no spatial geometry");
    generic.game.dispose();
  });

  it("pans and zooms immutable viewport branches and releases capture on disposal", () => {
    const { game } = setup();
    const initial = game.getSnapshot().viewport;
    const p = pointer();
    const props = initial.getProps();
    props.onPointerDown(p.event());
    props.onPointerMove(p.event({ clientX: 20, clientY: 35 }));
    expect(game.viewport.getTransform()).toEqual({ x: 10, y: 15, scale: 1 });
    expect(initial.getTransform()).toEqual({ x: 0, y: 0, scale: 1 });
    props.onPointerUp(p.event({ clientX: 20, clientY: 35 }));
    props.onWheel({
      clientX: 100,
      clientY: 100,
      deltaY: -1000,
      deltaMode: 0,
      currentTarget: p.surface,
      preventDefault: vi.fn(),
    });
    expect(game.viewport.getTransform()).toEqual({ x: -80, y: -70, scale: 2 });
    props.onPointerDown(p.event());
    game.dispose();
    expect(p.captured.size).toBe(0);
    props.onPointerDown(p.event());
    expect(p.captured.size).toBe(0);
  });

  it("routes a card drop atomically, suppresses synthetic clicks, and retains keyboard selection", () => {
    const { game } = setup();
    const p = pointer();
    const props = game.cards.get("red")!.getDragProps();
    props.onPointerDown(p.event());
    expect(game.state.drafts).toEqual({});
    const [target] = game.drag.getDropTargets();
    expect(target).toMatchObject({ id: "center", boardId: "island" });
    game.drag.setDropTarget(target!);
    props.onPointerMove(p.event({ clientX: 30 }));
    expect(game.drag.active?.offset).toEqual({ x: 20, y: 0 });
    props.onPointerUp(p.event({ clientX: 30 }));
    expect(game.state.drafts["play.move"]).toEqual({
      card: "red",
      space: "center",
    });
    expect(p.captured.size).toBe(0);
    const after = game.state.drafts;
    props.onClick({ detail: 1, preventDefault: vi.fn() });
    expect(game.state.drafts).toBe(after);
    game.cards
      .get("blue")!
      .getDragProps()
      .onClick({ detail: 0, preventDefault: vi.fn() });
    expect(game.state.drafts["play.move"]?.card).toBe("blue");
    game.dispose();
  });

  it("cancels both captures on source replacement, without disabling future gestures", () => {
    const { game } = setup();
    const cardPointer = pointer();
    const viewportPointer = pointer();
    game.cards.get("red")!.getDragProps().onPointerDown(cardPointer.event());
    game.viewport.getProps().onPointerDown(viewportPointer.event());
    const second = source();
    game.setOptions({ source: second });
    expect(cardPointer.captured.size).toBe(0);
    expect(viewportPointer.captured.size).toBe(0);
    expect(game.drag.active).toBeNull();
    game.cards.get("red")!.getDragProps().onPointerDown(cardPointer.event());
    expect(cardPointer.captured.size).toBe(1);
    game.dispose();
    expect(cardPointer.captured.size).toBe(0);
  });
  it("uses per-card narrowed drop domains and captures old target lists", () => {
    const { game, input } = setup();
    const narrow = (ids: string[]): InteractionDescriptor => ({
      ...descriptor(),
      inputs: descriptor().inputs.map((value) =>
        value.key === "space"
          ? { ...value, domain: { ...value.domain, eligibleTargets: ids } }
          : value,
      ),
    });
    const broad = narrow(["center", "other"]);
    const emit = (ids: string[]) =>
      emitFrame(input, {
        ...input.store.get().snapshot!.frame,
        availableInteractions: [broad],
        zones: {
          hand: {
            ...input.store.get().snapshot!.frame.zones.hand!,
            playableByCardId: { red: [narrow(ids)] },
          },
        },
      });
    emit(["center"]);
    const p = pointer();
    game.cards.get("red")!.getDragProps().onPointerDown(p.event());
    const old = game.getSnapshot().drag;
    expect(old.getDropTargets().map((target) => target.id)).toEqual(["center"]);
    emit(["other"]);
    expect(game.drag.getDropTargets().map((target) => target.id)).toEqual([
      "other",
    ]);
    expect(old.getDropTargets().map((target) => target.id)).toEqual(["center"]);
    game.dispose();
  });

  it("rejects ambiguous space/tile routing and respects explicit disabled choices", () => {
    const { game, input } = setup();
    const alternate: InteractionDescriptor = {
      ...descriptor(),
      interactionId: "alternate",
      interactionKey: "play.alternate",
      inputs: descriptor().inputs.map((value) =>
        value.key === "space"
          ? { ...value, domain: { ...value.domain, targetKind: "tile" } }
          : value,
      ),
    };
    emitFrame(input, {
      ...input.store.get().snapshot!.frame,
      availableInteractions: [descriptor(), alternate],
    });
    const cell = game.boards
      .get("island")!
      .getLayout({ hexSize: 10 })
      .getSpaces()[0]!;
    expect(() => cell.getSelectHandler()()).toThrow(AmbiguousTargetError);
    expect(cell.getTargetProps({ interaction: "play.missing" }).disabled).toBe(
      true,
    );
    cell.getSelectHandler({ interaction: "play.move" })();
    expect(game.state.drafts["play.move"]?.space).toBe("center");
    expect(cell.getTargetProps({ interaction: "play.move" })).toMatchObject({
      "data-interaction": "play.move",
      "data-input": "space",
    });
    game.dispose();
  });

  it("does not install feature APIs when disabled", () => {
    const game = createGameInstance()({ source: source() });
    expect(game).not.toHaveProperty("boards");
    expect(game).not.toHaveProperty("drag");
    expect(game).not.toHaveProperty("viewport");
    expect(game.cards.get("red")).not.toHaveProperty("getDragProps");
    expect(game.zones.get("hand")).not.toHaveProperty("getSelectedCardIds");
    game.dispose();
  });
  it("does not select after an invalid drag, but keeps a stationary tap", () => {
    const { game } = setup();
    const p = pointer();
    const props = game.cards.get("red")!.getDragProps();
    props.onPointerDown(p.event());
    props.onPointerMove(p.event({ clientX: 90 }));
    props.onPointerUp(p.event({ clientX: 90 }));
    props.onClick({ detail: 1, preventDefault: vi.fn() });
    expect(game.state.drafts).toEqual({});
    const fresh = game.cards.get("red")!.getDragProps();
    fresh.onPointerDown(p.event());
    fresh.onPointerUp(p.event({ clientX: 12 }));
    expect(game.state.drafts["play.move"]?.card).toBe("red");
    game.dispose();
  });
  it("never routes a per-player board target for a different seat", () => {
    const { game } = setup(hexBoard("island:bob", "bob"));
    const cell = game.boards
      .get("island:bob")!
      .getLayout({ hexSize: 10 })
      .getSpaces()[0]!;
    expect(cell.getIsSelectable()).toBe(false);
    expect(cell.getTargetProps().disabled).toBe(true);
    cell.getSelectHandler()();
    expect(game.state.drafts).toEqual({});
    game.dispose();
  });
});

import { RuntimeJsonSchema } from "../../shared/runtime-json.js";
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
import { createHexTopology } from "../../shared/hex-board.js";
import { handFeature } from "./hand.js";
import { boardFeature } from "./board.js";
import { dragFeature } from "./drag.js";
import { panZoomFeature } from "./pan-zoom.js";
import type { PointerInput } from "./pointer-session.js";
import type { BoardDropTarget, DropTarget } from "../targets.js";

/** This fixture's interactions have board inputs, so every target is on the board. */
function onBoard(targets: readonly DropTarget<unknown>[]) {
  return targets.filter(
    (target): target is BoardDropTarget<unknown> =>
      target.kind !== "interaction",
  );
}

function hexBoard(id = "island", playerId?: string): RuntimeHexBoardState {
  const spaces = [{ id: "center", q: 0, r: 0 }];
  const geometry = createHexTopology({ id: "island", spaces });
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
          valueKind: "board-id",
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
  let action = descriptor();
  if (board.scope === "perPlayer") {
    action = {
      ...action,
      inputs: action.inputs.map((input) =>
        input.key === "space"
          ? {
              ...input,
              domain: {
                type: "boardTarget",
                projection: "resolved",
                targetKind: "space",
                boardId: "island",
                valueKind: "player-board-space",
                eligibleTargets: [
                  { boardId: "island", playerId: "alice", spaceId: "center" },
                ],
              },
            }
          : input,
      ),
    };
  }
  return createTestSource({
    me: "alice",
    players: [{ playerId: "alice", displayName: "Alice" }],
    version: 1,
    frame: {
      events: [],
      view: {
        boards: {
          byId: {
            [board.id]: RuntimeJsonSchema.parse(
              JSON.parse(JSON.stringify(board)),
            ),
          },
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
          alice: {
            cardIds: ["red", "blue", "hidden"],
            cardViewsById: {
              red: {
                id: "red",
                cardType: "ranked",
                properties: { rank: 2 },
              },
              blue: {
                id: "blue",
                cardType: "ranked",
                properties: { rank: 1 },
              },
            },
            cardBacksById: {},
            playableByCardId: { red: [action], blue: [action] },
          },
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
          Number(a.view?.properties.rank ?? Infinity) -
          Number(b.view?.properties.rank ?? Infinity),
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
    const hand = game.zones.get("hand", "alice");
    expect(hand.getSortedCardIds()).toEqual(["blue", "red", "hidden"]);
    expect(hand.getCards().map((card) => card.id)).toEqual([
      "red",
      "blue",
      "hidden",
    ]);
    expect(hand.getSelectableCardIds()).toEqual(["red", "blue"]);
    expect(hand.getCards()[2].view).toBeNull();
    game.cards.get("red").select();
    expect(game.zones.get("hand", "alice").getSelectedCardIds()).toEqual([
      "red",
    ]);
    expect(hand.getSelectedCardIds()).toEqual([]);
    game.dispose();
  });

  it("keeps hex boundary identities and round-trips origin plus viewport coordinates", () => {
    const { game } = setup(hexBoard("island:alice", "alice"));
    const board = game.boards.get("island:alice");
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
    const cell = layout.getSpaces()[0];
    expect(layout.pointToSpace(cell.center.x, cell.center.y)).toBe("center");
    expect(layout.pointToSpace(9999, 9999)).toBeUndefined();
    expect(cell.getIsSelectable()).toBe(true);
    cell.getSelectHandler()();
    expect(game.state.drafts["play.move"]).toMatchObject({
      space: { boardId: "island", playerId: "alice", spaceId: "center" },
    });
    expect(cell.getIsSelected()).toBe(false);
    expect(
      game.boards
        .get("island:alice")
        .getLayout({ hexSize: 24 })
        .getSpaces()[0]
        .getIsSelected(),
    ).toBe(true);
    game.dispose();
  });

  it("freezes captured layout geometry without retaining mutable option objects", () => {
    const { game } = setup();
    const origin = { x: 12, y: 9 };
    const viewport = { x: 4, y: 7, scale: 2 };
    const layout = game.boards
      .get("island")
      .getLayout({ hexSize: 12, origin, viewport });
    const cell = layout.getSpaces()[0];
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
              value.key === "space" &&
              value.domain.type === "boardTarget" &&
              value.domain.valueKind === "board-id"
                ? { ...value, domain: { ...value.domain, eligibleTargets } }
                : value,
            ),
          },
        ],
      });
    emit([]);
    const cell = game.boards
      .get("island")
      .getLayout({ hexSize: 12 })
      .getSpaces()[0];
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
      .get("square")
      .getLayout({ hexSize: 10, viewport: { x: 5, y: 3, scale: 2 } });
    expect(layout.getEdges().map((edge) => edge.id)).toEqual(["authored-edge"]);
    expect(game.boards.get("square").data).toHaveProperty(
      "edges",
      expect.arrayContaining([
        { id: "unlocated-boundary", spaceIds: ["a"], fields: {} },
      ]),
    );
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
    expect(generic.game.boards.get("generic").data).toMatchObject({
      id: "generic",
    });
    expect(() =>
      generic.game.boards.get("generic").getLayout({ hexSize: 10 }),
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

  it("routes a card drop atomically and leaves ordinary selection independent", () => {
    const { game } = setup();
    expect(game.drag.begin("red")).toBe(true);
    expect(game.state.drafts).toEqual({});
    // An interaction with a board input lands only on the board.
    expect(onBoard(game.drag.getDropTargets())).toEqual(
      game.drag.getDropTargets(),
    );
    const [target] = game.drag.getDropTargets();
    expect(target).toMatchObject({
      value: "center",
      boardId: "island",
      interactionKey: "play.move",
      cardInputKey: "card",
      inputKey: "space",
    });
    game.drag.setDropTarget(target);
    game.drag.drop();
    expect(game.state.drafts["play.move"]).toEqual({
      card: "red",
      space: "center",
    });
    expect(game.drag.active).toBeNull();
    game.cards.get("blue").select();
    expect(game.state.drafts["play.move"]?.card).toBe("blue");
    game.dispose();
  });

  it("cancels drag and viewport on source replacement without disabling future gestures", () => {
    const { game } = setup();
    const viewportPointer = pointer();
    game.drag.begin("red");
    game.viewport.getProps().onPointerDown(viewportPointer.event());
    game.setOptions({ source: source() });
    expect(viewportPointer.captured.size).toBe(0);
    expect(game.drag.active).toBeNull();
    expect(game.drag.begin("red")).toBe(true);
    const retained = game.drag;
    game.dispose();
    expect(retained.begin("red")).toBe(false);
  });
  it("uses per-card narrowed drop domains and captures old target lists", () => {
    const { game, input } = setup();
    const narrow = (ids: string[]): InteractionDescriptor => ({
      ...descriptor(),
      inputs: descriptor().inputs.map((value) =>
        value.key === "space" &&
        value.domain.type === "boardTarget" &&
        value.domain.valueKind === "board-id"
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
            alice: {
              ...input.store.get().snapshot!.frame.zones.hand.alice,
              playableByCardId: { red: [narrow(ids)] },
            },
          },
        },
      });
    emit(["center"]);
    game.drag.begin("red");
    const old = game.getSnapshot().drag;
    expect(onBoard(old.getDropTargets()).map((target) => target.value)).toEqual(
      ["center"],
    );
    emit(["other"]);
    expect(game.drag.active).toBeNull();
    game.drag.begin("red");
    expect(
      onBoard(game.drag.getDropTargets()).map((target) => target.value),
    ).toEqual(["other"]);
    expect(onBoard(old.getDropTargets()).map((target) => target.value)).toEqual(
      ["center"],
    );
    game.dispose();
  });

  it("rejects ambiguous space/tile routing and respects explicit disabled choices", () => {
    const { game, input } = setup();
    const alternate: InteractionDescriptor = {
      ...descriptor(),
      interactionId: "alternate",
      interactionKey: "play.alternate",
      inputs: descriptor().inputs.map((value) =>
        value.key === "space" &&
        value.domain.type === "boardTarget" &&
        value.domain.valueKind === "board-id"
          ? { ...value, domain: { ...value.domain, targetKind: "tile" } }
          : value,
      ),
    };
    emitFrame(input, {
      ...input.store.get().snapshot!.frame,
      availableInteractions: [descriptor(), alternate],
    });
    const cell = game.boards
      .get("island")
      .getLayout({ hexSize: 10 })
      .getSpaces()[0];
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
    expect(game.zones.get("hand", "alice")).not.toHaveProperty(
      "getSelectedCardIds",
    );
    game.dispose();
  });
  it("leaves drafts untouched on cancellation or a drop without a destination", () => {
    const { game } = setup();
    game.drag.begin("red");
    game.drag.drop();
    expect(game.state.drafts).toEqual({});
    game.drag.begin("red");
    game.drag.setDropTarget(game.drag.getDropTargets()[0]);
    game.drag.cancel();
    game.drag.drop();
    expect(game.state.drafts).toEqual({});
    game.drag.begin("red");
    const [target] = onBoard(game.drag.getDropTargets());
    game.drag.setDropTarget(target);
    game.drag.setDropTarget({ ...target, inputKey: "missing" });
    expect(game.drag.active?.target).toBeNull();
    game.drag.drop();
    expect(game.state.drafts).toEqual({});
    game.dispose();
  });
  it("does not route a per-player target absent from its projected domain", () => {
    const { game } = setup(hexBoard("island:bob", "bob"));
    const cell = game.boards
      .get("island:bob")
      .getLayout({ hexSize: 10 })
      .getSpaces()[0];
    expect(cell.getIsSelectable()).toBe(false);
    expect(cell.getTargetProps().disabled).toBe(true);
    cell.getSelectHandler()();
    expect(game.state.drafts).toEqual({});
    game.dispose();
  });
});

it("reports missing boards and distinguishes card membership from identity", () => {
  const game = createGameInstance()({
    source: source(),
    debug: false,
    features: (game, context) => ({ board: boardFeature(game, context) }),
  });
  expect(() => game.boards.get("missing")).toThrow('Board "missing"');
  expect(game.boards.find("missing")).toBeUndefined();
  const hand = game.zones.get("hand", "alice");
  expect(game.cards.get("red")).toBe(hand.getCard("red"));
  expect(hand.findCard("missing")).toBeUndefined();
  expect(() => hand.getCard("missing")).toThrow('Card in zone hand "missing"');
  game.dispose();
});

it("retains both input keys when one interaction has multiple card and board inputs", () => {
  const { game, input } = setup();
  const original = descriptor();
  const multi = {
    ...original,
    inputs: [
      ...original.inputs,
      { ...original.inputs[0], key: "secondCard" },
      { ...original.inputs[1], key: "secondSpace" },
    ],
  };
  const frame = input.store.get().snapshot!.frame;
  emitFrame(input, {
    ...frame,
    availableInteractions: [multi],
    zones: {
      hand: {
        alice: {
          ...frame.zones.hand.alice,
          playableByCardId: { red: [multi], blue: [multi] },
        },
      },
    },
  });
  expect(() =>
    game.cards.get("red").select({ interaction: "play.move" }),
  ).toThrow(AmbiguousTargetError);
  game.cards
    .get("red")
    .select({ interaction: "play.move", input: "secondCard" });
  expect(game.state.drafts["play.move"]).toEqual({ secondCard: "red" });
  game.interactions.get("play.move").reset();
  game.drag.begin("red", { interaction: "play.move", input: "secondCard" });
  const targets = onBoard(game.drag.getDropTargets());
  expect(
    targets.map(({ cardInputKey, inputKey }) => [cardInputKey, inputKey]),
  ).toEqual([
    ["secondCard", "space"],
    ["secondCard", "secondSpace"],
  ]);
  game.drag.setDropTarget(targets[1]);
  game.drag.drop();
  expect(game.state.drafts["play.move"]).toEqual({
    secondCard: "red",
    secondSpace: "center",
  });
  game.interactions.get("play.move").reset();
  game.boards
    .get("island")
    .getLayout({ hexSize: 20 })
    .getSpaces()[0]
    .getSelectHandler({ interaction: "play.move", input: "secondSpace" })();
  expect(game.state.drafts["play.move"]).toEqual({ secondSpace: "center" });
  game.dispose();
});

it("shares semantic space handlers with geometry and captures immutable selection", () => {
  const { game } = setup();
  const board = game.boards.get("island");
  const space = board.spaces.get("center");
  expect(board.spaces).toBe(board.spaces);
  expect(board.spaces.getAll()).toEqual([space]);
  expect(space.board).toBe(board);
  const spatial = board.getLayout({ hexSize: 20 }).getSpaces()[0];
  expect(spatial.getSelectHandler).toBe(space.getSelectHandler);
  expect(spatial.getTargetProps).toBe(space.getTargetProps);
  space.getSelectHandler({ interaction: "play.move" })();
  expect(game.state.drafts["play.move"]).toEqual({ space: "center" });
  expect(space.getIsSelected()).toBe(false);
  expect(game.boards.get("island").spaces.get("center").getIsSelected()).toBe(
    true,
  );
  expect(board.spaces.find("missing")).toBeUndefined();
  expect(() => board.spaces.get("missing")).toThrow(
    'Space on board island "missing"',
  );
  game.dispose();
});

it.each(["shared", "perPlayer"] as const)(
  "selects generic %s spaces without constructing geometry",
  (scope) => {
    const board: RuntimeBoardState = {
      id: scope === "shared" ? "island" : "island:alice",
      baseId: "island",
      playerId: scope === "perPlayer" ? "alice" : null,
      scope,
      layout: "generic",
      fields: {},
      spaces: { center: { id: "center", fields: { score: 2 } } },
      containers: {},
      relations: [],
    };
    const { game } = setup(board);
    const space = game.boards.get(board.id).spaces.get("center");
    expect(space.getIsEligible()).toBe(true);
    expect(space.data.fields).toEqual({ score: 2 });
    space.getSelectHandler({ interaction: "play.move" })();
    expect(game.state.drafts["play.move"]).toEqual({
      space:
        scope === "shared"
          ? "center"
          : {
              boardId: "island",
              playerId: "alice",
              spaceId: "center",
            },
    });
    const stale = space.getSelectHandler({ interaction: "play.move" });
    game.setOptions({ source: source(board) });
    stale();
    expect(game.state.drafts["play.move"]).toBeUndefined();
    game.dispose();
  },
);

it.each(["frame", "seat", "recovering"] as const)(
  "cancels a pending drop on %s changes",
  (change) => {
    const { game, input } = setup();
    game.drag.begin("red");
    game.drag.setDropTarget(game.drag.getDropTargets()[0]);
    if (change === "recovering") input.recovering();
    else {
      const current = input.store.get().snapshot!;
      input.emit({
        ...current,
        version: current.version + 1,
        me: change === "seat" ? "bob" : current.me,
      });
    }
    expect(game.drag.active).toBeNull();
    game.drag.drop();
    expect(game.state.drafts).toEqual({});
    game.dispose();
  },
);

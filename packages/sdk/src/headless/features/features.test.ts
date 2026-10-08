import { createSquareBoardLayout } from "../../shared/square-board-layout.js";
import { parseBoardElementId } from "../../shared/domain/board-element.js";
import { perPlayerInstanceId } from "../../shared/domain/per-player-instance.js";
import { RuntimeJsonSchema } from "../../shared/runtime-json.js";
import { describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import { createStore } from "@tanstack/store";
import type { SourceState } from "../sources/types.js";
import { createGameInstance, AmbiguousTargetError } from "../instance.js";
import type { InteractionDescriptor } from "../model.js";
import {
  createTestSource,
  type TestSource,
} from "../../testing/sources/test-source.js";
import type { SourceSnapshot } from "../sources/types.js";
import type {
  BoardTopology,
  HexBoardTopology,
} from "../../shared/board-topology.js";
import { tileSpaceId } from "../../shared/domain/tile-space.js";
import {
  SeatSpaceRefSchema,
  SeatTileRefSchema,
} from "../../shared/domain/seat-reference.js";
import { SeatBoardTopologySchema } from "../../shared/seat-topology-schema.js";
import { deriveBoardTopology } from "../../shared/board-topology.js";
import { createHexTopology } from "../../shared/hex-board.js";
import { handFeature, type HandController, type HandOptions } from "./hand.js";
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

const CENTER = SeatSpaceRefSchema.parse(`space-ref:sha256:${"0".repeat(64)}`);

function hexBoard(id = "island", playerId?: string): HexBoardTopology {
  const spaces = [
    {
      id: tileSpaceId("cell", "center"),
      tileId: "cell",
      localCellId: "center",
      q: 0,
      r: 0,
    },
  ];
  const geometry = createHexTopology({ id, spaces });
  return {
    id,
    baseId: "island",
    name: "Island",
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
          eligibleTargets: [CENTER],
        },
      },
    ],
  };
}
function source(authoritative: BoardTopology = hexBoard()) {
  const tileRef = SeatTileRefSchema.parse(`tile-ref:sha256:${"1".repeat(64)}`);
  const refs = new Map(
    Object.values(authoritative.spaces).map((space, index) => [
      space.id,
      SeatSpaceRefSchema.parse(
        `space-ref:sha256:${index.toString(16).padStart(64, "0")}`,
      ),
    ]),
  );
  const board = SeatBoardTopologySchema.parse(
    authoritative.layout === "generic"
      ? authoritative
      : {
          ...authoritative,
          spaces: Object.fromEntries(
            Object.values(authoritative.spaces).map(
              ({ tileId, ...space }, index) => {
                expect(tileId).toBeDefined();
                const id = SeatSpaceRefSchema.parse(
                  `space-ref:sha256:${index.toString(16).padStart(64, "0")}`,
                );
                return [id, { ...space, id, tileRef }];
              },
            ),
          ),
          edges: authoritative.edges.map((edge) => ({
            ...edge,
            spaceIds: edge.spaceIds.map((id) => refs.get(id)),
          })),
          vertices: authoritative.vertices.map((vertex) => ({
            ...vertex,
            spaceIds: vertex.spaceIds.map((id) => refs.get(id)),
          })),
          tiles: [
            {
              disclosure: "visible",
              ref: tileRef,
              tileTypeId: "fixture",
              name: "Fixture",
              ownerId: null,
              fields: {},
              properties: {},
              placement:
                authoritative.layout === "hex"
                  ? { layout: "hex", q: 0, r: 0, rotation: 0 }
                  : { layout: "square", col: 0, row: 0, rotation: 0 },
            },
          ],
        },
  );
  const spaceId = Object.keys(board.spaces)[0];
  let action = descriptor();
  action = {
    ...action,
    inputs: action.inputs.map((input) =>
      input.key === "space"
        ? {
            ...input,
            domain: {
              type: "boardTarget",
              valueKind: "board-id",
              projection: "resolved",
              targetKind: "space",
              boardId: board.id,
              eligibleTargets: spaceId ? [spaceId] : [],
            },
          }
        : input,
    ),
  };

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
                boardBaseId: "island",
                valueKind: "board-space",
                eligibleTargets: [
                  {
                    boardId: perPlayerInstanceId("board", "island", "alice"),
                    spaceId,
                  },
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
          [board.id]: RuntimeJsonSchema.parse(
            JSON.parse(JSON.stringify(board)),
          ),
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
            tiles: [],
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
function setup(board?: BoardTopology) {
  const input = source(board);
  const game = createGameInstance()({
    source: input,
    features: (core, context) => ({
      hand: handFeature(core, context, {
        zones: {
          hand: {
            defaultSort: "rank",
            sorts: {
              rank: {
                compare: (a, b) =>
                  Number(a.view?.properties.rank ?? Infinity) -
                  Number(b.view?.properties.rank ?? Infinity),
              },
              reverse: {
                compare: (a, b) =>
                  Number(b.view?.properties.rank ?? -Infinity) -
                  Number(a.view?.properties.rank ?? -Infinity),
              },
              tied: { compare: () => 0 },
            },
          },
        },
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
    expect(game.hand.getSortedCardIds(hand)).toEqual(["blue", "red", "hidden"]);
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
    const { game } = setup(
      hexBoard(perPlayerInstanceId("board", "island", "alice"), "alice"),
    );
    const board = game.boards.get(
      perPlayerInstanceId("board", "island", "alice"),
    );
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
      layout
        .getEdges()
        .every((edge) => parseBoardElementId(edge.id)?.boardId === board.id),
    ).toBe(true);
    const cell = layout.getSpaces()[0];
    expect(layout.pointToSpace(cell.center.x, cell.center.y)).toBe(CENTER);
    expect(layout.pointToSpace(9999, 9999)).toBeUndefined();
    expect(cell.getIsSelectable()).toBe(true);
    cell.getSelectHandler()();
    expect(game.state.drafts["play.move"]).toMatchObject({
      space: {
        boardId: perPlayerInstanceId("board", "island", "alice"),
        spaceId: CENTER,
      },
    });
    expect(cell.getIsSelected()).toBe(false);
    expect(
      game.boards
        .get(perPlayerInstanceId("board", "island", "alice"))
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
    expect(layout.pointToSpace(cell.center.x, cell.center.y)).toBe(CENTER);
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
    emit([CENTER]);
    props.onClick();
    expect(game.state.drafts["play.move"]?.space).toBe(CENTER);
    expect(cell.getIsEligible()).toBe(false);
    expect(cell.getIsSelected()).toBe(false);
    emit([]);
    cell.getSelectHandler()();
    expect(game.state.drafts["play.move"]?.space).toBeUndefined();
    game.dispose();
  });

  it("supports derived square incidence and reports generic layout limits", () => {
    const square = deriveBoardTopology(
      {
        boards: { square: { baseId: "square", relations: [] } },
        tiles: { cell: { id: "cell", tileTypeId: "domino" } },
        componentLocations: {
          cell: {
            type: "OnBoard",
            layout: "square",
            boardId: "square",
            col: 0,
            row: 0,
            rotation: 0,
          },
        },
      },
      {
        boardDefinitions: {
          square: {
            id: "square",
            name: "Square",
            scope: "shared",
            layout: "square",
            fields: {},
          },
        },
        tileDefinitions: {
          domino: {
            id: "domino",
            name: "Domino",
            layout: "square",
            fields: {},
            cells: [
              { id: "a", at: { col: 0, row: 0 }, fields: {} },
              { id: "b", at: { col: 1, row: 0 }, fields: {} },
            ],
            edges: [],
            vertices: [],
          },
        },
      },
      "square",
    );
    if (square.layout !== "square")
      throw new Error("Expected square topology.");
    for (const size of [0, -1, Infinity, NaN])
      expect(() =>
        createSquareBoardLayout(square, size, { x: 0, y: 0 }),
      ).toThrow(/positive and finite/);
    expect(() =>
      createSquareBoardLayout(square, 10, { x: Infinity, y: 0 }),
    ).toThrow(/origin/);
    const { game } = setup(square);
    const layout = game.boards
      .get("square")
      .getLayout({ hexSize: 10, viewport: { x: 5, y: 3, scale: 2 } });
    expect(layout.getEdges()).toHaveLength(7);
    expect(layout.getVertices()).toHaveLength(6);
    expect(layout.getVertices().map((vertex) => vertex.center)).toEqual(
      expect.arrayContaining([
        { x: 5, y: 3 },
        { x: 25, y: 3 },
        { x: 45, y: 3 },
        { x: 5, y: 23 },
        { x: 25, y: 23 },
        { x: 45, y: 23 },
      ]),
    );
    expect(square.layout === "square" && square.edges).toHaveLength(7);
    expect(game.boards.get("square").data).toMatchObject({
      id: square.id,
      layout: "square",
      fields: square.fields,
    });
    expect(
      Object.keys(game.boards.get("square").data.spaces).every(
        (id) => SeatSpaceRefSchema.safeParse(id).success,
      ),
    ).toBe(true);
    expect(layout.getEdges().map((edge) => edge.id)).toEqual(
      square.layout === "square" ? square.edges.map((edge) => edge.id) : [],
    );
    expect(layout.getVertices().map((vertex) => vertex.id)).toEqual(
      square.layout === "square"
        ? square.vertices.map((vertex) => vertex.id)
        : [],
    );
    for (const cell of layout.getSpaces())
      expect(layout.pointToSpace(cell.center.x, cell.center.y)).toBe(cell.id);
    game.dispose();
    const generic = setup({
      id: "generic",
      baseId: "generic",
      name: "Generic",
      layout: "generic",
      scope: "shared",
      fields: {},
      spaces: {},
      relations: [],
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
      value: CENTER,
      boardId: "island",
      interactionKey: "play.move",
      cardInputKey: "card",
      inputKey: "space",
    });
    game.drag.setDropTarget(target);
    game.drag.drop();
    expect(game.state.drafts["play.move"]).toEqual({
      card: "red",
      space: CENTER,
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
    const broad = narrow([CENTER, "other"]);
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
    emit([CENTER]);
    game.drag.begin("red");
    const old = game.getSnapshot().drag;
    expect(onBoard(old.getDropTargets()).map((target) => target.value)).toEqual(
      [CENTER],
    );
    emit(["other"]);
    expect(game.drag.active).toBeNull();
    game.drag.begin("red");
    expect(
      onBoard(game.drag.getDropTargets()).map((target) => target.value),
    ).toEqual(["other"]);
    expect(onBoard(old.getDropTargets()).map((target) => target.value)).toEqual(
      [CENTER],
    );
    game.dispose();
  });

  it("rejects ambiguous space routing and respects explicit disabled choices", () => {
    const { game, input } = setup();
    const alternate: InteractionDescriptor = {
      ...descriptor(),
      interactionId: "alternate",
      interactionKey: "play.alternate",
      inputs: descriptor().inputs.map((value) =>
        value.key === "space" &&
        value.domain.type === "boardTarget" &&
        value.domain.valueKind === "board-id"
          ? { ...value, domain: { ...value.domain, targetKind: "space" } }
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
    expect(game.state.drafts["play.move"]?.space).toBe(CENTER);
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
    const { game } = setup(
      hexBoard(perPlayerInstanceId("board", "island", "bob"), "bob"),
    );
    const cell = game.boards
      .get(perPlayerInstanceId("board", "island", "bob"))
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
    secondSpace: CENTER,
  });
  game.interactions.get("play.move").reset();
  game.boards
    .get("island")
    .getLayout({ hexSize: 20 })
    .getSpaces()[0]
    .getSelectHandler({ interaction: "play.move", input: "secondSpace" })();
  expect(game.state.drafts["play.move"]).toEqual({ secondSpace: CENTER });
  game.dispose();
});

it("shares semantic space handlers with geometry and captures immutable selection", () => {
  const { game } = setup();
  const board = game.boards.get("island");
  const space = board.spaces.get(CENTER);
  expect(board.spaces).toBe(board.spaces);
  expect(board.spaces.getAll()).toEqual([space]);
  expect(space.board).toBe(board);
  const spatial = board.getLayout({ hexSize: 20 }).getSpaces()[0];
  expect(spatial.getSelectHandler).toBe(space.getSelectHandler);
  expect(spatial.getTargetProps).toBe(space.getTargetProps);
  space.getSelectHandler({ interaction: "play.move" })();
  expect(game.state.drafts["play.move"]).toEqual({ space: CENTER });
  expect(space.getIsSelected()).toBe(false);
  expect(game.boards.get("island").spaces.get(CENTER).getIsSelected()).toBe(
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
    const board: BoardTopology = {
      id:
        scope === "shared"
          ? "island"
          : perPlayerInstanceId("board", "island", "alice"),
      baseId: "island",
      name: "Island",
      ...(scope === "perPlayer" ? { playerId: "alice" } : {}),
      scope,
      layout: "generic",
      fields: {},
      spaces: { center: { id: "center", fields: { score: 2 } } },
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
              boardId: perPlayerInstanceId("board", "island", "alice"),
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

it("rejects malformed frames atomically while retaining usable board state", () => {
  const { game, input } = setup();
  const current = game.getSnapshot();
  const snapshot = current.snapshot;
  if (!snapshot) throw new Error("Expected initialized source snapshot.");
  expect(() =>
    emitFrame(input, {
      ...snapshot.frame,
      view: { boards: { island: { id: "island" } } },
    }),
  ).toThrow();
  expect(game.getSnapshot().snapshot).toBe(snapshot);
  expect(game.boards.get("island").data.id).toBe("island");
  expect(() => game.dispose()).not.toThrow();
});

it("renders concealed footprints in board bounds without introducing spatial targets and preserves captured layouts", () => {
  const { game, input } = setup();
  const oldBoard = game.boards.get("island");
  const oldLayout = oldBoard.getLayout({ hexSize: 12 });
  expect(oldLayout.getTiles()).toHaveLength(1);
  expect(oldLayout.getTiles()[0].spaceIds).toEqual([CENTER]);
  const concealedRef = SeatTileRefSchema.parse(
    `tile-ref:sha256:${"b".repeat(64)}`,
  );
  if (oldBoard.data.layout !== "hex") throw new Error("Expected hex board");
  const board = SeatBoardTopologySchema.parse({
    ...oldBoard.data,
    tiles: [
      ...oldBoard.data.tiles,
      {
        ref: concealedRef,
        disclosure: "concealed",
        appearance: { layout: "hex", cells: [{ q: 0, r: 0 }] },
        placement: { layout: "hex", q: 10, r: 0, rotation: 2 },
      },
    ],
  });
  const frame = input.store.get().snapshot!.frame;
  emitFrame(input, {
    ...frame,
    view: {
      boards: {
        island: RuntimeJsonSchema.parse(JSON.parse(JSON.stringify(board))),
      },
    },
  });
  const nextBoard = game.boards.get("island");
  const layout = nextBoard.getLayout({ hexSize: 12 });
  expect(nextBoard).not.toBe(oldBoard);
  expect(layout.getTiles()).toHaveLength(2);
  expect(layout.viewBox.width).toBeGreaterThan(oldLayout.viewBox.width);
  expect(layout.getSpaces()).toHaveLength(1);
  expect(layout.getEdges()).toHaveLength(6);
  const concealed = layout
    .getTiles()
    .find((tile) => tile.ref === concealedRef)!;
  expect(concealed.spaceIds).toEqual([]);
  expect(
    layout.pointToSpace(concealed.center.x, concealed.center.y),
  ).toBeUndefined();
  expect(concealed.rotationDegrees).toBe(120);
  expect(Object.isFrozen(concealed.data)).toBe(true);
  expect(oldLayout.getTiles()).toHaveLength(1);
  expect(oldBoard.getLayout({ hexSize: 12 }).viewBox).toEqual(
    oldLayout.viewBox,
  );
  game.dispose();
});

it("rejects overflowing finite viewport transforms while preserving valid tile transforms", () => {
  const { game } = setup();
  const board = game.boards.get("island");
  expect(() =>
    board.getLayout({
      hexSize: 12,
      viewport: { x: 0, y: 0, scale: Number.MAX_VALUE },
    }),
  ).toThrow("transform must be finite");
  expect(() =>
    board.getLayout({
      hexSize: 12,
      viewport: { x: Number.MAX_VALUE, y: 0, scale: Number.MAX_VALUE / 2 },
    }),
  ).toThrow("transform must be finite");
  const original = board.getLayout({ hexSize: 12 });
  const transformed = board.getLayout({
    hexSize: 12,
    viewport: { x: 5, y: 3, scale: 2 },
  });
  const expected = (point: { x: number; y: number }) => ({
    x: point.x * 2 + 5,
    y: point.y * 2 + 3,
  });
  expect(transformed.getTiles()[0].center).toEqual(
    expected(original.getTiles()[0].center),
  );
  expect(transformed.getTiles()[0].anchor).toEqual(
    expected(original.getTiles()[0].anchor),
  );
  expect(transformed.getTiles()[0].outlines).toEqual(
    original.getTiles()[0].outlines.map((loop) => loop.map(expected)),
  );
  expect(
    transformed.pointToSpace(
      transformed.getSpaces()[0].center.x,
      transformed.getSpaces()[0].center.y,
    ),
  ).toBe(CENTER);
  game.dispose();
});

describe("hand sort modes", () => {
  it("treats an undefined optional zone configuration as unconfigured", () => {
    type Game = {
      contract: {
        manifest: { ids: { zoneId: z.ZodLiteral<"hand"> } };
      };
    };
    const options: HandOptions<Game> = {
      zones: { hand: undefined },
    };
    const input = source();
    const game = createGameInstance<Game>()({
      source: input,
      features: (core, context) => ({
        hand: handFeature(core, context, options),
      }),
    });
    const zone = game.zones.get("hand", "alice");
    expect(game.hand.getSortModes(zone)).toEqual([]);
    expect(game.hand.getSortMode(zone)).toBeNull();
    expect(game.hand.getSortedCardIds(zone)).toEqual(["red", "blue", "hidden"]);
    game.dispose();
  });

  it("rejects unknown modes admitted by widened public controller types without notifying", () => {
    const { game } = setup();
    const zone = game.zones.get("hand", "alice");
    const controller: HandController<unknown> = game.hand;
    const changed = vi.fn();
    const unsubscribe = game.subscribe(changed);
    controller.setSortMode(zone, "missing");
    expect(game.hand.getSortMode(zone)).toBe("rank");
    expect(changed).not.toHaveBeenCalled();
    unsubscribe();
    game.dispose();
  });

  it("rejects unknown defaults admitted by widened public option types", () => {
    const options: HandOptions<unknown> = {
      zones: {
        hand: {
          defaultSort: "missing",
          sorts: { rank: { compare: () => 0 } },
        },
      },
    };
    const input = source();
    expect(() =>
      createGameInstance()({
        source: input,
        features: (core, context) => ({
          hand: handFeature(core, context, options),
        }),
      }),
    ).toThrow('Unknown default hand sort "missing" for zone "hand".');
    input.dispose();
  });

  it("captures immutable modes, invalidates subscribers, and keeps selection and submissions untouched", () => {
    const { game, input } = setup();
    game.cards.get("red").select();
    const before = game.getSnapshot();
    const zone = before.zones.get("hand", "alice");
    const changed = vi.fn(() => game.hand.getSortMode(zone));
    const unsubscribe = game.subscribe(changed);
    game.hand.setSortMode(zone, "reverse");
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed).toHaveReturnedWith("reverse");
    expect(before.hand.getSortMode(zone)).toBe("rank");
    expect(before.hand.getSortedCardIds(zone)).toEqual([
      "blue",
      "red",
      "hidden",
    ]);
    expect(game.hand.getSortedCardIds(zone)).toEqual(["red", "blue", "hidden"]);
    expect(game.getSnapshot().state).toBe(before.state);
    expect(game.zones.get("hand", "alice").getSelectedCardIds()).toEqual([
      "red",
    ]);
    expect(input.submissions).toEqual([]);
    expect(Object.isFrozen(game.hand)).toBe(true);
    expect(Object.isFrozen(game.hand.getSortModes(zone))).toBe(true);
    expect(Object.isFrozen(game.hand.getSortedCardIds(zone))).toBe(true);
    game.hand.setSortMode(zone, "reverse");
    expect(changed).toHaveBeenCalledTimes(1);
    unsubscribe();
    game.dispose();
  });

  it("isolates hosts and preserves source order for ties and unconfigured zones", () => {
    const { game, input } = setup();
    const initial = input.store.get().snapshot!;
    emitFrame(input, {
      ...initial.frame,
      zones: {
        hand: {
          ...initial.frame.zones.hand,
          bob: {
            tiles: [],
            cardIds: [],
            cardViewsById: {},
            cardBacksById: {},
            playableByCardId: {},
          },
        },
        discard: {
          table: {
            tiles: [],
            cardIds: ["last", "first"],
            cardViewsById: {
              last: { id: "last", cardType: "ranked", properties: { rank: 2 } },
              first: {
                id: "first",
                cardType: "ranked",
                properties: { rank: 1 },
              },
            },
            cardBacksById: {},
            playableByCardId: {},
          },
        },
      },
    });
    const alice = game.zones.get("hand", "alice");
    const bob = game.zones.get("hand", "bob");
    game.hand.setSortMode(alice, "tied");
    expect(game.hand.getSortedCardIds(alice)).toEqual([
      "red",
      "blue",
      "hidden",
    ]);
    expect(game.hand.getSortMode(bob)).toBe("rank");
    expect(game.hand.getSortedCardIds(bob)).toEqual([]);
    const discard = game.zones.get("discard", "table");
    expect(game.hand.getSortModes(discard)).toEqual([]);
    expect(game.hand.getSortMode(discard)).toBeNull();
    expect(game.hand.getSortedCardIds(discard)).toEqual(["last", "first"]);
    game.dispose();
  });

  it("derives new projected order after frames and never reveals hidden fields to comparators", () => {
    const input = source();
    const compare = vi.fn(
      (
        a: import("../model.js").Card<unknown, Record<never, never>>,
        b: import("../model.js").Card<unknown, Record<never, never>>,
      ) => {
        for (const card of [a, b]) {
          if (card.hidden) expect(card.view).toBeNull();
          else expect(card.view.properties.rank).toBeTypeOf("number");
        }
        return (
          Number(a.view?.properties.rank ?? Infinity) -
          Number(b.view?.properties.rank ?? Infinity)
        );
      },
    );
    const game = createGameInstance()({
      source: input,
      features: (core, context) => ({
        hand: handFeature(core, context, {
          zones: { hand: { sorts: { rank: { compare } } } },
        }),
      }),
    });
    const before = game.getSnapshot();
    const zone = before.zones.get("hand", "alice");
    expect(game.hand.getSortMode(zone)).toBeNull();
    expect(game.hand.getSortedCardIds(zone)).toEqual(["red", "blue", "hidden"]);
    expect(compare).not.toHaveBeenCalled();
    game.hand.setSortMode(zone, "rank");
    const frame = input.store.get().snapshot!.frame;
    const hand = frame.zones.hand.alice;
    emitFrame(input, {
      ...frame,
      zones: {
        hand: {
          alice: {
            ...hand,
            cardIds: ["red", "blue", "green", "hidden"],
            cardViewsById: {
              ...hand.cardViewsById,
              green: {
                id: "green",
                cardType: "ranked",
                properties: { rank: 0 },
              },
            },
          },
        },
      },
    });
    expect(game.hand.getSortMode(game.zones.get("hand", "alice"))).toBe("rank");
    expect(game.hand.getSortedCardIds(game.zones.get("hand", "alice"))).toEqual(
      ["green", "blue", "red", "hidden"],
    );
    expect(before.hand.getSortedCardIds(zone)).toEqual([
      "red",
      "blue",
      "hidden",
    ]);
    expect(compare).toHaveBeenCalled();
    game.dispose();
  });

  it("resets on seat and source lifetimes and rejects old setters even after returning to a seat", () => {
    // Test-owned composition allows a seat switch on one source, unlike hosted transport.
    const initial = source().store.get().snapshot!;
    const store = createStore<SourceState>({
      connection: "ready",
      snapshot: initial,
      request: null,
      failure: null,
    });
    const input = { store, dispose: vi.fn() };
    const game = createGameInstance()({
      source: input,
      features: (core, context) => ({
        hand: handFeature(core, context, {
          zones: {
            hand: {
              defaultSort: "rank",
              sorts: {
                rank: { compare: () => 0 },
                reverse: { compare: () => 0 },
                tied: { compare: () => 0 },
              },
            },
          },
        }),
      }),
    });
    const old = game.hand;
    const zone = game.zones.get("hand", "alice");
    old.setSortMode(zone, "reverse");
    const players = [
      ...initial.players,
      { playerId: "bob", displayName: "Bob" },
    ];
    store.setState(() => ({
      connection: "ready",
      snapshot: { ...initial, players, me: "bob", version: 2 },
      request: null,
      failure: null,
    }));
    expect(game.hand.getSortMode(zone)).toBe("rank");
    store.setState(() => ({
      connection: "ready",
      snapshot: { ...initial, players, version: 3 },
      request: null,
      failure: null,
    }));
    old.setSortMode(zone, "tied");
    expect(game.hand.getSortMode(zone)).toBe("rank");
    const oldSource = game.hand;
    game.hand.setSortMode(zone, "reverse");
    const replacement = {
      store: createStore<SourceState>(store.get()),
      dispose: vi.fn(),
    };
    game.setOptions({ source: replacement });
    expect(game.hand.getSortMode(zone)).toBe("rank");
    oldSource.setSortMode(zone, "tied");
    expect(game.hand.getSortMode(zone)).toBe("rank");
    game.setOptions({ source: input });
    oldSource.setSortMode(zone, "reverse");
    expect(game.hand.getSortMode(zone)).toBe("rank");
    const latest = game.hand;
    game.dispose();
    latest.setSortMode(zone, "reverse");
    expect(game.hand).toBe(latest);
  });
});

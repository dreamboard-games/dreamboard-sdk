import { compileManifest } from "../../manifest/compiler";
import { describe, expect, test } from "vitest";
import * as z from "zod";
import { createGame } from "../../authoring/game.js";
import { createTableQueries } from "../../table-queries.js";
import { many } from "../../inputs/many.js";
import { concealCards } from "./card-concealment.js";
import { createSeatDisclosure } from "./tile-disclosure.js";
import { collectInteractionInputs } from "./collector-domains.js";
import {
  selectionHasConcealedReferences,
  canDiscloseSelection,
  decodeSeatParams,
  encodeSeatParams,
  projectSeatDescriptor,
} from "./seat-interactions.js";
import type { InteractionDescriptorShape } from "./interaction-types.js";
import type { RuntimeTableRecord } from "../../model/table.js";
import type { InputCollector } from "../../model/spec/inputs.js";
import { tileSpaceId } from "../../../shared/domain/tile-space.js";
import { perPlayerInstanceId } from "../../../shared/domain/per-player-instance.js";
import { deriveBoardTopology } from "../../../shared/board-topology.js";
import { inputValueInDomain } from "../../../shared/input-domain.js";

const source = {
  players: { minPlayers: 2, maxPlayers: 2 },
  cardSets: [
    {
      id: "cards",
      name: "Cards",
      defaultHome: { type: "zone", zoneId: "bag" },
      cardSchema: z.object({}),
      cards: [
        {
          id: "card",
          cardType: "card",
          name: "Secret card",
          count: 1,
          properties: {},
        },
      ],
    },
  ],
  zones: [
    {
      id: "cargo",
      name: "Cargo",
      attachedTo: { tileType: "terrain", cell: "cell" },
      visibility: "public",
    },
    { id: "bag", name: "Bag", scope: "shared", visibility: "hidden" },
    { id: "hand", name: "Hand", scope: "perPlayer", visibility: "ownerOnly" },
  ],
  boards: [
    { id: "map", name: "Map", scope: "shared", layout: "square" },
    {
      id: "private",
      name: "Private",
      scope: "perPlayer",
      layout: "generic",
      spaces: [{ id: "spot" }],
    },
  ],
  tileTypes: [
    {
      id: "terrain",
      name: "Terrain",
      layout: "square",
      cells: [{ id: "cell", at: { col: 0, row: 0 } }],
    },
  ],
  tileSeeds: [
    {
      id: "back",
      typeId: "terrain",
      disclosure: {
        face: { audience: "public" },
        appearance: { layout: "square", cells: [{ col: 0, row: 0 }] },
      },
    },
    { id: "omitted", typeId: "terrain" },
    {
      id: "placed",
      typeId: "terrain",
      home: {
        type: "board",
        boardId: "map",
        layout: "square",
        col: 0,
        row: 0,
        rotation: 0,
      },
    },
    {
      id: "concealed",
      typeId: "terrain",
      home: {
        type: "board",
        boardId: "map",
        layout: "square",
        col: 2,
        row: 0,
        rotation: 0,
      },
      disclosure: {
        face: { audience: "public" },
        appearance: { layout: "square", cells: [{ col: 0, row: 0 }] },
      },
    },
  ],
} as const;
function fixture() {
  const game = createGame({
    manifest: compileManifest(source),
    state: {
      public: z.object({}),
      private: z.object({}),
      hidden: z.object({}),
    },
    phases: { play: z.object({}) },
  });
  const definitions = game.contract.manifest;
  const table: RuntimeTableRecord = definitions.createInitialTable({
    playerIds: ["north", "south"],
  });
  table.zones.bag.table.push("back", "omitted");
  for (const id of ["back", "omitted"] as const)
    table.componentLocations[id] = {
      type: "InZone",
      zoneId: "bag",
      hostId: "table",
      playedBy: null,
    };
  table.tiles.concealed.disclosure.face = { audience: "none" };
  for (const board of Object.values(table.boards))
    if (board.baseId === "private") board.visibility = "ownerOnly";
  const state = { table, flow: { currentPhase: "play" } };
  const q = createTableQueries(table, definitions);
  const disclosure = createSeatDisclosure(table, definitions, "north", {
    sessionId: "session",
    version: 1,
  });
  const cards = concealCards(table, "north", disclosure);
  return {
    definitions,
    state,
    q,
    disclosure,
    cards,
    inputs: game.phase("play").inputs,
  };
}
function descriptor(
  collectors: Record<string, InputCollector>,
  f: ReturnType<typeof fixture>,
): InteractionDescriptorShape {
  return {
    kind: "action",
    phaseName: "play",
    interactionKey: "play.choose",
    interactionId: "choose",
    label: "Choose",
    commit: { mode: "manual" },
    availability: { status: "available" },
    inputs: collectInteractionInputs(
      { inputs: collectors, reduce: () => {} },
      f.state,
      "north",
      {
        definitions: f.definitions,
        queries: f.q,
      },
    ),
  };
}

describe("schema-aware seat interaction references", () => {
  test("projects position hosts through disclosed zone inventories, including defaults", () => {
    const f = fixture();
    const to = {
      zoneId: "cargo",
      hostId: tileSpaceId("placed", "cell"),
      index: 0,
    };
    const position = f.inputs.position({ zones: ["cargo"] });
    const collectors = {
      to: { ...position, defaultValue: to },
      hidden: {
        ...position,
        defaultValue: { ...to, hostId: tileSpaceId("concealed", "cell") },
      },
    };
    const projected = projectSeatDescriptor(
      descriptor(collectors, f),
      collectors,
      f.disclosure,
      f.cards,
    )!;
    const hostId = f.disclosure.boardTarget("space", "map", to.hostId)!;
    expect(projected.inputs[0].domain).toEqual({
      type: "zonePosition",
      zones: [{ zoneId: "cargo", hostId, size: 0 }],
    });
    expect(projected.inputs[0].defaultValue).toEqual({ ...to, hostId });
    expect(projected.inputs[1]).not.toHaveProperty("defaultValue");
    for (const id of ["back", "omitted", "concealed", "placed"])
      expect(JSON.stringify(projected)).not.toContain(
        tileSpaceId(id, "cell").replaceAll('"', '\\"'),
      );
  });

  test("round-trips position selections and rejects raw, stale and undisclosed hosts", () => {
    const f = fixture();
    const position = f.inputs.position({ zones: ["cargo", "hand"] });
    const collectors = { to: position, points: many(position, { count: 2 }) };
    const to = {
      zoneId: "cargo",
      hostId: tileSpaceId("placed", "cell"),
      index: 0,
    };
    const hand = { zoneId: "hand", hostId: "north", index: 0 };
    const original = { to, points: [to, hand] };
    const encoded = encodeSeatParams(
      original,
      collectors,
      f.disclosure,
      f.cards,
    );
    expect(encoded.to).toEqual({
      ...to,
      hostId: f.disclosure.boardTarget("space", "map", to.hostId),
    });
    expect(
      decodeSeatParams(encoded, collectors, f.disclosure, f.cards),
    ).toEqual(original);
    expect(
      decodeSeatParams(original, collectors, f.disclosure, f.cards),
    ).toBeNull();
    const next = createSeatDisclosure(f.state.table, f.definitions, "north", {
      sessionId: "session",
      version: 2,
    });
    expect(decodeSeatParams(encoded, collectors, next, f.cards)).toBeNull();

    const draft = {
      ...descriptor(collectors, f),
      step: { index: 1, total: 2, canCancel: true, selected: original },
    };
    expect(
      projectSeatDescriptor(draft, collectors, f.disclosure, f.cards)?.step
        ?.selected,
    ).toEqual(encoded);
    for (const inaccessible of [
      ...["back", "omitted", "concealed"].map((id) => ({
        ...to,
        hostId: tileSpaceId(id, "cell"),
      })),
      { ...hand, hostId: "south" },
    ]) {
      const selected = { points: [to, inaccessible] };
      expect(
        decodeSeatParams(
          { to: inaccessible },
          collectors,
          f.disclosure,
          f.cards,
        ),
      ).toBeNull();
      expect(
        canDiscloseSelection(selected, collectors, f.disclosure, f.cards),
      ).toBe(false);
      expect(
        projectSeatDescriptor(
          { ...draft, step: { ...draft.step, selected } },
          collectors,
          f.disclosure,
          f.cards,
        ),
      ).toBeNull();
    }
  });

  test("projects card/tile targets and defaults while omitting unauthorized defaults wholly", () => {
    const f = fixture();
    const collectors = {
      tile: { ...f.inputs.tile({ from: ["bag"] }), defaultValue: "back" },
      card: { ...f.inputs.card({ from: ["bag"] }), defaultValue: "card" },
      outside: { ...f.inputs.tile({ from: ["bag"] }), defaultValue: "placed" },
      multiple: {
        ...many(f.inputs.tile({ from: ["bag"] }), { count: 2 }),
        defaultValue: ["back", "omitted"],
      },
    };
    const projected = projectSeatDescriptor(
      descriptor(collectors, f),
      collectors,
      f.disclosure,
      f.cards,
    )!;
    expect(projected.inputs[0].domain).toMatchObject({
      type: "tileTarget",
      eligibleTargets: [f.disclosure.tileRef("back")],
    });
    expect(projected.inputs[0]).not.toHaveProperty("defaultValue");
    expect(projected.inputs[1]).not.toHaveProperty("defaultValue");
    expect(projected.inputs[2]).not.toHaveProperty("defaultValue");
    expect(projected.inputs[3]).not.toHaveProperty("defaultValue");
    expect(JSON.stringify(projected)).not.toContain('"omitted"');
    expect(JSON.stringify(projected)).not.toContain('"back"');
    expect(
      inputValueInDomain(
        projected.inputs[0].domain,
        f.disclosure.tileRef("back"),
      ),
    ).toBe(true);
  });

  test("retains visible component defaults and drops mixed visible-concealed lists entirely", () => {
    const f = fixture();
    f.state.table.zones.bag.table = f.state.table.zones.bag.table.filter(
      (id) => id !== "card",
    );
    f.state.table.zones.hand.north = ["card"];
    f.state.table.componentLocations.card = {
      type: "InZone",
      zoneId: "hand",
      hostId: "north",
      playedBy: null,
    };
    f.state.table.visibility.card = { faceUp: true };
    f.disclosure = createSeatDisclosure(f.state.table, f.definitions, "north", {
      sessionId: "session",
      version: 1,
    });
    f.cards = concealCards(f.state.table, "north", f.disclosure);
    const collectors = {
      tile: { ...f.inputs.tile({ boards: ["map"] }), defaultValue: "placed" },
      card: { ...f.inputs.card({ from: ["hand"] }), defaultValue: "card" },
      mixed: {
        ...many(f.inputs.tile({ boards: ["map"] }), { count: 2 }),
        defaultValue: ["placed", "concealed"],
      },
    };
    const projected = projectSeatDescriptor(
      descriptor(collectors, f),
      collectors,
      f.disclosure,
      f.cards,
    )!;
    expect(projected.inputs[0].defaultValue).toBe(
      f.disclosure.tileRef("placed"),
    );
    expect(projected.inputs[1].defaultValue).toBe("card");
    expect(projected.inputs[2]).not.toHaveProperty("defaultValue");
  });

  test("filters undisclosed cells, edges and vertices and roundtrips exact board targets", () => {
    const f = fixture();
    const collectors = {
      space: f.inputs.board.space({ boardId: "map" }),
      edges: many(f.inputs.board.edge({ boardId: "map" }), { count: 1 }),
      vertices: many(f.inputs.board.vertex({ boardId: "map" }), { count: 1 }),
      privateSpace: f.inputs.board.playerSpace({ boardId: "private" }),
    };
    const projected = projectSeatDescriptor(
      descriptor(collectors, f),
      collectors,
      f.disclosure,
      f.cards,
    )!;
    const space = tileSpaceId("placed", "cell");
    const concealed = tileSpaceId("concealed", "cell");
    expect(projected.inputs[0].domain).toMatchObject({
      eligibleTargets: [f.disclosure.boardTarget("space", "map", space)],
    });
    expect(JSON.stringify(projected)).not.toContain(concealed);
    expect(projected.inputs[3].domain).toMatchObject({
      eligibleTargets: [
        {
          boardId: perPlayerInstanceId("board", "private", "north"),
          spaceId: "spot",
        },
      ],
    });
    const topology = deriveBoardTopology(f.state.table, f.definitions, "map");
    if (topology.layout === "generic")
      throw new Error("Expected square topology");
    const edge = topology.edges.find((edge) =>
      edge.spaceIds.includes(space),
    )!.id;
    const vertex = topology.vertices.find((vertex) =>
      vertex.spaceIds.includes(space),
    )!.id;
    const original = {
      space,
      edges: [edge],
      vertices: [vertex],
      privateSpace: {
        boardId: perPlayerInstanceId("board", "private", "north"),
        spaceId: "spot",
      },
      label: space,
    };
    const encoded = encodeSeatParams(
      original,
      collectors,
      f.disclosure,
      f.cards,
    );
    expect(encoded.space).not.toBe(space);
    expect(encoded.label).toBe(space);
    expect(
      decodeSeatParams(encoded, collectors, f.disclosure, f.cards),
    ).toEqual(original);
    expect(
      decodeSeatParams({ space }, collectors, f.disclosure, f.cards),
    ).toBeNull();
    expect(
      decodeSeatParams(
        {
          privateSpace: {
            boardId: perPlayerInstanceId("board", "private", "south"),
            spaceId: "spot",
          },
        },
        collectors,
        f.disclosure,
        f.cards,
      ),
    ).toBeNull();
  });

  test("cancels the entire projected draft when any declared selected reference loses access", () => {
    const f = fixture();
    const collectors = {
      tiles: many(f.inputs.tile({ from: ["bag"] }), { count: 2 }),
      label: f.inputs.form.choice({
        defaultValue: "omitted",
        choices: [{ value: "omitted", label: "Omitted" }],
      }),
    };
    const base = descriptor(collectors, f);
    const invalid = {
      ...base,
      step: {
        index: 1,
        total: 2,
        canCancel: true,
        selected: { tiles: ["back", "omitted"], label: "omitted" },
      },
    };
    expect(
      projectSeatDescriptor(invalid, collectors, f.disclosure, f.cards),
    ).toBeNull();
    expect(
      canDiscloseSelection(
        invalid.step.selected,
        collectors,
        f.disclosure,
        f.cards,
      ),
    ).toBe(false);
    const valid = {
      ...base,
      step: {
        index: 1,
        total: 2,
        canCancel: true,
        selected: { tiles: ["back", "placed"], label: "omitted" },
      },
    };
    expect(
      canDiscloseSelection(
        valid.step.selected,
        collectors,
        f.disclosure,
        f.cards,
      ),
    ).toBe(true);
    const projected = projectSeatDescriptor(
      valid,
      collectors,
      f.disclosure,
      f.cards,
    )!;
    expect(projected.step?.selected).toEqual({
      tiles: [f.disclosure.tileRef("back"), f.disclosure.tileRef("placed")],
      label: "omitted",
    });
  });

  test("detects concealed references only in declared scalar and many selections", () => {
    const f = fixture();
    const collectors = {
      tile: f.inputs.tile({ boards: ["map"] }),
      tiles: many(f.inputs.tile({ boards: ["map"] }), { count: 2 }),
      card: f.inputs.card({ from: ["bag"] }),
    };
    expect(
      selectionHasConcealedReferences(
        { tile: "placed" },
        collectors,
        f.disclosure,
        f.cards,
      ),
    ).toBe(false);
    expect(
      selectionHasConcealedReferences(
        { tile: "concealed" },
        collectors,
        f.disclosure,
        f.cards,
      ),
    ).toBe(true);
    expect(
      selectionHasConcealedReferences(
        { tiles: ["placed", "concealed"] },
        collectors,
        f.disclosure,
        f.cards,
      ),
    ).toBe(true);
    expect(
      selectionHasConcealedReferences(
        { card: "card" },
        collectors,
        f.disclosure,
        f.cards,
      ),
    ).toBe(true);
    expect(
      selectionHasConcealedReferences(
        { text: { card: "card", tile: "concealed" } },
        collectors,
        f.disclosure,
        f.cards,
      ),
    ).toBe(false);
  });

  test("decodes only declared scalar/many fields and rejects stale, raw and nested refs", () => {
    const f = fixture();
    const collectors = {
      tile: f.inputs.tile({ from: ["bag"] }),
      tiles: many(f.inputs.tile({ boards: ["map"] }), { count: 2 }),
      card: f.inputs.card({ from: ["bag"] }),
      cards: many(f.inputs.card({ from: ["bag"] }), { count: 1 }),
    };
    const params = {
      tile: "back",
      tiles: ["placed", "concealed"],
      card: "card",
      cards: ["card"],
      arbitrary: { nested: ["back", "card"] },
    };
    const encoded = encodeSeatParams(params, collectors, f.disclosure, f.cards);
    expect(encoded.arbitrary).toEqual(params.arbitrary);
    expect(
      decodeSeatParams(encoded, collectors, f.disclosure, f.cards),
    ).toEqual(params);
    expect(
      decodeSeatParams({ tile: "back" }, collectors, f.disclosure, f.cards),
    ).toBeNull();
    expect(
      decodeSeatParams({ card: "card" }, collectors, f.disclosure, f.cards),
    ).toBeNull();
    expect(
      decodeSeatParams(
        { tiles: [[f.disclosure.tileRef("placed")]] },
        collectors,
        f.disclosure,
        f.cards,
      ),
    ).toBeNull();
    const next = createSeatDisclosure(f.state.table, f.definitions, "north", {
      sessionId: "session",
      version: 2,
    });
    expect(decodeSeatParams(encoded, collectors, next, f.cards)).toBeNull();
    expect(
      encodeSeatParams({ tile: "unknown" }, collectors, f.disclosure, f.cards),
    ).toEqual({ tile: "unknown" });
  });
});

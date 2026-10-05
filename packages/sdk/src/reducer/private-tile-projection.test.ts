import { describe, expect, it } from "vitest";
import * as z from "zod";
import { createGame, createReducerBundle } from "../reducer.js";
import { RuntimeJsonSchema } from "../shared/runtime-json.js";
import { materializePluginGameplayFrame } from "../shared/protocol/projection.js";
import { computePluginActionSetVersion } from "../shared/protocol/digest.js";
import type {
  ReferenceBasis,
  ReducerSessionState,
  GameplayBasis,
} from "../shared/runtime-types.js";
import { tileSpaceId } from "../shared/domain/tile-space.js";
import { asPlayerId } from "./per-player.js";

const north = asPlayerId("north");
const south = asPlayerId("south");
const referenceBasis: ReferenceBasis = {
  sessionId: "private-tile-test",
  version: 1,
};
const appearance = {
  layout: "square" as const,
  cells: [{ col: 0, row: 0 }],
  backImage: "assets/back.png",
};
async function fixture(hiddenGeometry = 1) {
  const model = createGame({
    manifest: {
      players: { minPlayers: 2, maxPlayers: 2 },
      cardSets: [
        {
          id: "cards",
          name: "Cards",
          cardSchema: z.object({}),
          defaultHome: { type: "detached" },
          cards: [
            {
              id: "card",
              name: "Card",
              count: 1,
              cardType: "cards",
              properties: {},
              backImage: "assets/card-back.png",
            },
          ],
        },
      ],
      zones: [
        { id: "bag", name: "Bag", scope: "shared", visibility: "hidden" },
        { id: "public", name: "Public", scope: "shared", visibility: "public" },
        {
          id: "hand",
          name: "Hand",
          scope: "perPlayer",
          visibility: "ownerOnly",
        },
        {
          id: "cargo",
          name: "Cargo",
          attachedTo: { tileType: "face", cell: "cell" },
          visibility: "public",
        },
      ],
      boards: [{ id: "map", name: "Map", scope: "shared", layout: "square" }],
      tileTypes: [
        {
          id: "face",
          name: "Face",
          layout: "square",
          cells: [{ id: "cell", at: { col: 0, row: 0 } }],
          propertiesSchema: z.object({ secret: z.int().default(0) }),
        },
        {
          id: "secret-face",
          name: "Secret",
          layout: "square",
          cells: [
            { id: "secret-cell", at: { col: 0, row: 0 } },
            { id: "secret-far", at: { col: hiddenGeometry, row: 0 } },
          ],
          propertiesSchema: z.object({ secret: z.int().default(0) }),
        },
      ],
      tileSeeds: [
        { id: "a", typeId: "face" },
        { id: "b", typeId: "secret-face" },
        { id: "omitted", typeId: "face" },
      ],
    },
    phases: { play: z.object({}) },
    state: {
      public: z.object({ picked: z.int().default(0) }),
      private: z.object({}),
      hidden: z.object({}),
    },
  });
  const play = model.phase("play");
  const tile = () => play.inputs.tile({ from: ["bag", "hand"] });
  const definition = model.assemble({
    initialPhase: "play",
    phases: {
      play: play.define({
        kind: "player",
        initialState: () => ({}),
        enter({ tx }) {
          tx.setActivePlayers([north, south]);
        },
        interactions: {
          choose: play.interaction({
            inputs: { tileId: tile() },
            reduce({ tx, state }) {
              tx.patchPublicState({ picked: state.publicState.picked + 1 });
            },
          }),
          boardChoose: play.interaction({
            inputs: { tileId: play.inputs.tile({ boards: ["map"] }) },
            reduce() {},
          }),
          defaultChoose: play.interaction({
            inputs: { tileId: { ...tile(), defaultValue: "a" as const } },
            reduce() {},
          }),
          draft: play.interaction({
            steps: play
              .steps()
              .input("tileId", tile())
              .input(
                "confirm",
                play.inputs.form.choice({
                  choices: [{ value: "yes", label: "Yes" }],
                  defaultValue: "yes",
                }),
              )
              .input(
                "finish",
                play.inputs.form.choice({
                  choices: [{ value: "done", label: "Done" }],
                  defaultValue: () => undefined,
                }),
              ),
            reduce() {},
          }),
          quiet: play.interaction({ inputs: {}, reduce() {} }),
          reveal: play.interaction({
            inputs: {},
            reduce({ tx }) {
              tx.moveComponentToZone({
                componentId: "a",
                to: { zoneId: "public" },
              });
              tx.setTileDisclosure({
                tileId: "a",
                disclosure: { face: { audience: "public" }, appearance },
              });
            },
          }),
          reorderRoundTrip: play.interaction({
            inputs: {},
            reduce({ tx }) {
              tx.moveComponentToZone({
                componentId: "a",
                to: { zoneId: "bag" },
                position: "bottom",
              });
              tx.moveComponentToZone({
                componentId: "a",
                to: { zoneId: "bag" },
                position: "top",
              });
            },
          }),
        },
      }),
    },
    view: model.view(({ state }) => ({ picked: state.publicState.picked })),
  });
  const bundle = createReducerBundle(definition);
  const initialTable = model.contract.manifest.createInitialTable({
    playerIds: [north, south],
  });
  const initialized = await bundle.initialize({
    table: RuntimeJsonSchema.parse(initialTable),
    playerIds: [north, south],
    rngSeed: 1,
  });
  const state = initialized.state;
  const table = model.contract.manifest.tableSchema.parse(state.domain.table);
  table.zones.bag.table = ["a", "b", "omitted"];
  for (const id of ["a", "b", "omitted"] as const)
    table.componentLocations[id] = {
      type: "InZone",
      zoneId: "bag",
      hostId: "table",
      playedBy: null,
    };
  table.tiles.a.disclosure = {
    face: { audience: "none" },
    appearance: structuredClone(appearance),
  };
  table.tiles.b.disclosure = {
    face: { audience: "none" },
    appearance: structuredClone(appearance),
  };
  table.tiles.omitted.disclosure = { face: { audience: "none" } };
  const sync = () => {
    state.domain.table = RuntimeJsonSchema.parse(table);
  };
  const project = (
    playerId = south,
    basis = referenceBasis,
    current = state,
  ) => {
    if (current === state) sync();
    return bundle.project({
      state: current,
      playerIds: [playerId],
      referenceBasis: basis,
    });
  };
  const frame = (playerId = south, basis = referenceBasis, current = state) => {
    const projection = project(playerId, basis, current);
    const input = {
      sessionId: basis.sessionId,
      version: basis.version,
      perspectivePlayerId: playerId,
      dynamicProjection: projection,
      currentPhase: "play",
      activePlayers: [north, south],
      actionSetVersion: "pending-action-set",
    };
    const preview = materializePluginGameplayFrame(input);
    return materializePluginGameplayFrame({
      ...input,
      actionSetVersion: computePluginActionSetVersion({
        version: basis.version,
        availableInteractions: preview.availableInteractions,
      }),
    });
  };
  const dispatch = (
    playerId: typeof north,
    interactionId: string,
    params: Record<string, string>,
    inputBasis?: GameplayBasis,
    authorityBasis = referenceBasis,
    current = state,
  ) => {
    const currentFrame = frame(playerId, authorityBasis, current);
    return bundle.dispatch({
      state: current,
      referenceBasis: authorityBasis,
      input: {
        kind: "interaction",
        interactionId,
        playerId,
        params,
        basis: inputBasis ?? currentFrame.basis,
      },
    });
  };
  return { model, bundle, state, table, sync, project, frame, dispatch };
}

describe("private tile wire projection and ingress", () => {
  it("keeps complete bundles and frames equal for undisclosed order, data, geometry and omitted inventory", async () => {
    const first = await fixture(1);
    const second = await fixture(20);
    second.table.zones.bag.table = ["omitted", "b", "a"];
    second.table.tiles.a.properties.secret = 123;
    second.table.tiles.b.properties.secret = 456;
    first.state.runtime.events = [
      {
        audience: { kind: "seats", playerIds: [north] },
        kind: "systemAction",
        procedureId: "secret",
        title: "Private north fact",
      },
    ];
    second.state.runtime.events = [
      {
        audience: { kind: "seats", playerIds: [north] },
        kind: "systemAction",
        procedureId: "secret",
        title: "Different private north fact",
      },
    ];
    expect(second.project()).toEqual(first.project());
    expect(second.frame()).toEqual(first.frame());
    const payload = JSON.stringify(first.frame());
    expect(payload).not.toMatch(
      /secret-face|secret-cell|secret-far|Private north fact|"omitted"/,
    );
    expect(first.frame().zones.bag.table.tiles).toHaveLength(2);
  });
  it("presents visible, concealed and omitted inventory and accepts only issued target references", async () => {
    const f = await fixture();
    const frame = f.frame();
    const tiles = frame.zones.bag.table.tiles;
    expect(tiles.map((tile) => tile.disclosure)).toEqual([
      "concealed",
      "concealed",
    ]);
    expect(JSON.stringify(tiles)).not.toMatch(
      /"tileTypeId"|"properties"|"localCellId"/,
    );
    const choose = frame.availableInteractions.find(
      (descriptor) => descriptor.interactionId === "choose",
    )!;
    expect(choose.inputs[0].domain).toMatchObject({
      type: "tileTarget",
      eligibleTargets: tiles.map((tile) => tile.ref),
    });
    expect(
      (await f.dispatch(south, "choose", { tileId: tiles[0].ref })).kind,
    ).toBe("accept");
    expect((await f.dispatch(south, "choose", { tileId: "a" })).kind).toBe(
      "reject",
    );
    expect(
      (await f.dispatch(south, "choose", { tileId: "omitted" })).kind,
    ).toBe("reject");
    f.table.zones.bag.table = ["b", "omitted"];
    f.table.zones.hand[north] = ["a"];
    f.table.componentLocations.a = {
      type: "InZone",
      zoneId: "hand",
      hostId: "north",
      playedBy: null,
    };
    f.table.tiles.a.disclosure.face = { audience: "public" };
    expect(f.frame(north).zones.hand.north.tiles[0].disclosure).toBe("visible");
    expect(f.frame(south).zones.hand?.north).toBeUndefined();
    expect(
      f
        .frame(south)
        .availableInteractions.find(
          (descriptor) => descriptor.interactionId === "defaultChoose",
        )?.inputs[0].defaultValue,
    ).toBeUndefined();
  });
  it("rejects stale authority versions and cross-seat or session basis before dispatch", async () => {
    const f = await fixture();
    const frame = f.frame(south);
    const tileId = frame.zones.bag.table.tiles[0].ref;
    const params = { tileId };
    for (const inputBasis of [
      { ...frame.basis, version: 0 },
      { ...frame.basis, perspectivePlayerId: north },
      { ...frame.basis, sessionId: "foreign" },
    ])
      expect((await f.dispatch(south, "choose", params, inputBasis)).kind).toBe(
        "reject",
      );
    expect((await f.dispatch(north, "choose", params)).kind).toBe("reject");
    expect(
      (
        await f.dispatch(south, "choose", params, undefined, {
          ...referenceBasis,
          version: 2,
        })
      ).kind,
    ).toBe("reject");
    expect(
      (
        await f.dispatch(south, "choose", params, undefined, {
          ...referenceBasis,
          sessionId: "foreign",
        })
      ).kind,
    ).toBe("reject");
  });
  it("filters event audiences and projects typed tile details under the same disclosure", async () => {
    const f = await fixture();
    f.state.runtime.events = [
      {
        audience: { kind: "seats", playerIds: [north] },
        kind: "systemAction",
        procedureId: "private",
        title: "North only",
        details: [{ label: "Secret", value: { kind: "tile", tileId: "a" } }],
      },
      {
        audience: { kind: "public" },
        kind: "systemAction",
        procedureId: "public",
        title: "Public draw",
        details: [
          { label: "Tile", value: { kind: "tile", tileId: "a" } },
          { label: "Omitted", value: { kind: "tile", tileId: "omitted" } },
        ],
      },
    ];
    const frame = f.frame(south);
    expect(frame.events).toHaveLength(1);
    expect(frame.events[0]).toMatchObject({ title: "Public draw" });
    expect(frame.events[0].details).toBeUndefined();
    const before = f.project();
    f.table.zones.bag.table = ["b", "a", "omitted"];
    expect(f.project()).toEqual(before);
    f.table.zones.bag.table = ["b", "omitted"];
    f.table.zones.public.table = ["a"];
    f.table.componentLocations.a = {
      type: "InZone",
      zoneId: "public",
      hostId: "table",
      playedBy: null,
    };
    f.table.tiles.a.ownerId = north;
    f.table.tiles.a.disclosure.face = { audience: "owner" };
    expect(f.frame(south).events[0].details).toBeUndefined();
    const ownerFrame = f.frame(north);
    expect(ownerFrame.events).toHaveLength(2);
    expect(ownerFrame.events[1].details).toEqual([
      {
        label: "Tile",
        value: {
          kind: "tile",
          ref: ownerFrame.zones.public.table.tiles[0].ref,
        },
      },
    ]);
    expect(JSON.stringify(frame.events)).not.toMatch(
      /"tileId"|North only|Omitted/,
    );
  });
  it("never emits raw tile identities through card-attached tile-cell hosts", async () => {
    const f = await fixture();
    f.table.zones.bag.table = ["b", "omitted"];
    f.table.componentLocations.a = {
      type: "OnBoard",
      boardId: "map",
      layout: "square",
      col: 0,
      row: 0,
      rotation: 0,
    };
    f.table.tiles.a.disclosure.face = { audience: "public" };
    const host = tileSpaceId("a", "cell");
    f.table.zones.cargo[host] = ["card"];
    f.table.componentLocations.card = {
      type: "InZone",
      zoneId: "cargo",
      hostId: host,
      playedBy: null,
    };
    const frame = f.frame();
    expect(Object.values(frame.zones.cargo)[0].cardIds).toEqual(["card"]);
    expect(Object.keys(frame.zones.cargo)[0]).toMatch(/^space-ref:/);
    expect(JSON.stringify(frame)).not.toContain(host);
    f.table.tiles.a.disclosure.face = { audience: "none" };
    expect(f.frame().zones.cargo).toBeUndefined();
  });
  it("projects current selected tile drafts as references and suppresses invalidated private prefixes coherently", async () => {
    const f = await fixture();
    const ref = f.frame(south).zones.bag.table.tiles[0].ref;
    const result = await f.dispatch(south, "draft", { tileId: ref });
    if (result.kind !== "accept")
      throw new Error("Expected accepted tile prefix");
    const frame = f.frame(
      south,
      { ...referenceBasis, version: 2 },
      result.state,
    );
    const descriptor = frame.availableInteractions.find(
      (descriptor) => descriptor.interactionId === "draft",
    )!;
    expect(descriptor.step?.selected).toEqual({
      tileId: frame.zones.bag.table.tiles[0].ref,
    });
    expect(JSON.stringify(descriptor)).not.toMatch(/"tileId":"a"/);
    const invalidated: ReducerSessionState = structuredClone(result.state);
    const table = f.model.contract.manifest.tableSchema.parse(
      invalidated.domain.table,
    );
    table.zones.bag.table = ["b", "omitted"];
    table.zones.hand[north] = ["a"];
    table.componentLocations.a = {
      type: "InZone",
      zoneId: "hand",
      hostId: "north",
      playedBy: null,
    };
    invalidated.domain.table = RuntimeJsonSchema.parse(table);
    const next = f.frame(south, { ...referenceBasis, version: 3 }, invalidated);
    const reset = next.availableInteractions.find(
      (descriptor) => descriptor.interactionId === "draft",
    );
    expect(reset?.step?.selected.tileId).toBeUndefined();
    expect(reset?.step?.index).toBe(0);
  });
  it("does not track a concealed pending tile through a hidden shuffle", async () => {
    const f = await fixture();
    const ref = f.frame(south).zones.bag.table.tiles[0].ref;
    const result = await f.dispatch(south, "draft", { tileId: ref });
    if (result.kind !== "accept")
      throw new Error("Expected accepted tile prefix");
    const shuffled: ReducerSessionState = structuredClone(result.state);
    const table = f.model.contract.manifest.tableSchema.parse(
      shuffled.domain.table,
    );
    table.zones.bag.table = ["b", "a", "omitted"];
    shuffled.domain.table = RuntimeJsonSchema.parse(table);
    const frame = f.frame(south, { ...referenceBasis, version: 3 }, shuffled);
    const draft = frame.availableInteractions.find(
      (descriptor) => descriptor.interactionId === "draft",
    );
    expect(draft?.step?.selected.tileId).toBeUndefined();
  });
  it("invalidates a concealed prefix after any other acceptance even when hidden order is unchanged", async () => {
    const f = await fixture();
    const ref = f.frame(south).zones.bag.table.tiles[0].ref;
    const prefix = await f.dispatch(south, "draft", { tileId: ref });
    if (prefix.kind !== "accept")
      throw new Error("Expected accepted tile prefix");
    const quiet = await f.dispatch(
      north,
      "quiet",
      {},
      undefined,
      { ...referenceBasis, version: 2 },
      prefix.state,
    );
    if (quiet.kind !== "accept")
      throw new Error("Expected accepted quiet action");
    const frame = f.frame(
      south,
      { ...referenceBasis, version: 3 },
      quiet.state,
    );
    const draft = frame.availableInteractions.find(
      (descriptor) => descriptor.interactionId === "draft",
    );
    expect(draft?.step?.selected.tileId).toBeUndefined();
    expect(quiet.state.runtime.pending[south]).toBeUndefined();
  });
  it("expires an earlier concealed prefix even when another acceptance reveals its face", async () => {
    const f = await fixture();
    const ref = f.frame(south).zones.bag.table.tiles[0].ref;
    const prefix = await f.dispatch(south, "draft", { tileId: ref });
    if (prefix.kind !== "accept") throw new Error("Expected accepted prefix");
    const revealed = await f.dispatch(
      north,
      "reveal",
      {},
      undefined,
      { ...referenceBasis, version: 2 },
      prefix.state,
    );
    if (revealed.kind !== "accept") throw new Error("Expected accepted reveal");
    const frame = f.frame(
      south,
      { ...referenceBasis, version: 3 },
      revealed.state,
    );
    expect(frame.zones.public.table.tiles[0].disclosure).toBe("visible");
    expect(
      frame.availableInteractions.find((d) => d.interactionId === "draft")?.step
        ?.selected.tileId,
    ).toBeUndefined();
    expect(revealed.state.runtime.pending[south]).toBeUndefined();
  });
  it("refreshes the concealed prefix basis on its own accepted extension", async () => {
    const f = await fixture();
    const ref = f.frame(south).zones.bag.table.tiles[0].ref;
    const prefix = await f.dispatch(south, "draft", { tileId: ref });
    if (prefix.kind !== "accept")
      throw new Error("Expected accepted tile prefix");
    const extension = await f.dispatch(
      south,
      "draft",
      { confirm: "yes" },
      undefined,
      { ...referenceBasis, version: 2 },
      prefix.state,
    );
    if (extension.kind !== "accept")
      throw new Error("Expected accepted draft extension");
    const frame = f.frame(
      south,
      { ...referenceBasis, version: 3 },
      extension.state,
    );
    const draft = frame.availableInteractions.find(
      (descriptor) => descriptor.interactionId === "draft",
    );
    expect(draft?.step?.selected).toEqual({
      tileId: frame.zones.bag.table.tiles[0].ref,
      confirm: "yes",
    });
    expect(extension.state.runtime.pending[south]?.concealedBasis).toEqual({
      ...referenceBasis,
      version: 3,
    });
  });
  it("expires hidden tracking even when a private reorder returns to the original order", async () => {
    const f = await fixture();
    const ref = f.frame(south).zones.bag.table.tiles[0].ref;
    const prefix = await f.dispatch(south, "draft", { tileId: ref });
    if (prefix.kind !== "accept")
      throw new Error("Expected accepted tile prefix");
    const reordered = await f.dispatch(
      north,
      "reorderRoundTrip",
      {},
      undefined,
      { ...referenceBasis, version: 2 },
      prefix.state,
    );
    if (reordered.kind !== "accept")
      throw new Error("Expected accepted private reorder");
    const table = f.model.contract.manifest.tableSchema.parse(
      reordered.state.domain.table,
    );
    expect(table.zones.bag.table).toEqual(["a", "b", "omitted"]);
    const frame = f.frame(
      south,
      { ...referenceBasis, version: 3 },
      reordered.state,
    );
    const draft = frame.availableInteractions.find(
      (descriptor) => descriptor.interactionId === "draft",
    );
    expect(draft?.step?.selected.tileId).toBeUndefined();
    expect(reordered.state.runtime.pending[south]).toBeUndefined();
  });
});

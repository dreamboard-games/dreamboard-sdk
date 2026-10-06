import { compileManifest } from "../manifest/compiler.js";
import {
  testReferenceBasis,
  testGameplayBasis,
} from "../../shared/__fixtures__/reference-basis.js";
import { RuntimeJsonSchema } from "../../shared/runtime-json";
import * as z from "zod";
import { describe, expect, test } from "vitest";
import { asPlayerId } from "../per-player";
import { createGame } from "../../reducer";
import {
  perPlayerInstanceId,
  parsePerPlayerInstanceId,
} from "../../shared/domain/per-player-instance";
import { createReducerTestingRuntime } from "../../testing/reducer-runtime";
import { createIngressRuntimeCodec } from "./session-codec";

const model = createGame({
  manifest: compileManifest({
    players: { minPlayers: 2, maxPlayers: 2 },
    boards: [
      {
        id: "mat",
        name: "Mat",
        layout: "generic",
        scope: "perPlayer",
        spaces: [{ id: "spot" }],
        relations: [],
      },
    ],
    cardSets: [
      {
        id: "cards",
        name: "Cards",
        cardSchema: z.object({}),
        defaultHome: { type: "zone", zoneId: "supply" },
        cards: [
          {
            id: "card",
            cardType: "card",
            name: "Card",
            count: 1,
            scope: "perPlayer",
            properties: {},
          },
        ],
      },
    ],
    dieTypes: [{ id: "d6", name: "D6", sides: 6 }],
    dieSeeds: [
      {
        id: "die",
        typeId: "d6",
        scope: "perPlayer",
        home: { type: "zone", zoneId: "supply" },
      },
    ],
    zones: [
      { id: "hold", name: "Hold", attachedTo: { pieceType: "token" } },
      {
        id: "supply",
        name: "Supply",
        scope: "perPlayer",
        visibility: "public",
      },
    ],
    pieceTypes: [{ id: "token", name: "Token" }],
    pieceSeeds: [
      {
        id: "token",
        typeId: "token",
        scope: "perPlayer",
        home: { type: "zone", zoneId: "supply" },
      },
    ],
  }),
  phases: { play: z.object({}) },
  state: { public: z.object({}), private: z.object({}), hidden: z.object({}) },
});
const definition = model.assemble({
  initial: { public: () => ({}) },
  initialPhase: "play",
  phases: {
    play: model.phase("play").define({
      kind: "player",
      actor: ({ q }) => q.player.order()[0],
      initialState: () => ({}),
      interactions: {
        transfer: model.phase("play").interaction({
          inputs: {},
          reduce({ tx, q }) {
            const [origin, recipient] = q.player.order();
            tx.setComponentOwner({
              componentId: perPlayerInstanceId("piece", "token", origin),
              ownerId: recipient,
            });
          },
        }),
      },
    }),
  },
  view: () => ({}),
});
const roster = ['crew:/"雪', "table"] as const;
const codec = createIngressRuntimeCodec(definition);

async function session() {
  const runtime = createReducerTestingRuntime(definition);
  const initialized = await runtime.initialize({
    table: RuntimeJsonSchema.parse(
      model.contract.manifest.createInitialTable({ playerIds: roster }),
    ),
    playerIds: [...roster],
  });
  return { runtime, state: initialized.state };
}

describe("replicated inventory session admission", () => {
  test("restores arbitrary roster identities and preserves ownership independently of replication origin", async () => {
    const { runtime, state } = await session();
    const id = perPlayerInstanceId("piece", "token", roster[0]);
    const initial = codec.parseState(state).domain.table;
    expect(initial.pieces[id].ownerId).toBe(roster[0]);
    expect(initial.zones.supply[asPlayerId(roster[0])]).toContain(id);
    const transferred = await runtime.dispatch({
      referenceBasis: testReferenceBasis,
      state,
      input: {
        basis: testGameplayBasis(roster[0]),
        kind: "interaction",
        playerId: roster[0],
        interactionId: "transfer",
        params: {},
      },
    });
    expect(transferred.kind).toBe("accept");
    if (transferred.kind !== "accept")
      throw new Error("Ownership transfer failed");
    const restored = codec.parseState(
      JSON.parse(JSON.stringify(transferred.state)),
    );
    expect(restored.domain.table.pieces[id].ownerId).toBe(roster[1]);
    expect(restored.domain.table.componentLocations[id]).toMatchObject({
      type: "InZone",
      zoneId: "supply",
      hostId: roster[0],
    });
    expect(parsePerPlayerInstanceId(id)?.playerId).toBe(roster[0]);
  });

  test.each(["unknown-seat", "undeclared-base"])(
    "rejects canonical %s IDs without granting membership",
    async (kind) => {
      const { state } = await session();
      const table = codec.parseState(state).domain.table;
      const forged = perPlayerInstanceId(
        "piece",
        kind === "unknown-seat" ? "token" : "other",
        kind === "unknown-seat" ? "not-seated" : roster[0],
      );
      expect(parsePerPlayerInstanceId(forged)).not.toBeNull();
      Object.assign(table.pieces, {
        [forged]: {
          id: forged,
          pieceTypeId: "token",
          properties: {},
          ownerId: roster[0],
        },
      });
      Object.assign(table.componentLocations, {
        [forged]: { type: "Detached" },
      });
      expect(() =>
        codec.parseState({ ...state, domain: { ...state.domain, table } }),
      ).toThrow();
    },
  );
  test.each(["card-owner", "piece-owner", "die-owner", "visible-to"])(
    "rejects inactive %s roster references on restore",
    async (kind) => {
      const { state } = await session();
      const table = codec.parseState(state).domain.table;
      const card = perPlayerInstanceId("card", "card", roster[0]);
      const piece = perPlayerInstanceId("piece", "token", roster[0]);
      const die = perPlayerInstanceId("die", "die", roster[0]);
      if (kind === "card-owner") table.ownerOfCard[card] = "not-seated";
      if (kind === "piece-owner") table.pieces[piece].ownerId = "not-seated";
      if (kind === "die-owner") table.dice[die].ownerId = "not-seated";
      if (kind === "visible-to")
        table.visibility[card] = { faceUp: false, visibleTo: ["not-seated"] };
      expect(() =>
        codec.parseState({ ...state, domain: { ...state.domain, table } }),
      ).toThrow();
    },
  );
  test.each(["owner", "visibility"])(
    "rejects a canonical absent card only added to the %s map",
    async (kind) => {
      const { state } = await session();
      const table = codec.parseState(state).domain.table;
      const foreign = perPlayerInstanceId("card", "card", "not-seated");
      expect(parsePerPlayerInstanceId(foreign)).not.toBeNull();
      expect(Object.hasOwn(table.cards, foreign)).toBe(false);
      if (kind === "owner")
        Object.assign(table.ownerOfCard, { [foreign]: roster[0] });
      else
        Object.assign(table.visibility, {
          [foreign]: { faceUp: false, visibleTo: [roster[0]] },
        });
      expect(() =>
        codec.parseState({ ...state, domain: { ...state.domain, table } }),
      ).toThrow();
    },
  );

  test.each(["space", "attached zone"])(
    "rejects a location on a declared %s base with an absent replication seat",
    async (kind) => {
      const { state } = await session();
      const table = codec.parseState(state).domain.table;
      const die = perPlayerInstanceId("die", "die", roster[0]);
      const host =
        kind === "space"
          ? perPlayerInstanceId("board", "mat", "not-seated")
          : perPlayerInstanceId("piece", "token", "not-seated");
      expect(parsePerPlayerInstanceId(host)).not.toBeNull();
      table.zones.supply[asPlayerId(roster[0])] = table.zones.supply[
        asPlayerId(roster[0])
      ].filter((id) => id !== die);
      Object.assign(table.componentLocations, {
        [die]:
          kind === "space"
            ? { type: "OnSpace", boardId: host, spaceId: "spot", position: 0 }
            : {
                type: "InZone",
                zoneId: "hold",
                hostId: host,
                playedBy: null,
              },
      });
      expect(() =>
        codec.parseState({ ...state, domain: { ...state.domain, table } }),
      ).toThrow();
    },
  );
  test("initial admission rejects conflicting, empty and duplicate supplied rosters", async () => {
    const { state } = await session();
    const table = codec.parseState(state).domain.table;
    expect(() => codec.parseInitialTable(table, [...roster].reverse())).toThrow(
      "disagrees",
    );
    expect(() => codec.parseInitialTable(table, [])).toThrow(
      "must not be empty",
    );
    expect(() =>
      codec.parseInitialTable(table, [roster[0], roster[0]]),
    ).toThrow("Duplicate player id");
    expect(codec.parseInitialTable(table, undefined).playerIds).toEqual(roster);
  });

  test.each([
    { playerOrder: [] },
    { playerOrder: [roster[0]] },
    { playerOrder: [...roster, "third"] },
    { playerOrder: [roster[0], roster[0]] },
  ])(
    "restored session admission rejects invalid roster %j",
    async ({ playerOrder }) => {
      const { state } = await session();
      const table = codec.parseState(state).domain.table;
      expect(() =>
        codec.parseState({
          ...state,
          domain: { ...state.domain, table: { ...table, playerOrder } },
        }),
      ).toThrow(/session roster|Duplicate player id/);
    },
  );
  test.each([{ playerIds: ["constructor", "toString"] }])(
    "initializes and restores hostile but valid roster keys $playerIds",
    async ({ playerIds }) => {
      const table = model.contract.manifest.createInitialTable({ playerIds });
      const runtime = createReducerTestingRuntime(definition);
      const initialized = await runtime.initialize({
        table: RuntimeJsonSchema.parse(table),
        playerIds,
      });
      const restored = codec.parseState(
        JSON.parse(JSON.stringify(initialized.state)),
      ).domain.table;
      expect(restored.playerOrder).toEqual(playerIds);
      for (const rawPlayerId of playerIds) {
        const playerId = asPlayerId(rawPlayerId);
        const piece = perPlayerInstanceId("piece", "token", playerId);
        expect(Object.hasOwn(restored.zones.supply, playerId)).toBe(true);
        expect(restored.zones.supply[playerId]).toContain(piece);
        expect(Object.hasOwn(restored.resources, playerId)).toBe(true);
        expect(restored.resources[playerId]).toEqual({});
        expect(restored.pieces[piece].ownerId).toBe(playerId);
      }
    },
  );

  test("rejects __proto__ live roster keys at initialization and restore", async () => {
    expect(() =>
      codec.parseInitialTable(
        model.contract.manifest.createInitialTable({ playerIds: roster }),
        ["__proto__", "constructor"],
      ),
    ).toThrow("__proto__");
    const { state } = await session();
    const raw = {
      ...state,
      domain: {
        ...state.domain,
        table: RuntimeJsonSchema.parse({
          ...model.contract.manifest.tableSchema.parse(state.domain.table),
          playerOrder: ["__proto__", "constructor"],
        }),
      },
    };
    expect(() => codec.parseState(raw)).toThrow("__proto__");
  });

  test.each([
    "activePlayers",
    "privateState",
    "pending",
    "actors",
    "submissions",
  ])("rejects absent roster references in %s", async (surface) => {
    const { state } = await session();
    const raw = {
      ...state,
      domain: {
        ...state.domain,
        flow: {
          ...state.domain.flow,
          activePlayers:
            surface === "activePlayers"
              ? ["absent"]
              : state.domain.flow.activePlayers,
        },
        privateState:
          surface === "privateState"
            ? { ...state.domain.privateState, absent: {} }
            : state.domain.privateState,
      },
      runtime: {
        ...state.runtime,
        pending:
          surface === "pending"
            ? {
                ...state.runtime.pending,
                absent: {
                  phaseName: "play",
                  interactionId: "transfer",
                  values: [{}],
                },
              }
            : state.runtime.pending,
        simultaneous:
          surface === "actors" || surface === "submissions"
            ? {
                current: {
                  phaseName: "play",
                  actors: surface === "actors" ? ["absent"] : [],
                  submissions:
                    surface === "submissions"
                      ? { absent: { interactionId: "transfer", params: {} } }
                      : {},
                },
              }
            : state.runtime.simultaneous,
      },
    };
    expect(() => codec.parseState(raw)).toThrow("unknown session player");
  });
  test("requires own private state for constructor instead of inherited prototype values", async () => {
    const playerIds = ["constructor", "toString"];
    const runtime = createReducerTestingRuntime(definition);
    const { state } = await runtime.initialize({
      table: RuntimeJsonSchema.parse(
        model.contract.manifest.createInitialTable({ playerIds }),
      ),
      playerIds,
    });
    expect(() =>
      codec.parseState({
        ...state,
        domain: { ...state.domain, privateState: { toString: {} } },
      }),
    ).toThrow("missing private state");
  });
  test.each(["InSlot", "InContainer"])(
    "rejects the removed %s checkpoint location",
    async (type) => {
      const { state } = await session();
      const table = model.contract.manifest.tableSchema.parse(
        state.domain.table,
      );
      const piece = perPlayerInstanceId("piece", "token", roster[0]);
      Object.assign(table.componentLocations, {
        [piece]:
          type === "InSlot"
            ? {
                type,
                host: { kind: "piece", id: piece },
                slotId: "hold",
                position: 0,
              }
            : { type, boardId: "mat", containerId: "hold", position: 0 },
      });
      expect(() =>
        codec.parseState({ ...state, domain: { ...state.domain, table } }),
      ).toThrow("componentLocations");
    },
  );
});

import { createGame } from "@dreamboard-games/sdk/reducer";
import { z } from "zod";

const triangleIds = Array.from(
  { length: 12 },
  (_, index) => `triangle-${index + 1}`,
);
const down = [
  [1, -3],
  [-1, -1],
  [1, -1],
  [-3, 1],
  [-1, 1],
  [1, 1],
] as const;
const up = [
  [0, -3],
  [3, -3],
  [-2, -1],
  [3, -1],
  [-2, 2],
  [0, 2],
] as const;
const slots = [
  ...down.map(([q, r]) => ({
    turn: 0,
    cells: [
      { q, r },
      { q: q + 1, r },
      { q, r: r + 1 },
    ],
  })),
  ...up.map(([q, r]) => ({
    turn: 1,
    cells: [
      { q, r },
      { q, r: r + 1 },
      { q: q - 1, r: r + 1 },
    ],
  })),
];
const model = createGame({
  manifest: {
    players: { minPlayers: 1, maxPlayers: 1 },
    cardSets: [],
    zones: [],
    boards: [
      {
        id: "map",
        name: "Tri-hex island",
        scope: "shared",
        layout: "hex",
        orientation: "pointy",
      },
    ],
    tileTypes: [
      {
        id: "centre",
        name: "Centre",
        layout: "hex",
        cellFieldsSchema: z.object({ terrain: z.string() }),
        cells: [{ id: "a", at: { q: 0, r: 0 }, fields: { terrain: "centre" } }],
      },
      {
        id: "triangle",
        name: "Three-cell tile",
        layout: "hex",
        cellFieldsSchema: z.object({ terrain: z.string() }),
        cells: [
          { id: "a", at: { q: 0, r: 0 }, fields: { terrain: "forest" } },
          { id: "b", at: { q: 1, r: 0 }, fields: { terrain: "hills" } },
          { id: "c", at: { q: 0, r: 1 }, fields: { terrain: "lake" } },
        ],
      },
    ],
    tileSeeds: [
      {
        id: "centre",
        typeId: "centre",
        home: {
          type: "board",
          boardId: "map",
          layout: "hex",
          q: 0,
          r: 0,
          rotation: 0,
        },
      },
      ...triangleIds.map((id) => ({ id, typeId: "triangle" as const })),
    ],
  },
  state: {
    public: z.object({ selectedCount: z.number() }),
    private: z.object({}),
    hidden: z.object({}),
  },
  phases: { play: z.object({}) },
});
const play = model.phase("play");
export const triHexGame = model.assemble({
  initial: { public: () => ({ selectedCount: 0 }) },
  initialPhase: "play",
  phases: {
    play: play.define({
      kind: "player",
      initialState: () => ({}),
      enter({ tx, random, state }) {
        const order = random.subset({
          from: triangleIds,
          count: triangleIds.length,
        });
        slots.forEach((slot, index) => {
          const k = random.integer({ minInclusive: 0, maxInclusive: 2 });
          const rotation =
            slot.turn === 0 ? ([0, 2, 4] as const)[k] : ([1, 3, 5] as const)[k];
          tx.placeTile({
            boardId: "map",
            tileId: order[index],
            at: { ...slot.cells[k], rotation },
          });
        });
        tx.setActivePlayers(state.table.playerOrder);
      },
      interactions: {
        choose: play.interaction({
          commit: { mode: "autoWhenReady" },
          inputs: { space: play.inputs.board.space({ boardId: "map" }) },
          reduce({ tx, state }) {
            tx.patchPublicState({
              selectedCount: state.publicState.selectedCount + 1,
            });
          },
        }),
      },
    }),
  },
  view: model.view(({ state }) => ({
    selectedCount: state.publicState.selectedCount,
  })),
});

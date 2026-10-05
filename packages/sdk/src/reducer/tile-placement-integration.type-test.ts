import * as z from "zod";
import { createGame } from "../reducer.js";
const model = createGame({
  manifest: {
    players: { minPlayers: 1, maxPlayers: 1 },
    cardSets: [],
    boards: [
      { id: "hex", name: "Hex", scope: "shared", layout: "hex" },
      { id: "square", name: "Square", scope: "shared", layout: "square" },
      {
        id: "track",
        name: "Track",
        scope: "shared",
        layout: "generic",
        spaces: [{ id: "slot" }],
      },
    ],
    tileTypes: [
      {
        id: "hexFace",
        name: "Hex",
        layout: "hex",
        cells: [{ id: "cell", at: { q: 0, r: 0 } }],
      },
      {
        id: "squareFace",
        name: "Square",
        layout: "square",
        cells: [{ id: "cell", at: { col: 0, row: 0 } }],
      },
    ],
    tileSeeds: [
      { id: "hexTile", typeId: "hexFace" },
      { id: "squareTile", typeId: "squareFace" },
    ],
  },
  phases: { play: z.object({}) },
  state: { public: z.object({}), private: z.object({}), hidden: z.object({}) },
});
model.phase("play").interaction({
  inputs: {},
  reduce({ tx }) {
    tx.placeTile({
      boardId: "hex",
      tileId: "hexTile",
      at: { q: 0, r: 0, rotation: 5 },
    });
    tx.placeTile({
      boardId: "square",
      tileId: "squareTile",
      at: { col: 0, row: 0, rotation: 3 },
    });
    tx.placeTile({
      boardId: "hex",
      // @ts-expect-error Square inventory cannot be placed on a hex board.
      tileId: "squareTile",
      at: { q: 0, r: 0, rotation: 0 },
    });
    tx.placeTile({
      boardId: "hex",
      tileId: "hexTile",
      // @ts-expect-error Hex placement requires axial coordinates.
      at: { col: 0, row: 0, rotation: 0 },
    });
    tx.placeTile({
      boardId: "square",
      tileId: "squareTile",
      // @ts-expect-error Square rotations stop at three.
      at: { col: 0, row: 0, rotation: 5 },
    });
    tx.placeTile({
      // @ts-expect-error Generic boards cannot accept tile placements.
      boardId: "track",
      // @ts-expect-error No compatible inventory exists for a generic board.
      tileId: "hexTile",
      at: { q: 0, r: 0, rotation: 0 },
    });
    tx.removeTile({
      boardId: "hex",
      // @ts-expect-error Removal retains the board-compatible inventory family.
      tileId: "squareTile",
    });
  },
});

import { z } from "zod";
import { createGame, perPlayerInstanceId } from "../reducer.js";
import { boardSpaceHostId } from "../shared/domain/board-space-host.js";
import type { GameInstance } from "./model.js";

declare const game: GameInstance<unknown>;

game.zones.get("discard", "table");
game.zones.find("hand", "alice");
// A player can be named "table"; the caller supplies the intended host explicitly.
game.zones.get("hand", "table");
// @ts-expect-error A zone ID alone cannot identify one host instance.
game.zones.get("hand");
// @ts-expect-error Optional lookup still requires an explicit host identity.
game.zones.find("hand");

const card = game.cards.get("ace");
const host: string = card.hostId;
void host;

const model = createGame({
  manifest: {
    players: { minPlayers: 2, maxPlayers: 2 },
    cardSets: [],
    boards: [
      {
        id: "mat",
        name: "Mat",
        scope: "perPlayer",
        layout: "generic",
        spaces: [{ id: "cell" }],
        relations: [],
      },
    ],
    pieceTypes: [{ id: "ship", name: "Ship" }],
    pieceSeeds: [{ id: "vessel", typeId: "ship" }],
    dieTypes: [{ id: "d6", name: "D6", sides: 6 }],
    dieSeeds: [{ id: "die", typeId: "d6" }],
    zones: [
      {
        id: "board-cargo",
        name: "Board cargo",
        attachedTo: { board: "mat" },
        visibility: "public",
      },
      {
        id: "cell-cargo",
        name: "Cell cargo",
        attachedTo: { board: "mat", space: "cell" },
        visibility: "public",
      },
      {
        id: "ship-cargo",
        name: "Ship cargo",
        attachedTo: { pieceType: "ship" },
        visibility: "public",
      },
      {
        id: "die-cargo",
        name: "Die cargo",
        attachedTo: { dieType: "d6" },
        visibility: "public",
      },
    ],
  },
  phases: { play: z.object({}) },
  state: { public: z.object({}), private: z.object({}), hidden: z.object({}) },
});
const play = model.phase("play");
const attachedGame = model.assemble({
  initialPhase: "play",
  phases: {
    play: play.define({
      kind: "player",
      initialState: () => ({}),
      interactions: {},
    }),
  },
  view: model.view(() => ({})),
});
declare const attached: GameInstance<typeof attachedGame>;
const board = perPlayerInstanceId("board", "mat", "alice");
attached.zones.get("board-cargo", board);
attached.zones.get("cell-cargo", boardSpaceHostId(board, "cell"));
attached.zones.get("ship-cargo", "vessel");
attached.zones.get("die-cargo", "die");
// @ts-expect-error Authored board bases do not identify runtime hosts.
attached.zones.get("board-cargo", "mat");
// @ts-expect-error A board is not a board-space host.
attached.zones.get("cell-cargo", board);
// @ts-expect-error Piece and die attachments retain their exact host families.
attached.zones.get("ship-cargo", "die");
// @ts-expect-error A component host is not a player ID.
attached.zones.get("die-cargo", "alice");

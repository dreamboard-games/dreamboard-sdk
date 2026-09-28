import { z } from "zod";
import { boardRefSchema, asPlayerId, type PlayerId } from "../src/reducer.js";

const broad = boardRefSchema().parse({ baseId: "other" });
const base: string = broad.baseId;
// @ts-expect-error No runtime schema witnesses the requested literal.
boardRefSchema<"main">();
// @ts-expect-error Broad parsing must not manufacture a literal.
const wrong: "main" = broad.baseId;
const board = boardRefSchema({ baseIdSchema: z.literal("main") });
const id: "main" = board.parse({ baseId: "main" }).baseId;
const player = boardRefSchema({
  playerIdSchema: z.literal("seat").transform(asPlayerId),
});
const seat: PlayerId | undefined = player.parse({
  baseId: "any",
  seat: "seat",
}).seat;
void [base, wrong, id, seat];

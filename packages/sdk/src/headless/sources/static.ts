import { createStore } from "@tanstack/store";
import { z } from "zod";
import {
  SeatFrameSchema,
  PluginPlayerSummarySchema,
} from "../../shared/protocol/schema.js";
import { immutableCopy } from "./immutable.js";
import type { GameSource, SourceSnapshot, SourceState } from "./types.js";

const snapshotSchema = z
  .object({
    me: z.string().min(1),
    players: z.array(PluginPlayerSummarySchema),
    frame: SeatFrameSchema,
    version: z.number().int().nonnegative(),
  })
  .strict();

/** A read-only fixture source accepts the public seat snapshot, never wire basis. */
export function staticSource(input: SourceSnapshot): GameSource {
  const snapshot = immutableCopy(snapshotSchema.parse(input));
  if (!snapshot.players.some((player) => player.playerId === snapshot.me))
    throw new Error("Gameplay seat is absent from session.");
  const store = createStore<SourceState>({
    snapshot,
    connection: "ready",
    request: null,
  });
  return {
    store: {
      get: () => store.get(),
      subscribe: (listener) => store.subscribe(listener),
    },
    dispose() {
      store.setState((state) => ({ ...state, connection: "closed" }));
    },
  };
}

import type { PluginGameplayFrame } from "../../../shared/protocol/frame.js";
export const session = {
  sessionId: "11111111-1111-4111-8111-111111111111",
  players: [{ playerId: "alice", displayName: "Alice" }],
};
export const frame = (
  version = 1,
  playerId = "alice",
): PluginGameplayFrame => ({
  basis: {
    version,
    perspectivePlayerId: playerId,
    actionSetVersion: `actions-${version}`,
  },
  events: [],
  view: { score: version },
  flow: {
    currentPhase: "play",

    activePlayers: ["alice"],
    simultaneousPhase: null,
  },
  availableInteractions: [],
  zones: {},
});

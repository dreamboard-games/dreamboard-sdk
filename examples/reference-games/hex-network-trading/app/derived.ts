/**
 * Derived projections for Frontier Trails. These are the canonical source for values
 * that are pure functions of stored state — colonies, trails, played
 * scouts, Renown charter cards. Do NOT mirror these back into `publicState`.
 *
 * Use `derived(...)` from reducer helpers or view context to resolve them.
 * Memoized per engine tick / view projection.
 */

import { defineDerived } from "@dreamboard-games/sdk/reducer";
import type { GameContract } from "./game-contract";
import {
  idGuards,
  literals,
  type PlayerId,
  type ResourceId,
} from "../shared/manifest-contract";
import type { PortType } from "./game-contract";
import {
  EXPLORER_GUILD_MIN,
  RENOWN_TARGET,
  TRADE_NETWORK_MIN,
  coloniesByVertexId,
  computeTradeNetwork,
  trailsByEdgeId,
} from "./reducer-support";

export type TradeNetwork = {
  readonly ownerPlayerId: PlayerId | null;
  readonly length: number;
};

export type ExplorerGuild = {
  readonly ownerPlayerId: PlayerId | null;
  readonly size: number;
};

/**
 * Port type per board vertex, derived from shuffled public relay assignments.
 *
 * Relay locations are authored as explicit rim edges in the manifest;
 * the assigned port types are shuffled into `publicState.portsByEdgeId` at
 * game start. An camp/town on either endpoint of that relay edge gets
 * the trade rate.
 */
export const portsByVertex = defineDerived<GameContract>()({
  name: "portsByVertex",
  compute: ({ state, q }): Readonly<Record<string, PortType>> => {
    const out: Record<string, PortType> = {};
    for (const [edgeId, portType] of Object.entries(
      state.publicState.portsByEdgeId,
    )) {
      const typedEdgeId = idGuards.expectEdgeId(edgeId);
      for (const vertexId of q.board.incidentVertices(
        "frontier",
        typedEdgeId,
      )) {
        out[vertexId] = portType;
      }
    }
    return out;
  },
});

/**
 * Longest continuous trail across all players. Owner is the first player to
 * reach or exceed `TRADE_NETWORK_MIN`, and only transfers when another
 * player strictly exceeds the current length.
 *
 * Note: ownership "stickiness" is inherent to the full state history, but
 * a pure derivation can only resolve it from the current snapshot. We
 * emit the player with the strict maximum length that meets the minimum;
 * if nobody qualifies, owner is `null`.
 */
export const tradeNetwork = defineDerived<GameContract>()({
  name: "tradeNetwork",
  compute: ({ state, q }): TradeNetwork => {
    const buildings = coloniesByVertexId(state, q);
    const trails = trailsByEdgeId(state, q);

    const edgeToVertices: Record<string, [string, string]> = {};
    const vertexToEdges: Record<string, string[]> = {};

    for (const edgeId of literals.edgeIds) {
      const vertices = q.board.incidentVertices("frontier", edgeId);
      if (vertices.length >= 2) {
        edgeToVertices[edgeId] = [vertices[0]!, vertices[1]!];
        for (const v of vertices) {
          if (!vertexToEdges[v]) vertexToEdges[v] = [];
          vertexToEdges[v]!.push(edgeId);
        }
      }
    }

    let ownerPlayerId: PlayerId | null = null;
    let length = 0;

    for (const pid of q.player.order()) {
      const playerEdges = new Set(
        Object.entries(trails)
          .filter(([, r]) => r?.ownerId === pid)
          .map(([e]) => e),
      );
      const len = computeTradeNetwork(
        playerEdges,
        edgeToVertices,
        vertexToEdges,
        buildings,
        pid,
      );
      if (len >= TRADE_NETWORK_MIN && len > length) {
        ownerPlayerId = pid;
        length = len;
      }
    }

    return { ownerPlayerId, length };
  },
});

/**
 * Largest-army holder. Derived from `publicState.scoutsDeployed`, which
 * remains the canonical input (incremented when a scout card is played).
 */
export const explorerGuild = defineDerived<GameContract>()({
  name: "explorerGuild",
  compute: ({ state, q }): ExplorerGuild => {
    const pub = state.publicState;
    let ownerPlayerId: PlayerId | null = null;
    let size = 0;
    for (const pid of q.player.order()) {
      const scouts = pub.scoutsDeployed[pid] ?? 0;
      if (scouts >= EXPLORER_GUILD_MIN && scouts > size) {
        ownerPlayerId = pid;
        size = scouts;
      }
    }
    return { ownerPlayerId, size };
  },
});

/**
 * Public Renown per player — buildings + trade network + explorer guild.
 * Does NOT include hidden landmark charter cards; those are only shown to
 * their owner.
 */
export const publicInfluenceByPlayer = defineDerived<GameContract>()({
  name: "publicInfluenceByPlayer",
  compute: ({ state, q, derived }) => {
    const pub = state.publicState;
    const buildings = coloniesByVertexId(state, q);
    const lr = derived(tradeNetwork);
    const la = derived(explorerGuild);
    const out: Partial<Record<PlayerId, number>> = {};
    for (const pid of q.player.order()) {
      let influence = 0;
      for (const b of Object.values(buildings)) {
        if (!b) continue;
        if (b.ownerId === pid) influence += b.kind === "town" ? 2 : 1;
      }
      if (lr.ownerPlayerId === pid) influence += 2;
      if (la.ownerPlayerId === pid) influence += 2;
      out[pid] = influence;
    }
    return out;
  },
});

/**
 * Compute best bank-trade rates per resource for a player.
 *
 * `4` is the default, `3` with a generic (3:1) port, `2` with a
 * matching-resource port. Intersects the player's camp/town
 * vertices against the derived `portsByVertex` map.
 *
 * Exported as a plain helper (not a `defineDerived(...)`) because the
 * rates depend on the *viewing* player id, which is not part of the
 * derived-cache key. The view calls this once per projection using the
 * shared, cached `portsByVertex` derivation for the port map.
 */
export function computeBankTradeRates(
  coloniesByVertexId: Readonly<
    Record<string, { readonly ownerId: PlayerId } | undefined>
  >,
  portsByVertexId: Readonly<Record<string, PortType>>,
  playerId: PlayerId,
): Record<ResourceId, number> {
  const rates: Record<ResourceId, number> = {
    clay: 4,
    grain: 4,
    timber: 4,
    iron: 4,
    cloth: 4,
  };
  for (const [vertexId, colony] of Object.entries(coloniesByVertexId)) {
    if (!colony || colony.ownerId !== playerId) continue;
    const portType = portsByVertexId[vertexId];
    if (!portType) continue;
    if (portType === "3:1") {
      for (const r of literals.resourceIds) rates[r] = Math.min(rates[r], 3);
    } else if ((literals.resourceIds as readonly string[]).includes(portType)) {
      const r = portType as ResourceId;
      rates[r] = Math.min(rates[r], 2);
    }
  }
  return rates;
}

/**
 * Winner detection. Returns the first player in turn order whose total
 * Renown (public + hidden) meets `RENOWN_TARGET`, or `null`.
 *
 * Note: hidden Renown charter cards are in `publicState.landmarkCards` (counts, not
 * card IDs), so they participate in winner detection even though they
 * are not revealed in the public projection.
 */
export const winnerOf = defineDerived<GameContract>()({
  name: "winnerOf",
  compute: ({ state, q, derived }): PlayerId | null => {
    const pub = state.publicState;
    const publicVp = derived(publicInfluenceByPlayer);
    for (const pid of q.player.order()) {
      const total = (publicVp[pid] ?? 0) + (pub.landmarkCards[pid] ?? 0);
      if (total >= RENOWN_TARGET) return pid;
    }
    return null;
  },
});

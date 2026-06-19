import { playerTurn } from "../../authoring";
import {
  COST_HUB,
  COST_ROUTE,
  COST_OUTPOST,
  edit,
  findDetachedPieces,
  campPieceAt,
} from "../../reducer-support";
import {
  buildTrailTarget,
  buildCampTarget,
  upgradeToTownTarget,
} from "../../eligibility";
import type { EdgeId, VertexId } from "../../../shared/manifest-contract";
import { diceRolledRule } from "./action-rules";

// ── Build Trail ───────────────────────────────────────────────────────────────

export const buildTrail = playerTurn.interaction({
  inputs: {
    edgeId: playerTurn.inputs.board.edge<EdgeId>({
      target: buildTrailTarget,
    }),
  },
  rules: [
    diceRolledRule,
    {
      id: "can-afford-trail",
      errorCode: "INSUFFICIENT_RESOURCES",
      validate: ({ input, q }) =>
        q.player.canAfford(input.playerId, COST_ROUTE)
          ? true
          : "Need 1 timber + 1 clay.",
    },
  ],
  reduce({ state, input, accept, q }) {
    const [trailId] = findDetachedPieces(state, input.playerId, "trail", 1);
    const tx = edit(state);
    tx.spendResources({ playerId: input.playerId, amounts: COST_ROUTE });
    tx.moveComponentToEdge({
      componentId: trailId,
      boardId: "frontier",
      edgeId: input.params.edgeId,
    });
    return accept(tx.state);
  },
});

// ── Build Camp ─────────────────────────────────────────────────────────

export const buildCamp = playerTurn.interaction({
  inputs: {
    vertexId: playerTurn.inputs.board.vertex<VertexId>({
      target: buildCampTarget,
    }),
  },
  rules: [
    diceRolledRule,
    {
      id: "can-afford-camp",
      errorCode: "INSUFFICIENT_RESOURCES",
      validate: ({ input, q }) =>
        q.player.canAfford(input.playerId, COST_OUTPOST)
          ? true
          : "Need 1 timber + 1 clay + 1 grain + 1 cloth.",
    },
  ],
  reduce({ state, input, accept, q }) {
    const [campId] = findDetachedPieces(state, input.playerId, "camp", 1);
    const tx = edit(state);
    tx.spendResources({
      playerId: input.playerId,
      amounts: COST_OUTPOST,
    });
    tx.moveComponentToVertex({
      componentId: campId,
      boardId: "frontier",
      vertexId: input.params.vertexId,
    });
    return accept(tx.state);
  },
});

// ── Upgrade to Town ──────────────────────────────────────────────────────────

export const upgradeToTown = playerTurn.interaction({
  inputs: {
    vertexId: playerTurn.inputs.board.vertex<VertexId>({
      target: upgradeToTownTarget,
    }),
  },
  rules: [
    diceRolledRule,
    {
      id: "can-afford-town",
      errorCode: "INSUFFICIENT_RESOURCES",
      validate: ({ input, q }) =>
        q.player.canAfford(input.playerId, COST_HUB)
          ? true
          : "Need 2 grain + 3 iron.",
    },
  ],
  reduce({ state, input, accept, q }) {
    const campId = campPieceAt(state, q, input.params.vertexId, input.playerId);
    if (!campId) {
      throw new Error("No camp piece found to upgrade.");
    }
    const [townId] = findDetachedPieces(state, input.playerId, "town", 1);
    const tx = edit(state);
    tx.spendResources({ playerId: input.playerId, amounts: COST_HUB });
    tx.moveComponentToDetached({ componentId: campId });
    tx.moveComponentToVertex({
      componentId: townId,
      boardId: "frontier",
      vertexId: input.params.vertexId,
    });
    return accept(tx.state);
  },
});

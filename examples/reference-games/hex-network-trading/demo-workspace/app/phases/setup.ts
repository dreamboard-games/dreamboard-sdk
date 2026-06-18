import { authoring } from "../authoring";
import { edit, findDetachedPieces, TERRAIN_RESOURCE } from "../reducer-support";
import { setupTrailTarget, setupCampTarget } from "../eligibility";
import { randomBoardSetup } from "../board-randomization";
import {
  idGuards,
  literals,
  type EdgeId,
  type VertexId,
} from "../../shared/manifest-contract";

const setupAuthoring = authoring.phase("setup");

// ── Place a camp during setup ───────────────────────────────────────────────
//
const placeSetupCamp = setupAuthoring.interaction({
  inputs: {
    vertexId: setupAuthoring.inputs.board.vertex<VertexId>({
      target: setupCampTarget,
    }),
  },
  reduce({ state, input, accept, q }) {
    const { vertexId } = input.params;
    const [campId] = findDetachedPieces(state, input.playerId, "camp", 1);
    const tx = edit(state);
    tx.moveComponentToVertex({
      componentId: campId,
      boardId: "frontier",
      vertexId,
    });
    tx.patchPhaseState({
      step: "trail",
      placedCamp: true,
      lastCampVertexId: vertexId,
    });
    return accept(tx.state);
  },
});

// ── Place the trail that follows the setup camp ────────────────────────────

const placeSetupTrail = setupAuthoring.interaction({
  inputs: {
    edgeId: setupAuthoring.inputs.board.edge<EdgeId>({
      target: setupTrailTarget,
    }),
  },
  reduce({ state, input, accept, fx, q }) {
    const { edgeId } = input.params;
    const [trailId] = findDetachedPieces(state, input.playerId, "trail", 1);

    // Snake-draft turn progression: round 0 advances forward, round 1
    // runs backward through the seating order. When we exit round 1 the
    // phase transitions to `playerTurn`.
    const turnOrder = q.player.order();
    const numPlayers = turnOrder.length;
    const { round, playerIndex, lastCampVertexId } = state.phase;

    let nextRound = round;
    let nextIndex = playerIndex;
    let goToPlayerTurn = false;

    if (round === 0) {
      if (playerIndex < numPlayers - 1) nextIndex = playerIndex + 1;
      else nextRound = 1;
    } else if (playerIndex > 0) {
      nextIndex = playerIndex - 1;
    } else {
      goToPlayerTurn = true;
    }

    const nextPlayerId = goToPlayerTurn ? turnOrder[0]! : turnOrder[nextIndex]!;

    // Second-camp resource grant: award one of each adjacent
    // terrain's resource for the camp the player placed this turn.
    // `lastCampVertexId` is recorded by `placeSetupCamp`.
    const tx = edit(state);
    if (round === 1 && lastCampVertexId) {
      const grant: Record<string, number> = {};
      for (const spaceId of literals.spaceIds) {
        const verts = q.board.spaceVertices("frontier", spaceId);
        if (!verts.some((v) => v === lastCampVertexId)) continue;
        const terrain = state.publicState.terrainBySpaceId[spaceId];
        const resource = terrain ? TERRAIN_RESOURCE[terrain] : null;
        if (resource) grant[resource] = (grant[resource] ?? 0) + 1;
      }
      if (Object.keys(grant).length > 0) {
        tx.addResources({ playerId: input.playerId, amounts: grant });
      }
    }

    tx.moveComponentToEdge({
      componentId: trailId,
      boardId: "frontier",
      edgeId,
    });

    if (goToPlayerTurn) {
      return accept(tx.state, { instructions: [fx.transition("playerTurn")] });
    }

    tx.patchPhaseState({
      round: nextRound,
      playerIndex: nextIndex,
      step: "camp",
      placedCamp: false,
      lastCampVertexId: null,
    });
    tx.setActivePlayers([nextPlayerId]);
    return accept(tx.state);
  },
});

// ── Phase ────────────────────────────────────────────────────────────────────

export const setup = setupAuthoring.stepPhase({
  kind: "player",
  steps: ["camp", "trail"],
  initialState: () => ({
    round: 0,
    playerIndex: 0,
    step: "camp" as const,
    placedCamp: false,
    lastCampVertexId: null,
  }),
  actor: ({ state, q }) => q.player.order()[state.phase.playerIndex] ?? null,
  enter({ state, accept, q, random }) {
    const boardSetup = randomBoardSetup(random);
    const badlandsSpaceId = idGuards.expectSpaceId(
      Object.entries(boardSetup.terrainBySpaceId).find(
        ([, terrain]) => terrain === "badlands",
      )?.[0] ?? literals.spaceIds[0],
    );
    const tx = edit(state);
    tx.patchPublicState(boardSetup);
    tx.moveComponentToSpace({
      componentId: "storm",
      boardId: "frontier",
      spaceId: badlandsSpaceId,
    });
    tx.setActivePlayers([q.player.order()[0]!]);
    return accept(tx.state);
  },
  interactions: {
    placeSetupCamp: {
      steps: ["camp"],
      interaction: placeSetupCamp,
    },
    placeSetupTrail: { steps: ["trail"], interaction: placeSetupTrail },
  },
});

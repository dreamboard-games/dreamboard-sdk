import {
  boardInput,
  cardInput,
  defineInteraction,
  defineInputs,
  formInput,
} from "@dreamboard-games/sdk/reducer";
import {
  placementPhaseStateSchema,
  type GameContract,
  type GameState,
} from "../../game-contract";
import {
  evaluateReassignDestination,
  reassignApprenticeTarget,
  reassignDestinationTarget,
  reassignableWorkerChoicesForPlayer,
} from "../../eligibility";
import { edit, workerOwner } from "../../reducer-support";
import {
  type CardId,
  type PieceId,
  type SpaceId,
} from "../../../shared/manifest-contract";
import {
  type ActionBoardSpaceId,
  anyBarrierActive,
  hasReassignOptionRule,
  noPendingChoiceRule,
} from "./rules";

// ── Reassign (one-shot apprentice with two board inputs) ──────────────────
//
// Reassign is the only one-shot that needs board targeting. It starts from
// the Reassign card, then asks which owned placed worker moves, then collects
// the destination space. The destination resolver is NOT re-triggered
// (rule.md: "recall... immediately re-place" — pure relocation).
export const reassign = defineInteraction<
  GameContract,
  typeof placementPhaseStateSchema
>()({
  rules: [noPendingChoiceRule, hasReassignOptionRule],
  inputs: defineInputs((input) => {
    const cardId = input.add(
      "cardId",
      cardInput<GameState, CardId, readonly ["apprentice-hand"]>({
        target: reassignApprenticeTarget,
      }),
    );
    const pieceId = input.add(
      "pieceId",
      formInput.choice<PieceId, GameState, readonly [typeof cardId]>({
        dependsOn: [cardId],
        choices: ({ state, playerId }) =>
          reassignableWorkerChoicesForPlayer(state, playerId).map((id) => {
            const location = state.publicState.workerLocations[id];
            return {
              value: id,
              label: `${id} (${location ?? "off board"})`,
            };
          }),
        defaultValue: () => undefined,
      }),
    );
    const toSpaceId = input.add(
      "toSpaceId",
      boardInput.space<GameState, SpaceId>({
        target: reassignDestinationTarget,
        dependsOn: [pieceId],
      }),
    );
    return { cardId, pieceId, toSpaceId };
  }),
  reduce({ state, input, accept, reject, q }) {
    const playerId = input.playerId;
    if (anyBarrierActive(state.phase)) {
      return reject(
        "PENDING_CHOICE_REQUIRED",
        "Resolve the pending choice first.",
      );
    }
    const hand = q.zone.playerCards(playerId, "apprentice-hand");
    if (!(hand as readonly string[]).includes("reassign")) {
      return reject(
        "REASSIGN_NOT_IN_HAND",
        "You do not hold the Reassign card.",
      );
    }

    const pieceId = input.params.pieceId as PieceId;
    const toSpaceId = input.params.toSpaceId as SpaceId;
    if (input.params.cardId !== "reassign") {
      return reject(
        "NOT_REASSIGN_CARD",
        "Choose the Reassign apprentice card.",
      );
    }
    if (workerOwner(pieceId) !== playerId) {
      return reject(
        "NOT_YOUR_WORKER",
        "You can only reassign your own workers.",
      );
    }
    const decision = evaluateReassignDestination(
      state,
      playerId,
      pieceId,
      toSpaceId,
    );
    if (!decision.ok) {
      return reject(decision.errorCode, decision.message);
    }

    const nextWorkerLocations = {
      ...state.publicState.workerLocations,
      [pieceId]: toSpaceId,
    };
    const tx = edit(state);
    // Move the SDK component to the new action-board space; the
    // destination is guaranteed an action-board id by the check above.
    tx.moveComponentToSpace({
      componentId: pieceId as PieceId,
      boardId: "action-board",
      spaceId: toSpaceId as ActionBoardSpaceId,
    });
    tx.patchPublicState({ workerLocations: nextWorkerLocations });
    tx.moveCardFromPlayerZoneToSharedZone({
      playerId,
      fromZoneId: "apprentice-hand",
      toZoneId: "apprentice-discard",
      cardId: "reassign",
    });
    // No turn advance: card-play actions do not consume a placement.
    return accept(tx.state);
  },
});

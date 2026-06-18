import { playerTurn } from "../../authoring";
import {
  defineInputs,
  many,
  type ValidationIssue,
} from "@dreamboard-games/sdk/reducer";
import {
  COST_CHARTER_CARD,
  edit,
  findDetachedPieces,
  incrementPlayerScalar,
} from "../../reducer-support";
import { buildTrailTarget, stormSpaceTarget } from "../../eligibility";
import {
  cardTypes,
  ids,
  zones,
  type CardId,
  type EdgeId,
  type PlayerId,
  type ResourceId,
  type SpaceId,
} from "../../../shared/manifest-contract";
import { stormSeizeTargetInput, resolveStormSeizeTarget } from "./inputs";
import { stealableResource } from "./dice-and-storm";
import type { PlayerTurnState } from "./turn-state";
import type { GameErrorCode } from "../../game-contract";
import {
  canBuyCharterCardRule,
  diceRolledRule,
  charterDeckNotEmptyRule,
} from "./action-rules";

const boardInput = playerTurn.inputs.board;

// ── Buy Charter Card ────────────────────────────────────────────────────────────

export const buyCharterCard = playerTurn.interaction({
  inputs: {},
  rules: [diceRolledRule, canBuyCharterCardRule, charterDeckNotEmptyRule],
  reduce({ state, input, accept }) {
    const tx = edit(state);
    tx.spendResources({
      playerId: input.playerId,
      amounts: COST_CHARTER_CARD,
    });
    tx.patchPhaseState({ charterCardBoughtThisTurn: true });
    tx.dealCardsToPlayerZone({
      fromZoneId: "charter-deck",
      playerId: input.playerId,
      toZoneId: zones.charterHand,
      count: 1,
    });
    return accept(tx.state);
  },
});

// ── Play Charter Card ───────────────────────────────────────────────────────────
//
// Charter cards are one card action per card type. Each action owns its params
// schema, while shared validation (`NOT_YOUR_TURN`, dice rolled, no
// double-play, no card bought this turn) stays in `validatePlay`.
// `playerTurn.cardAction({ cardType })` owns the right-card-type invariant.
// The common "move-to-played + mark-played" write is shared via
// `playCommon`.

function validatePlay(
  state: PlayerTurnState,
): ValidationIssue<GameErrorCode> | null {
  if (!state.phase.diceRolled) {
    return { errorCode: "MUST_ROLL_FIRST", message: "Roll dice first." };
  }
  if (state.phase.charterCardPlayedThisTurn) {
    return {
      errorCode: "ALREADY_PLAYED_CHARTER_CARD",
      message: "Already played a charter card this turn.",
    };
  }
  if (state.phase.charterCardBoughtThisTurn) {
    return {
      errorCode: "BOUGHT_THIS_TURN",
      message: "Cannot play a card bought this turn.",
    };
  }
  return null;
}

function gameIssue(
  issue: ValidationIssue<string>,
): ValidationIssue<GameErrorCode> {
  return {
    errorCode: issue.errorCode as GameErrorCode,
    message: issue.message,
  };
}

const charterCardPlayableRule = playerTurn.rule({
  id: "charter-card-playable",
  errorCode: "CHARTER_CARD_NOT_PLAYABLE",
  validate: ({ state }) => validatePlay(state),
});

function playCommon(
  tx: ReturnType<typeof edit>,
  playerId: PlayerId,
  cardId: CardId,
) {
  tx.moveCardFromPlayerZoneToSharedZone({
    playerId,
    fromZoneId: zones.charterHand,
    toZoneId: zones.charterPlayed,
    cardId,
    playedBy: playerId,
  });
  tx.patchPhaseState({ charterCardPlayedThisTurn: true });
}

export const playLandmark = playerTurn.cardAction({
  cardType: cardTypes.landmark,
  playFrom: zones.charterHand,
  rules: [charterCardPlayableRule],
  reduce({ state, input, accept }) {
    const tx = edit(state);
    playCommon(tx, input.playerId, input.params.cardId);
    tx.patchPublicState(incrementPlayerScalar("landmarkCards", input.playerId));
    return accept(tx.state);
  },
});

export const playScout = playerTurn.cardAction({
  cardType: cardTypes.scout,
  playFrom: zones.charterHand,
  inputs: defineInputs((input) => {
    const stormSpaceId = input.add(
      "stormSpaceId",
      playerTurn.inputs.board.space<SpaceId>({
        target: stormSpaceTarget,
      }),
    );
    return {
      stormSpaceId,
      stealFromPlayerId: input.add(
        "stealFromPlayerId",
        stormSeizeTargetInput(stormSpaceId),
      ),
    };
  }),
  rules: [
    charterCardPlayableRule,
    {
      id: "scout-steal-target",
      errorCode: "INVALID_STORM_SEIZE_TARGET",
      validate({ state, input, q }) {
        return resolveStormSeizeTarget(
          state,
          q,
          input.playerId,
          input.params.stealFromPlayerId,
          input.params.stormSpaceId,
        ) !== undefined
          ? null
          : {
              errorCode: "INVALID_STORM_SEIZE_TARGET",
              message: "Choose a player with a camp or town on the storm hex.",
            };
      },
    },
  ],
  reduce({ state, input, accept, q }) {
    const stealTarget =
      resolveStormSeizeTarget(
        state,
        q,
        input.playerId,
        input.params.stealFromPlayerId,
        input.params.stormSpaceId,
      ) ?? null;
    const tx = edit(state);
    playCommon(tx, input.playerId, input.params.cardId);
    tx.patchPublicState(
      incrementPlayerScalar("scoutsDeployed", input.playerId),
    );
    tx.moveComponentToSpace({
      componentId: "storm",
      boardId: "frontier",
      spaceId: input.params.stormSpaceId,
    });
    const stolen = stealableResource(q, stealTarget);
    if (stealTarget && stolen) {
      tx.transferResources({
        fromPlayerId: stealTarget,
        toPlayerId: input.playerId,
        amounts: { [stolen]: 1 },
      });
    }
    return accept(tx.state);
  },
});

export const playSurveyGrant = playerTurn.cardAction({
  cardType: cardTypes.surveyGrant,
  playFrom: zones.charterHand,
  inputs: {
    resource1: playerTurn.inputs.form.choice<ResourceId>({
      choices: "resourceMap",
      defaultValue: "timber",
    }),
    resource2: playerTurn.inputs.form.choice<ResourceId>({
      choices: "resourceMap",
      defaultValue: "clay",
    }),
  },
  rules: [charterCardPlayableRule],
  reduce({ state, input, accept }) {
    const amounts: Partial<Record<ResourceId, number>> = {};
    amounts[input.params.resource1] =
      (amounts[input.params.resource1] ?? 0) + 1;
    amounts[input.params.resource2] =
      (amounts[input.params.resource2] ?? 0) + 1;
    const tx = edit(state);
    playCommon(tx, input.playerId, input.params.cardId);
    tx.addResources({ playerId: input.playerId, amounts });
    return accept(tx.state);
  },
});

export const playClaimMarker = playerTurn.cardAction({
  cardType: cardTypes.claimMarker,
  playFrom: zones.charterHand,
  inputs: {
    resource: playerTurn.inputs.form.choice<ResourceId>({
      choices: "resourceMap",
      defaultValue: "timber",
    }),
  },
  rules: [charterCardPlayableRule],
  reduce({ state, input, accept, q }) {
    const target = input.params.resource;
    const tx = edit(state);
    playCommon(tx, input.playerId, input.params.cardId);
    for (const pid of q.player.order()) {
      if (pid === input.playerId) continue;
      const amount = q.player.resource(pid, target);
      if (amount <= 0) continue;
      tx.transferResources({
        fromPlayerId: pid,
        toPlayerId: input.playerId,
        amounts: { [target]: amount },
      });
    }
    return accept(tx.state);
  },
});

export const playShortcut = playerTurn.cardAction({
  cardType: cardTypes.shortcut,
  playFrom: zones.charterHand,
  commit: { mode: "manual" },
  inputs: {
    edgeIds: many(
      boardInput.edge<EdgeId>({
        target: buildTrailTarget,
      }),
      { count: 2, distinct: true },
    ),
  },
  rules: [
    charterCardPlayableRule,
    {
      id: "jump-gate-trail-target",
      errorCode: "INVALID_ROUTE_TARGET",
      validate({ state, input, q }) {
        const edgeIds = input.params.edgeIds ?? [];
        for (const edgeId of edgeIds) {
          const rejection = buildTrailTarget.validate(
            { state, playerId: input.playerId, q },
            edgeId,
          );
          if (rejection) {
            return gameIssue(rejection);
          }
        }
        return null;
      },
    },
    {
      id: "jump-gate-distinct-trails",
      errorCode: "DUPLICATE_ROUTE_TARGET",
      validate({ input }) {
        const edgeIds = input.params.edgeIds ?? [];
        return new Set(edgeIds).size === edgeIds.length
          ? null
          : {
              errorCode: "DUPLICATE_ROUTE_TARGET",
              message: "Choose two different trails.",
            };
      },
    },
    {
      id: "jump-gate-trail-count",
      errorCode: "INVALID_ROUTE_COUNT",
      validate({ input }) {
        const edgeIds = input.params.edgeIds;
        if (edgeIds === undefined) return null;
        return edgeIds.length === 2
          ? null
          : {
              errorCode: "INVALID_ROUTE_COUNT",
              message: "Choose exactly two trails.",
            };
      },
    },
  ],
  reduce({ state, input, accept, q }) {
    const edgeIds = input.params.edgeIds;
    const trailIds = findDetachedPieces(
      state,
      input.playerId,
      "trail",
      edgeIds.length,
    );
    const tx = edit(state);
    playCommon(tx, input.playerId, input.params.cardId);
    edgeIds.forEach((edgeId, index) => {
      tx.moveComponentToEdge({
        componentId: trailIds[index]!,
        boardId: "frontier",
        edgeId,
      });
    });
    return accept(tx.state);
  },
});

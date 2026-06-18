import { playerTurn } from "../../authoring";
import { z } from "zod";
import { countsByIdSchema, type GameState } from "../../game-contract";
import { ids, type PlayerId } from "../../../shared/manifest-contract";
import {
  openResourceMapDomain,
  otherPlayerChoices,
  ownedResourceMapDomain,
} from "./inputs";
import { edit, type Q } from "../../reducer-support";
import {
  diceRolledRule,
  noPendingTradeRule,
  noStormPendingRule,
} from "./action-rules";

const offerTradeParamsBaseSchema = z.object({
  give: countsByIdSchema,
  want: countsByIdSchema,
  targetPlayerIds: z.array(ids.playerId).min(1),
});

export const offerTradeParamsSchema = offerTradeParamsBaseSchema.superRefine(
  (params, ctx) => {
    const totalGive = Object.values(params.give).reduce<number>(
      (sum, value) => sum + (value ?? 0),
      0,
    );
    const totalWant = Object.values(params.want).reduce<number>(
      (sum, value) => sum + (value ?? 0),
      0,
    );
    if (totalGive === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["give"],
        message: "Offer at least one resource.",
      });
    }
    if (totalWant === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["want"],
        message: "Ask for at least one resource.",
      });
    }
  },
);

// ── Player-to-Player Trade ───────────────────────────────────────────────────
//
// Flow: the current player opens a pending trade targeted at selected
// captains via `offerTrade`. `respondToTrade` is actor-traild to every
// targeted captain that has not yet responded, so the form disappears for a
// player as soon as they respond and for everyone once the offerer confirms or
// cancels (clearing `pendingTrade`).

const RESPOND_TO_TRADE_CHOICES = [
  { value: "accept", label: "Accept" },
  { value: "reject", label: "Reject" },
] as const;

export const respondToTrade = playerTurn.interaction({
  inputs: {
    response: playerTurn.inputs.form.choice<"accept" | "reject">({
      choices: RESPOND_TO_TRADE_CHOICES,
      defaultValue: "reject",
    }),
  },
  actor: ({ state }) => {
    const trade = state.phase.pendingTrade;
    if (!trade) return null;
    return trade.targetPlayerIds.filter(
      (pid) =>
        !trade.acceptedBy.includes(pid) && !trade.rejectedBy.includes(pid),
    );
  },
  visibility: "actorsOnly",
  rules: [
    {
      id: "respond-pending-trade",
      errorCode: "NO_PENDING_TRADE",
      validate({ state, input, q }) {
        const trade = state.phase.pendingTrade;
        if (!trade) {
          return {
            errorCode: "NO_PENDING_TRADE",
            message: "No trade to respond to.",
          };
        }
        if (
          input.params.response === "accept" &&
          !q.player.canAfford(input.playerId, trade.want)
        ) {
          return {
            errorCode: "INSUFFICIENT_RESOURCES",
            message: "You don't have the requested resources.",
          };
        }
        return null;
      },
    },
  ],
  reduce({ state, input, accept }) {
    const trade = state.phase.pendingTrade!;
    const pendingTrade =
      input.params.response === "accept"
        ? { ...trade, acceptedBy: [...trade.acceptedBy, input.playerId] }
        : { ...trade, rejectedBy: [...trade.rejectedBy, input.playerId] };
    const tx = edit(state);
    tx.patchPhaseState({ pendingTrade });
    return accept(tx.state);
  },
});

export const offerTrade = playerTurn.interaction({
  inputs: {
    give: ownedResourceMapDomain(),
    want: openResourceMapDomain(),
    targetPlayerIds: playerTurn.inputs.form.choiceList<PlayerId>({
      choices: ({ q, playerId }) =>
        otherPlayerChoices(q as Q, playerId as PlayerId),
      min: 1,
      defaultValue: "all",
    }),
  },
  paramsSchema: offerTradeParamsSchema,
  rules: [
    diceRolledRule,
    noStormPendingRule,
    noPendingTradeRule,
    {
      id: "non-empty-trade",
      errorCode: "EMPTY_TRADE",
      validate({ input }) {
        const totalGive = Object.values(input.params.give).reduce<number>(
          (a, b) => a + (b ?? 0),
          0,
        );
        const totalWant = Object.values(input.params.want).reduce<number>(
          (a, b) => a + (b ?? 0),
          0,
        );
        return totalGive > 0 && totalWant > 0
          ? null
          : {
              errorCode: "EMPTY_TRADE",
              message: "Must give and want at least one resource.",
            };
      },
    },
    {
      id: "can-afford-offered-trade",
      errorCode: "INSUFFICIENT_RESOURCES",
      validate({ input, q }) {
        return q.player.canAfford(input.playerId, input.params.give)
          ? null
          : {
              errorCode: "INSUFFICIENT_RESOURCES",
              message: "You don't have the resources to offer.",
            };
      },
    },
    {
      id: "trade-target-not-self",
      errorCode: "CANNOT_TARGET_SELF",
      validate({ input }) {
        return input.params.targetPlayerIds.includes(input.playerId)
          ? {
              errorCode: "CANNOT_TARGET_SELF",
              message: "You cannot offer a trade to yourself.",
            }
          : null;
      },
    },
    {
      id: "known-trade-targets",
      errorCode: "UNKNOWN_TARGET",
      validate({ input, q }) {
        const turnOrder = q.player.order();
        for (const pid of input.params.targetPlayerIds) {
          if (!turnOrder.includes(pid)) {
            return {
              errorCode: "UNKNOWN_TARGET",
              message: `Unknown target captain: ${pid}.`,
            };
          }
        }
        return null;
      },
    },
    {
      id: "unique-trade-targets",
      errorCode: "DUPLICATE_TARGETS",
      validate({ input }) {
        return new Set(input.params.targetPlayerIds).size ===
          input.params.targetPlayerIds.length
          ? null
          : {
              errorCode: "DUPLICATE_TARGETS",
              message: "Target captains must be unique.",
            };
      },
    },
  ],
  reduce({ state, input, accept }) {
    const targetPlayerIds = [...input.params.targetPlayerIds];
    const tx = edit(state);
    tx.patchPhaseState({
      pendingTrade: {
        offeredBy: input.playerId,
        give: input.params.give,
        want: input.params.want,
        targetPlayerIds,
        acceptedBy: [],
        rejectedBy: [],
      },
    });
    return accept(tx.state);
  },
});

export const confirmTrade = playerTurn.interaction({
  inputs: {
    partnerId: playerTurn.inputs.form.choice<PlayerId>({
      choices: (context) => {
        const trade = (context.state as GameState).phase.get(
          "playerTurn",
        )?.pendingTrade;
        return (trade?.acceptedBy ?? []).map((pid) => ({
          value: pid,
          label: pid,
        }));
      },
      defaultValue: ({ choices }) => choices[0]?.value,
    }),
  },
  actor: ({ state }) => state.phase.pendingTrade?.offeredBy ?? null,
  visibility: "actorsOnly",
  rules: [
    {
      id: "accepted-trade-partner",
      errorCode: "NO_ACCEPTED_TRADE",
      message: "No accepted trade is available.",
      available({ state }) {
        const trade = state.phase.pendingTrade;
        return trade != null && trade.acceptedBy.length > 0;
      },
      validate({ state, input, q }) {
        const trade = state.phase.pendingTrade;
        if (!trade) {
          return {
            errorCode: "NO_PENDING_TRADE",
            message: "No trade to confirm.",
          };
        }
        if (!trade.acceptedBy.includes(input.params.partnerId)) {
          return {
            errorCode: "PARTNER_NOT_ACCEPTED",
            message: "That player has not accepted the trade.",
          };
        }
        if (!q.player.canAfford(input.playerId, trade.give)) {
          return {
            errorCode: "INSUFFICIENT_RESOURCES",
            message: "You no longer have the offered resources.",
          };
        }
        if (!q.player.canAfford(input.params.partnerId, trade.want)) {
          return {
            errorCode: "PARTNER_INSUFFICIENT",
            message: "Partner no longer has the requested resources.",
          };
        }
        return null;
      },
    },
  ],
  reduce({ state, input, accept }) {
    const trade = state.phase.pendingTrade!;
    const tx = edit(state);
    tx.transferResources({
      fromPlayerId: input.playerId,
      toPlayerId: input.params.partnerId,
      amounts: trade.give,
    });
    tx.transferResources({
      fromPlayerId: input.params.partnerId,
      toPlayerId: input.playerId,
      amounts: trade.want,
    });
    tx.patchPhaseState({ pendingTrade: null });
    return accept(tx.state);
  },
});

export const cancelTrade = playerTurn.interaction({
  inputs: {},
  actor: ({ state }) => state.phase.pendingTrade?.offeredBy ?? null,
  visibility: "actorsOnly",
  rules: [
    {
      id: "pending-trade-to-cancel",
      errorCode: "NO_PENDING_TRADE",
      message: "No trade to cancel.",
      available: ({ state }) => state.phase.pendingTrade != null,
      validate: ({ state }) =>
        state.phase.pendingTrade
          ? null
          : { errorCode: "NO_PENDING_TRADE", message: "No trade to cancel." },
    },
  ],
  reduce({ state, accept }) {
    const tx = edit(state);
    tx.patchPhaseState({ pendingTrade: null });
    return accept(tx.state);
  },
});

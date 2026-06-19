import { playerTurn } from "../../authoring";
import { coloniesByVertexId, edit } from "../../reducer-support";
import { computeBankTradeRates, portsByVertex } from "../../derived";
import { type ResourceId } from "../../../shared/manifest-contract";
import { bankTradeResourceChoices } from "./inputs";
import { canTradeWithBankRule, diceRolledRule } from "./action-rules";

// ── Trade With Bank ──────────────────────────────────────────────────────────

export const tradeWithBank = playerTurn.interaction({
  inputs: {
    giveResource: playerTurn.inputs.form.choice<ResourceId>({
      choices: bankTradeResourceChoices(),
      defaultValue: "timber",
    }),
    receiveResource: playerTurn.inputs.form.choice<ResourceId>({
      choices: "resourceMap",
      defaultValue: "clay",
    }),
  },
  rules: [
    diceRolledRule,
    canTradeWithBankRule,
    {
      id: "selected-bank-trade-resource",
      errorCode: "INSUFFICIENT_RESOURCES",
      validate({ state, input, q, derived }) {
        if (input.params.giveResource === input.params.receiveResource) {
          return {
            errorCode: "SAME_RESOURCE",
            message: "Cannot trade a resource for itself.",
          };
        }
        const rates = computeBankTradeRates(
          coloniesByVertexId(state, q),
          derived(portsByVertex),
          input.playerId,
        );
        const rate = rates[input.params.giveResource];
        if (
          q.player.resource(input.playerId, input.params.giveResource) < rate
        ) {
          return {
            errorCode: "INSUFFICIENT_RESOURCES",
            message: `Need ${rate} ${input.params.giveResource}.`,
          };
        }
        return null;
      },
    },
  ],
  reduce({ state, input, accept, q, derived }) {
    const { giveResource, receiveResource } = input.params;
    const rate = computeBankTradeRates(
      coloniesByVertexId(state, q),
      derived(portsByVertex),
      input.playerId,
    )[giveResource];
    const tx = edit(state);
    tx.spendResources({
      playerId: input.playerId,
      amounts: { [giveResource]: rate },
    });
    tx.addResources({
      playerId: input.playerId,
      amounts: { [receiveResource]: 1 },
    });
    return accept(tx.state);
  },
});

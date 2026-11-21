import type { InteractionKey } from "../../headless/model.js";
import type { PluginGameplayFrame } from "../../shared/protocol/frame.js";
import {
  BotDecisionSchema,
  BotStrategyCatalogSchema,
} from "../../shared/runtime-schema.js";
import type * as Wire from "../../shared/runtime-types.js";
import type { ReducerBundleContract } from "../../shared/worker-contract.js";
import type {
  ClientParamsOfInteractionOfDefinition,
  InteractionIdOfDefinitionPhase,
  PhaseNamesOfDefinition,
  ViewOfDefinition,
} from "../model/definition.js";

import { registeredStrategies, type DefinedBots } from "./define-bots.js";

export type BotDecision<Game> =
  | {
      [Phase in PhaseNamesOfDefinition<Game>]: {
        [Id in InteractionIdOfDefinitionPhase<Game, Phase>]: {
          interactionId: Id;
          params: ClientParamsOfInteractionOfDefinition<Game, Phase, Id>;
        };
      }[InteractionIdOfDefinitionPhase<Game, Phase>];
    }[PhaseNamesOfDefinition<Game>]
  | null;

type BotFrame<Game> = PluginGameplayFrame<
  ViewOfDefinition<Game>,
  PhaseNamesOfDefinition<Game>,
  InteractionKey<Game>
>;

/** Decide from the same perspective frame delivered to this seat's UI. */
export interface BotStrategy<Game> extends Wire.BotStrategyMetadata {
  decide(frame: BotFrame<Game>): BotDecision<Game>;
}

export function createBotCapability<Game>(
  registration: DefinedBots<Game> | undefined,
): Pick<ReducerBundleContract, "botStrategies" | "decideBot"> {
  if (!registration) return {};
  const strategies = registration[registeredStrategies];
  if (!strategies)
    throw new TypeError(
      "Register bot strategies with defineBots(game, config).",
    );
  if (!strategies.length) return {};
  const botStrategies = BotStrategyCatalogSchema.parse(
    strategies.map(({ id, name, description }) => ({ id, name, description })),
  );
  const byId = new Map(strategies.map((strategy) => [strategy.id, strategy]));
  return {
    botStrategies,
    decideBot({ strategyId, frame }) {
      const strategy = byId.get(strategyId);
      if (!strategy) throw new Error(`Unknown bot strategy '${strategyId}'.`);
      // The caller supplied the projection from this same game's bundle.
      return BotDecisionSchema.parse(strategy.decide(frame as BotFrame<Game>));
    },
  };
}

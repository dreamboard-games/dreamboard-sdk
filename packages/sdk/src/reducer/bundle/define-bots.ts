import type { InteractionKey } from "../../headless/model";
import type { InteractionDescriptor } from "../../shared/protocol/frame";
import type { BotStrategyMetadata } from "../../shared/runtime-types";
import { enumerateCombinations } from "../inputs/combinations";
import {
  validatedReducerDefinition,
  type ClientParamsOfInteractionOfDefinition,
  type InputCollectorOfDefinition,
  type InteractionIdOfDefinitionPhase,
  type InteractionSpecByNameOfDefinitionPhase,
  type PhaseNamesOfDefinition,
  type ViewOfDefinition,
} from "../model/definition";
import type { CardIdOfManifest, ManifestOf } from "../model/extract";
import type { CollectorValueOf } from "../model/spec/inputs";
import type { BotDecision, BotStrategy } from "./bot-strategies";

export const registeredStrategies: unique symbol = Symbol(
  "registeredStrategies",
);

/** A strategy collection registered against one assembled game definition. */
export type DefinedBots<Game> = {
  readonly [registeredStrategies]: readonly BotStrategy<Game>[];
};

type VisibleCard = { readonly id: string };
type SeatView<Game> = NonNullable<ViewOfDefinition<Game>>;
type CardResolver<View, Card extends VisibleCard> = (
  view: View,
) => readonly Card[];
type Scorer<Args> = (args: Args) => number;

type CardInputAlias<
  Key,
  Suffix extends "Id" | "Ids",
> = Key extends `${infer Name}${Suffix}`
  ? Name extends ""
    ? never
    : Suffix extends "Ids"
      ? `${Name}s`
      : Exclude<Name, "view">
  : never;

type SingleKey<Keys, Key = Keys> = Key extends string
  ? [Keys] extends [Key]
    ? Key
    : never
  : never;

type CardBinding<Key, Collector> = Collector extends { readonly kind: "card" }
  ? CollectorValueOf<Collector> extends readonly unknown[]
    ? Collector extends {
        readonly selection: {
          readonly mode: "many";
          readonly min: infer Min extends number;
          readonly max: infer Max extends number;
          readonly distinct: true;
        };
      }
      ? number extends Min
        ? never
        : [Min, Max] extends [Max, Min]
          ? [CardInputAlias<Key, "Ids">] extends [never]
            ? never
            : { alias: CardInputAlias<Key, "Ids">; multiple: true }
          : never
      : never
    : [CardInputAlias<Key, "Id">] extends [never]
      ? never
      : { alias: CardInputAlias<Key, "Id">; multiple: false }
  : never;

type Binding<
  Game,
  Phase extends PhaseNamesOfDefinition<Game>,
  Id extends InteractionIdOfDefinitionPhase<Game, Phase>,
  Keys = keyof ClientParamsOfInteractionOfDefinition<Game, Phase, Id>,
> =
  InteractionSpecByNameOfDefinitionPhase<Game, Phase, Id> extends {
    readonly steps: unknown;
  }
    ? never
    : [Keys] extends [never]
      ? null
      : CardBinding<
          SingleKey<Keys>,
          InputCollectorOfDefinition<Game, Phase, Id, SingleKey<Keys>>
        >;

type Bindings<Game> = {
  [
    Key in InteractionKey<Game>
  ]: Key extends `${infer Phase extends PhaseNamesOfDefinition<Game>}.${infer Id}`
    ? Id extends InteractionIdOfDefinitionPhase<Game, Phase>
      ? Binding<Game, Phase, Id>
      : never
    : never;
};

type ResolvedArgs<Binding, Card> = Binding extends {
  alias: infer Alias extends string;
  multiple: infer Multiple;
}
  ? Record<Alias, Multiple extends true ? readonly Card[] : Card>
  : object;

type RequiredSkips<Game, HasResolver extends boolean> = {
  [Key in keyof Bindings<Game>]: [Bindings<Game>[Key]] extends [never]
    ? Key
    : HasResolver extends true
      ? never
      : Bindings<Game>[Key] extends null
        ? never
        : Key;
}[keyof Bindings<Game>];

type AuthoredStrategy<
  Game,
  Card,
  Keys extends keyof Bindings<Game>,
  HasResolver extends boolean,
> = BotStrategyMetadata & {
  // Infer the offered keys before applying coverage and skip constraints so
  // contextual typing can use the return type of the shared card resolver.
  score: {
    [Key in Keys]:
      | "skip"
      | Scorer<
          { view: SeatView<Game> } & ResolvedArgs<Bindings<Game>[Key], Card>
        >;
  } & Record<keyof Bindings<Game>, unknown> &
    Record<RequiredSkips<Game, HasResolver>, "skip">;
};

const diagnosticMessages = {
  unsupported_interaction: "Unsupported interaction for bot scoring.",
  missing_handler: "Missing bot score handler.",
  invalid_binding:
    "Card input name or resolver is incompatible with bot scoring.",
  resolver_failed:
    "Bot card resolver failed. Every eligible card must resolve exactly once.",
  scorer_failed: "Bot scorer failed.",
  invalid_score: "Bot score must be finite.",
} as const;

type BotStrategyErrorCategory = keyof typeof diagnosticMessages;

/** Carries only public strategy metadata and a fixed diagnostic message. */
class BotStrategyError extends Error {
  override readonly name = "BotStrategyError";

  constructor(
    readonly category: BotStrategyErrorCategory,
    readonly interactionKey: string,
  ) {
    super(diagnosticMessages[category]);
  }
}

function resolvedCards<View>(
  resolve: CardResolver<View, VisibleCard>,
  view: View,
  ids: readonly string[],
  interactionKey: string,
): readonly ResolvedCard[] {
  const byId = new Map<string, VisibleCard>();
  const wanted = new Set(ids);
  try {
    for (const card of resolve(view)) {
      const { id } = card;
      if (!wanted.has(id)) continue;
      if (byId.has(id)) {
        throw new BotStrategyError("resolver_failed", interactionKey);
      }
      byId.set(id, card);
    }
  } catch {
    throw new BotStrategyError("resolver_failed", interactionKey);
  }
  return ids.map((id) => {
    const card = byId.get(id);
    if (!card) throw new BotStrategyError("resolver_failed", interactionKey);
    return { id, card };
  });
}

type ResolvedCard = { readonly id: string; readonly card: VisibleCard };

type Candidate = {
  args: Record<string, VisibleCard | readonly VisibleCard[]>;
  params: Record<string, string | string[]>;
};

function* candidates<View>(
  offer: InteractionDescriptor,
  view: View,
  resolve: CardResolver<View, VisibleCard> | undefined,
): Iterable<Candidate> {
  if (offer.step || offer.inputs.length > 1) {
    throw new BotStrategyError("unsupported_interaction", offer.interactionKey);
  }
  const [input] = offer.inputs;
  if (!input) {
    yield { args: {}, params: {} };
    return;
  }
  if (input.kind !== "card" || input.domain.type !== "cardTarget" || !resolve) {
    throw new BotStrategyError("invalid_binding", offer.interactionKey);
  }

  const { key, domain } = input;
  const selection = domain.selection;
  const multiple = selection?.mode === "many";
  const suffix = multiple ? "Ids" : "Id";
  const name = key.endsWith(suffix) ? key.slice(0, -suffix.length) : "";
  const alias = multiple ? name + "s" : name;
  if (!name || alias === "view") {
    throw new BotStrategyError("invalid_binding", offer.interactionKey);
  }

  const eligible = resolvedCards(
    resolve,
    view,
    domain.eligibleTargets,
    offer.interactionKey,
  );

  if (!multiple) {
    for (const { card, id } of eligible) {
      yield { args: { [alias]: card }, params: { [key]: id } };
    }
    return;
  }
  if (!selection.distinct || selection.min !== selection.max) {
    throw new BotStrategyError("unsupported_interaction", offer.interactionKey);
  }
  for (const cards of enumerateCombinations(eligible, selection.min)) {
    yield {
      args: { [alias]: cards.map(({ card }) => card) },
      params: { [key]: cards.map(({ id }) => id) },
    };
  }
}

function scoredStrategy<Game>(
  strategy: BotStrategyMetadata & { score: object },
  resolve: CardResolver<SeatView<Game>, VisibleCard> | undefined,
): BotStrategy<Game> {
  // The descriptor supplies the same input keys and card domain as the game
  // definition that typed the scorer. Each key is paired with its scorer here.
  const score = new Map(
    Object.entries(strategy.score as Record<string, "skip" | Scorer<object>>),
  );
  return {
    id: strategy.id,
    name: strategy.name,
    description: strategy.description,
    decide(frame) {
      const { view } = frame;
      if (view == null) return null;
      let bestScore = -Infinity;
      let decision: BotDecision<Game> = null;
      for (const offer of frame.availableInteractions) {
        if (offer.availability.status !== "available") continue;
        const handler = score.get(offer.interactionKey);
        if (handler === "skip") continue;
        if (!handler) {
          throw new BotStrategyError("missing_handler", offer.interactionKey);
        }
        for (const { args, params } of candidates(offer, view, resolve)) {
          let value: number;
          try {
            value = handler({ ...args, view });
          } catch {
            throw new BotStrategyError("scorer_failed", offer.interactionKey);
          }
          if (!Number.isFinite(value)) {
            throw new BotStrategyError("invalid_score", offer.interactionKey);
          }
          if (value > bestScore) {
            bestScore = value;
            decision = {
              interactionId: offer.interactionId,
              params,
            } as BotDecision<Game>;
          }
        }
      }
      return decision;
    },
  };
}

type AssembledGame = { readonly [validatedReducerDefinition]: true };
type GameCard<Game> = {
  readonly id: CardIdOfManifest<ManifestOf<Game>>;
};

/** Register seat-view resolvers and strategies for every player interaction. */
export function defineBots<
  Game extends AssembledGame,
  Card extends GameCard<Game>,
  Keys extends keyof Bindings<Game>,
>(
  game: Game,
  config: {
    resolve: { card: CardResolver<SeatView<Game>, Card> };
    strategies: readonly AuthoredStrategy<Game, Card, Keys, true>[];
  },
): DefinedBots<Game>;
export function defineBots<
  Game extends AssembledGame,
  Keys extends keyof Bindings<Game>,
>(
  game: Game,
  config: {
    resolve: { card?: never };
    strategies: readonly AuthoredStrategy<Game, never, Keys, false>[];
  },
): DefinedBots<Game>;
export function defineBots<Game extends AssembledGame>(
  _game: Game,
  config: {
    resolve: { card?: CardResolver<SeatView<Game>, VisibleCard> };
    strategies: readonly (BotStrategyMetadata & { score: object })[];
  },
): DefinedBots<Game> {
  return {
    [registeredStrategies]: config.strategies.map((strategy) =>
      scoredStrategy<Game>(strategy, config.resolve.card),
    ),
  };
}

import type { CollectorState } from "../model/spec";
import type { PlayerIdOfState } from "../model/extract";
import type { TableQueriesOfState } from "../model/queries";
import {
  createTargetRule,
  createTargetRuleBuilder,
  type TargetContext,
  type TargetPredicate,
  type TargetRule,
  type TargetRuleBuilder,
} from "./targetRule";

export type ChoiceTargetOption<Id extends string> = {
  id: Id;
  label?: string;
};

export type ChoiceOptionsFactory<
  State extends CollectorState,
  Id extends string,
> = (
  state: State,
  playerId: PlayerIdOfState<State>,
  q: TableQueriesOfState<State>,
) => ReadonlyArray<ChoiceTargetOption<Id>>;

export type ChoiceTargetPredicate<
  State extends CollectorState,
  Id extends string,
> = TargetPredicate<State, Id>;

export type ChoiceTargetRule<
  State extends CollectorState,
  Id extends string,
> = TargetRule<State, Id> & {
  readonly targetKind: "choice";
  readonly options: (
    ctx: TargetContext<State>,
  ) => ReadonlyArray<ChoiceTargetOption<Id>>;
  readonly eligibleOptions: (
    ctx: TargetContext<State>,
  ) => ReadonlyArray<ChoiceTargetOption<Id>>;
};

export type ChoiceTargetBuilder<
  State extends CollectorState,
  Id extends string,
> = TargetRuleBuilder<State, Id, ChoiceTargetRule<State, Id>>;

function normalizeOptions<State extends CollectorState, Id extends string>(
  options:
    | ReadonlyArray<ChoiceTargetOption<Id>>
    | ChoiceOptionsFactory<State, Id>,
): ChoiceOptionsFactory<State, Id> {
  if (typeof options === "function") return options;
  return () => options;
}

function createChoiceTargetBuilder<
  State extends CollectorState,
  Id extends string,
>(
  options:
    | ReadonlyArray<ChoiceTargetOption<Id>>
    | ChoiceOptionsFactory<State, Id>,
): ChoiceTargetBuilder<State, Id> {
  const optionsFactory = normalizeOptions(options);
  return createTargetRuleBuilder<State, Id, ChoiceTargetRule<State, Id>>(
    (predicates) => {
      const baseRule = createTargetRule(
        (ctx) =>
          optionsFactory(ctx.state, ctx.playerId, ctx.q).map(
            (option) => option.id,
          ),
        predicates,
        {
          missingCandidateIssue: {
            errorCode: "CHOICE_TARGET_NOT_ELIGIBLE",
            message: "Choice target is not eligible.",
          },
        },
      );
      return {
        ...baseRule,
        targetKind: "choice",
        options: (ctx) => optionsFactory(ctx.state, ctx.playerId, ctx.q),
        eligibleOptions: (ctx) =>
          optionsFactory(ctx.state, ctx.playerId, ctx.q).filter((option) =>
            baseRule.isEligible(ctx, option.id),
          ),
      };
    },
  );
}

export const choiceTarget = {
  options<State extends CollectorState, Id extends string>(
    options:
      | ReadonlyArray<ChoiceTargetOption<Id>>
      | ChoiceOptionsFactory<State, Id>,
  ): ChoiceTargetBuilder<State, Id> {
    return createChoiceTargetBuilder(options);
  },
};

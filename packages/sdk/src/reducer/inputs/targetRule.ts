import type { TopologyDefinitions } from "../../shared/domain/topology-definitions.js";
import type { CollectorState } from "../model/spec";
import type { ValidationIssue } from "../model/spec/runtime-args";
import type { PlayerIdOfState } from "../model/extract";
import type { TableQueriesOfState } from "../model/queries";

export type TargetContext<
  State extends CollectorState,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = {
  state: State;
  playerId: PlayerIdOfState<State>;
  q: TableQueriesOfState<State, Definitions>;
};

export type TargetPredicateArgs<
  State extends CollectorState,
  Target,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = TargetContext<State, Definitions> & {
  targetId: Target;
};

export type TargetPredicate<
  State extends CollectorState,
  Target,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = {
  id: string;
  errorCode: string;
  message?: string;
  test: (args: TargetPredicateArgs<State, Target, Definitions>) => boolean;
};

export type BoundTargetRule<Target> = {
  readonly eligible: () => readonly Target[];
  readonly validate: (target: unknown) => ValidationIssue | null;
  readonly isEligible: (target: unknown) => boolean;
};

export type TargetRule<
  State extends CollectorState,
  Target,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = {
  readonly eligible: (
    ctx: TargetContext<State, Definitions>,
  ) => readonly Target[];
  readonly validate: (
    ctx: TargetContext<State, Definitions>,
    target: unknown,
  ) => ValidationIssue | null;
  readonly isEligible: (
    ctx: TargetContext<State, Definitions>,
    target: unknown,
  ) => boolean;
  readonly bind: (
    ctx: TargetContext<State, Definitions>,
  ) => BoundTargetRule<Target>;
};

export type TargetRuleBuilder<
  State extends CollectorState,
  Target,
  Rule extends TargetRule<State, Target, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = {
  readonly where: (
    predicate: TargetPredicate<State, Target, Definitions>,
  ) => TargetRuleBuilder<State, Target, Rule, Definitions>;
  readonly build: () => Rule;
};

export type TargetCandidateResolver<
  State extends CollectorState,
  Target,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = (ctx: TargetContext<State, Definitions>) => readonly Target[];

export type TargetRuleOptions = {
  missingCandidateIssue?: ValidationIssue;
  equals?: (left: unknown, right: unknown) => boolean;
};

const DEFAULT_MISSING_CANDIDATE_ISSUE: ValidationIssue = {
  errorCode: "TARGET_NOT_ELIGIBLE",
  message: "Target is not eligible.",
};

export function createTargetRule<
  State extends CollectorState,
  Target,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
>(
  candidates: TargetCandidateResolver<State, Target, Definitions>,
  predicates: readonly TargetPredicate<State, Target, Definitions>[],
  options: TargetRuleOptions = {},
): TargetRule<State, Target, Definitions> {
  const missingCandidateIssue =
    options.missingCandidateIssue ?? DEFAULT_MISSING_CANDIDATE_ISSUE;
  const equals = options.equals ?? Object.is;

  const validate = (
    ctx: TargetContext<State, Definitions>,
    target: unknown,
  ): ValidationIssue | null => {
    for (const candidate of candidates(ctx)) {
      if (!equals(candidate, target)) continue;
      for (const predicate of predicates) {
        if (!predicate.test({ ...ctx, targetId: candidate })) {
          return { errorCode: predicate.errorCode, message: predicate.message };
        }
      }
      return null;
    }
    return missingCandidateIssue;
  };

  const rule: TargetRule<State, Target, Definitions> = {
    eligible: (ctx) =>
      candidates(ctx).filter((targetId) => validate(ctx, targetId) == null),
    validate,
    isEligible: (ctx, target) => validate(ctx, target) == null,
    bind: (ctx) => ({
      eligible: () => rule.eligible(ctx),
      validate: (id) => rule.validate(ctx, id),
      isEligible: (id) => rule.isEligible(ctx, id),
    }),
  };

  return rule;
}

export function createTargetRuleBuilder<
  State extends CollectorState,
  Target,
  Rule extends TargetRule<State, Target, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
>(
  buildRule: (
    predicates: readonly TargetPredicate<State, Target, Definitions>[],
  ) => Rule,
  predicates: readonly TargetPredicate<State, Target, Definitions>[] = [],
): TargetRuleBuilder<State, Target, Rule, Definitions> {
  return {
    where: (predicate) =>
      createTargetRuleBuilder(buildRule, [...predicates, predicate]),
    build: () => buildRule(predicates),
  };
}

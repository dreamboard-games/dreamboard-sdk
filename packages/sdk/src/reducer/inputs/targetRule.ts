import type { CollectorState, ValidationIssue } from "../model/spec";
import type { PlayerIdOfState } from "../model/extract";
import type { TableQueriesOfState } from "../model/queries";

export type TargetContext<State extends CollectorState> = {
  state: State;
  playerId: PlayerIdOfState<State>;
  q: TableQueriesOfState<State>;
  values?: Readonly<Record<string, unknown>>;
};

export type TargetPredicateArgs<
  State extends CollectorState,
  Target,
> = TargetContext<State> & {
  targetId: Target;
  target: Target;
};

export type TargetPredicate<State extends CollectorState, Target> = {
  id: string;
  errorCode: string;
  message?: string;
  test: (args: TargetPredicateArgs<State, Target>) => boolean;
};

export type BoundTargetRule<Target> = {
  readonly eligible: () => readonly Target[];
  readonly validate: (target: Target) => ValidationIssue | null;
  readonly isEligible: (target: Target) => boolean;
};

export type TargetRule<State extends CollectorState, Target> = {
  readonly eligible: (ctx: TargetContext<State>) => readonly Target[];
  readonly validate: (
    ctx: TargetContext<State>,
    target: Target,
  ) => ValidationIssue | null;
  readonly isEligible: (ctx: TargetContext<State>, target: Target) => boolean;
  readonly bind: (ctx: TargetContext<State>) => BoundTargetRule<Target>;
};

export type TargetRuleBuilder<
  State extends CollectorState,
  Target,
  Rule extends TargetRule<State, Target>,
> = {
  readonly where: (
    predicate: TargetPredicate<State, Target>,
  ) => TargetRuleBuilder<State, Target, Rule>;
  readonly build: () => Rule;
};

export type TargetCandidateResolver<State extends CollectorState, Target> = (
  ctx: TargetContext<State>,
) => readonly Target[];

export type TargetRuleOptions = {
  missingCandidateIssue?: ValidationIssue;
  equals?: (left: unknown, right: unknown) => boolean;
};

const DEFAULT_MISSING_CANDIDATE_ISSUE: ValidationIssue = {
  errorCode: "TARGET_NOT_ELIGIBLE",
  message: "Target is not eligible.",
};

export function createTargetRule<State extends CollectorState, Target>(
  candidates: TargetCandidateResolver<State, Target>,
  predicates: readonly TargetPredicate<State, Target>[],
  options: TargetRuleOptions = {},
): TargetRule<State, Target> {
  const missingCandidateIssue =
    options.missingCandidateIssue ?? DEFAULT_MISSING_CANDIDATE_ISSUE;
  const equals = options.equals ?? Object.is;

  const validate = (
    ctx: TargetContext<State>,
    target: Target,
  ): ValidationIssue | null => {
    if (!candidates(ctx).some((candidate) => equals(candidate, target))) {
      return missingCandidateIssue;
    }
    for (const predicate of predicates) {
      if (!predicate.test({ ...ctx, targetId: target, target })) {
        return {
          errorCode: predicate.errorCode,
          message: predicate.message,
        };
      }
    }
    return null;
  };

  const rule: TargetRule<State, Target> = {
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
  Rule extends TargetRule<State, Target>,
>(
  buildRule: (predicates: readonly TargetPredicate<State, Target>[]) => Rule,
  predicates: readonly TargetPredicate<State, Target>[] = [],
): TargetRuleBuilder<State, Target, Rule> {
  return {
    where: (predicate) =>
      createTargetRuleBuilder(buildRule, [...predicates, predicate]),
    build: () => buildRule(predicates),
  };
}

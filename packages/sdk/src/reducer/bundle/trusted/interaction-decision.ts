import type {
  AnyInteractionSpec,
  PhaseMapOf,
  ReducerGameContractLike,
  ReducerValidationResult,
  ViewMapOf,
} from "../../model";
import {
  parseInteractionParams,
  prepareInteractionProjectionParams,
  validateCollectorTargets,
} from "./collector-params";
import { buildInteractionDescriptor } from "./interaction-descriptor";
import type { createInteractionAuthorization } from "./interaction-authorization";
import type { createStageResolver } from "./stage-resolver";
import {
  makeValidationError,
  type InteractionDecisionResult,
  type ResolveDecisionInput,
  type TrustedInteractionDescriptorShape,
  type TrustedInteractionId,
} from "./interaction-types";
import type { ProjectionContext } from "./projection-context";
import {
  isSimultaneousPhase,
  SIMULTANEOUS_SUBMIT_INTERACTION_ID,
} from "./simultaneous-player";
import type {
  TrustedDomainState,
  TrustedManifest,
  TrustedPhaseName,
  TrustedPlayerId,
  TrustedRuntimeScope,
  TrustedState,
} from "./runtime-scope";

type StageResolverFor<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
> = ReturnType<typeof createStageResolver<Contract, Definitions, Views>>;

type AuthorizationFor<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
> = ReturnType<
  typeof createInteractionAuthorization<Contract, Definitions, Views>
>;

type InteractionRuleIssue = {
  errorCode: string;
  message?: string;
};

function issueFromRule(rule: InteractionRuleIssue): InteractionRuleIssue {
  return { errorCode: rule.errorCode, message: rule.message };
}

function issueFromRuleValidationResult(
  rule: InteractionRuleIssue,
  result: boolean | InteractionRuleIssue | null | undefined,
): InteractionRuleIssue | undefined {
  if (result === false) return issueFromRule(rule);
  if (result && typeof result === "object") return result;
  return undefined;
}

export function createInteractionDecisionResolver<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(
  scope: TrustedRuntimeScope<Contract, Definitions, Views>,
  stages: StageResolverFor<Contract, Definitions, Views>,
  authorization: AuthorizationFor<Contract, Definitions, Views>,
) {
  type DomainState = TrustedDomainState<Contract>;
  type Manifest = TrustedManifest<Contract>;
  type State = TrustedState<Contract>;
  type PhaseName = TrustedPhaseName<Contract, Definitions, Views>;
  type PlayerId = TrustedPlayerId<Contract>;
  type InteractionId = TrustedInteractionId<Contract, Definitions, Views>;
  type Descriptor = TrustedInteractionDescriptorShape<
    Contract,
    Definitions,
    Views
  >;

  function evaluateInteractionCost(
    state: State,
    interaction: AnyInteractionSpec<DomainState, Manifest>,
    playerId: PlayerId,
    params: Record<string, unknown>,
    projection?: ProjectionContext<DomainState, State>,
  ):
    | { cost?: Record<string, number>; missing?: Record<string, number> }
    | { error: unknown } {
    if (!interaction.cost) {
      return {};
    }
    const args = scope.buildRuntimeArgs(
      state,
      {
        state: projection?.domainState ?? scope.toDomainState(state),
        input: { playerId, params },
      },
      projection,
    );
    try {
      const cost = { ...interaction.cost(args) };
      const typedCost = cost as Parameters<typeof args.q.player.canAfford>[1];
      const missing = args.q.player.canAfford(playerId, typedCost)
        ? {}
        : { ...args.q.player.missingResources(playerId, typedCost) };
      return { cost, missing };
    } catch (error) {
      return { error };
    }
  }

  function resolveInteractionDecision({
    state,
    playerId,
    interactionId,
    params = {},
    mode,
    projection,
  }: ResolveDecisionInput<
    Contract,
    Definitions,
    Views
  >): InteractionDecisionResult<Contract, Definitions, Views> {
    const phaseName = state.flow.currentPhase as PhaseName;
    const interaction = scope.findInteractionInPhase(phaseName, interactionId);
    if (!interaction) {
      return {
        found: false,
        validation: makeValidationError(
          "unsupported-action",
          `Interaction '${interactionId}' is not available in phase '${state.flow.currentPhase}'.`,
        ),
      };
    }
    const trustedInteractionId = interactionId as InteractionId;

    const parseForSubmit = mode === "submit";
    const parsed = parseForSubmit
      ? parseInteractionParams(interaction, params, {
          skipRng: true,
          playerId,
        })
      : ({
          ok: true,
          params: prepareInteractionProjectionParams(interaction, params),
        } as const);
    if (!parsed.ok) {
      return {
        found: true,
        interaction,
        parsedParams: {},
        visible: true,
        descriptor: buildInteractionDescriptor(
          scope,
          state,
          playerId,
          trustedInteractionId,
          interaction,
          {
            available: false,
            unavailableReason: parsed.message,
          },
          { projection, includeEligibleTargets: false },
        ),
        validation: makeValidationError(
          "invalid-action-params",
          parsed.message,
        ),
      };
    }

    const phase = scope.phaseByName(phaseName);
    const isSimultaneousSubmit =
      isSimultaneousPhase(phase) &&
      interactionId === SIMULTANEOUS_SUBMIT_INTERACTION_ID;
    const alreadySubmitted =
      isSimultaneousSubmit &&
      state.runtime.simultaneous?.current?.phaseName === phaseName &&
      Boolean(state.runtime.simultaneous.current.submissions[playerId]);
    const canResubmit =
      isSimultaneousSubmit &&
      (phase as { canResubmit?: boolean }).canResubmit === true;

    const actorAuthorization =
      authorization.resolveInteractionActorAuthorization(
        state,
        interaction,
        projection,
      );
    const authorized = authorization.isActorAuthorized(
      state,
      playerId,
      actorAuthorization,
    );
    let visible = authorization.isInteractionVisible(
      interaction,
      actorAuthorization,
      authorized,
    );
    if (alreadySubmitted && !canResubmit && mode !== "submit") {
      visible = false;
    }
    const stageAllow = stages.resolveActiveStageAllowlist(
      state,
      phaseName,
      projection,
    );
    const stageAllowed = !stageAllow || stageAllow.has(interactionId);
    const stepAllowed = stages.isInteractionAllowedInStep(
      state,
      interaction,
      projection,
    );

    let validation: ReducerValidationResult = { valid: true };
    if (!authorized) {
      validation =
        actorAuthorization.mode === "addressees"
          ? makeValidationError(
              "prompt-not-owned",
              `Interaction '${interactionId}' is not addressed to '${playerId}'.`,
            )
          : makeValidationError(
              "NOT_YOUR_TURN",
              `It is not your turn (interaction '${interactionId}').`,
            );
    } else if (alreadySubmitted && !canResubmit) {
      validation = makeValidationError(
        "ALREADY_SUBMITTED",
        `Interaction '${interactionId}' has already been submitted by '${playerId}'.`,
      );
    } else if (!stageAllowed) {
      validation = makeValidationError(
        "action-unavailable",
        `Interaction '${interactionId}' is not allowed in the current stage.`,
      );
    } else if (!stepAllowed) {
      validation = makeValidationError(
        "action-unavailable",
        `Interaction '${interactionId}' is not allowed in the current step.`,
      );
    }

    const canEvaluateProjectionDetails =
      mode !== "submit" && visible && authorized && stageAllowed && stepAllowed;
    const canContinueSubmitValidation = mode === "submit" && validation.valid;
    let cost: Record<string, number> | undefined;
    let missingResources: Record<string, number> | undefined;
    let costAffordable = true;
    if (canContinueSubmitValidation || canEvaluateProjectionDetails) {
      const costDecision = evaluateInteractionCost(
        state,
        interaction,
        playerId,
        parsed.params,
        projection,
      );
      if ("error" in costDecision) {
        costAffordable = false;
        validation = makeValidationError(
          "cost-unavailable",
          `Interaction '${interactionId}' cost could not be evaluated.`,
        );
      } else {
        cost = costDecision.cost ?? undefined;
        missingResources = costDecision.missing ?? undefined;
        costAffordable =
          !missingResources ||
          Object.values(missingResources).every((amount) => amount <= 0);
        if (!costAffordable) {
          if (mode === "submit" || validation.valid) {
            validation = makeValidationError(
              "INSUFFICIENT_RESOURCES",
              `Interaction '${interactionId}' cannot be afforded.`,
            );
          }
        }
      }
    }

    let ruleAvailabilityIssue: InteractionRuleIssue | undefined;
    if (
      (canContinueSubmitValidation || canEvaluateProjectionDetails) &&
      interaction.rules
    ) {
      const availabilityArgs = scope.buildRuntimeArgs(
        state,
        {
          state: projection?.domainState ?? scope.toDomainState(state),
          input: { playerId },
        },
        projection,
      );
      for (const rule of interaction.rules) {
        if (!rule.available) continue;
        if (!rule.available(availabilityArgs)) {
          ruleAvailabilityIssue = issueFromRule(rule);
          if (mode === "submit" || validation.valid) {
            validation = makeValidationError(
              ruleAvailabilityIssue.errorCode,
              ruleAvailabilityIssue.message,
            );
          }
          break;
        }
      }
    }

    let authoredValidation:
      | {
          errorCode: string;
          message?: string;
        }
      | undefined;
    if (
      (validation.valid || (mode === "card" && canEvaluateProjectionDetails)) &&
      (mode === "submit" || mode === "card")
    ) {
      if (validation.valid && mode === "submit") {
        validation = validateCollectorTargets(
          interaction,
          projection?.domainState ?? scope.toDomainState(state),
          playerId,
          parsed.params,
        );
      }
    }

    if (
      (validation.valid || (mode === "card" && canEvaluateProjectionDetails)) &&
      (mode === "submit" || mode === "card")
    ) {
      const validateArgs = scope.buildRuntimeArgs(
        state,
        {
          state: projection?.domainState ?? scope.toDomainState(state),
          input: {
            playerId,
            params: parsed.params,
          },
        },
        projection,
      );
      for (const rule of interaction.rules ?? []) {
        if (!rule.validate) continue;
        authoredValidation = issueFromRuleValidationResult(
          rule,
          rule.validate(validateArgs),
        );
        if (authoredValidation) break;
      }
      if (authoredValidation) {
        if (mode === "submit" || validation.valid) {
          validation = makeValidationError(
            authoredValidation.errorCode,
            authoredValidation.message,
          );
        }
      }
    }

    const available =
      stageAllowed &&
      stepAllowed &&
      authorized &&
      !ruleAvailabilityIssue &&
      costAffordable &&
      !authoredValidation;
    const unavailableReason = available
      ? undefined
      : !authorized
        ? "Not your turn"
        : !stageAllowed
          ? "Interaction not allowed in current stage"
          : !stepAllowed
            ? "Interaction not allowed in current step"
            : ruleAvailabilityIssue
              ? (ruleAvailabilityIssue.message ??
                ruleAvailabilityIssue.errorCode)
              : !costAffordable
                ? "INSUFFICIENT_RESOURCES"
                : mode === "card"
                  ? (authoredValidation?.message ?? "Interaction unavailable")
                  : "Interaction unavailable";
    const descriptor = buildInteractionDescriptor(
      scope,
      state,
      playerId,
      trustedInteractionId,
      interaction,
      {
        available,
        unavailableReason,
        cost,
        missingResources,
      },
      {
        projection,
        includeEligibleTargets: available || mode === "card",
      },
    );
    return {
      found: true,
      interaction,
      parsedParams: parsed.params,
      visible,
      descriptor,
      validation,
    };
  }

  function resolveAvailableInteractionsFor(
    state: State,
    playerId: PlayerId,
    options: { projection?: ProjectionContext<DomainState, State> } = {},
  ) {
    const phaseName = state.flow.currentPhase as PhaseName;
    const descriptors: Descriptor[] = [];
    for (const [interactionId] of scope.interactionEntriesForPhase(phaseName)) {
      const decision = resolveInteractionDecision({
        state,
        playerId,
        interactionId,
        params: {},
        mode: "descriptor",
        projection: options.projection,
      });
      if (!decision.found || !decision.visible) continue;
      descriptors.push(decision.descriptor);
    }
    return descriptors;
  }

  return {
    evaluateInteractionCost,
    resolveAvailableInteractionsFor,
    resolveInteractionDecision,
  };
}

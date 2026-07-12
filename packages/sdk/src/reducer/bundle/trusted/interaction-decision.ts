import type {
  AnyInteractionSpec,
  PhaseMapOf,
  ReducerGameContractLike,
  ReducerValidationResult,
  ViewMapOf,
} from "../../model";
import { FrameworkErrorCodes } from "../../model";
import {
  parseInteractionParams,
  prepareInteractionProjectionParams,
  validateCollectorTargets,
} from "./collector-params";
import {
  enumerateCollectorInputAssignments,
  hasAnyCollectorInputAssignment,
} from "./collector-input-solver";
import { interactionDomainEligibleCount } from "./interaction-domain-metadata";
import { buildInteractionDescriptor } from "./interaction-descriptor";
import type { createInteractionAuthorization } from "./interaction-authorization";
import type { createStageResolver } from "./stage-resolver";
import {
  makeValidationError,
  type InteractionDecision,
  type InteractionActionabilityResult,
  type InteractionDiagnosticsMode,
  type InteractionExplanation,
  type InteractionDecisionResult,
  type InteractionInputEnumerationResult,
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
  ruleId: string;
  errorCode: string;
  message?: string;
};

type RuleValidationIssue = {
  errorCode: string;
  message?: string;
};

function readStep(state: { phase?: unknown }): string | null {
  const phase = state.phase;
  if (!phase || typeof phase !== "object") return null;
  const step = (phase as { step?: unknown }).step;
  return typeof step === "string" ? step : null;
}

function explanationAvailability(
  decision: InteractionDecision,
): InteractionExplanation["availability"] {
  if (decision.available) return "available";
  switch (decision.code) {
    case FrameworkErrorCodes.NOT_YOUR_TURN:
      return "notYourTurn";
    case FrameworkErrorCodes.WRONG_PHASE:
      return "wrongPhase";
    case FrameworkErrorCodes.WRONG_STEP:
      return "wrongStep";
    default:
      return "blocked";
  }
}

export function createInteractionDecisionResolver<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(
  scope: TrustedRuntimeScope<Contract, Definitions, Views>,
  stages: StageResolverFor<Contract, Definitions, Views>,
  authorization: AuthorizationFor<Contract, Definitions, Views>,
  options: { diagnostics?: InteractionDiagnosticsMode } = {},
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

  const contractErrors =
    (scope.definition.contract as { errors?: Record<string, string> }).errors ??
    {};

  function defaultMessageForCode(code: string): string | undefined {
    return contractErrors[code];
  }

  function issueFromRule(
    rule: InteractionRuleIssue,
    message?: string,
  ): InteractionRuleIssue {
    return {
      ruleId: rule.ruleId,
      errorCode: rule.errorCode,
      message: message ?? rule.message ?? defaultMessageForCode(rule.errorCode),
    };
  }

  function issueFromRuleValidationResult(
    rule: InteractionRuleIssue,
    result: boolean | string | RuleValidationIssue | null | undefined,
  ): InteractionRuleIssue | undefined {
    if (result === false) return issueFromRule(rule);
    if (typeof result === "string") return issueFromRule(rule, result);
    if (result && typeof result === "object") {
      return {
        ruleId: rule.ruleId,
        errorCode: result.errorCode,
        message:
          result.message ??
          rule.message ??
          defaultMessageForCode(result.errorCode),
      };
    }
    return undefined;
  }

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

  function acceptsSubmitAssignment(input: {
    state: State;
    playerId: PlayerId;
    interactionId: string;
    assignment: Readonly<Record<string, unknown>>;
    projection?: ProjectionContext<DomainState, State>;
  }): boolean {
    const decision = resolveInteractionDecision({
      state: input.state,
      playerId: input.playerId,
      interactionId: input.interactionId,
      params: input.assignment,
      mode: "submit",
      candidateInvariantsValidated: true,
      projection: input.projection,
    });
    return decision.found && decision.validation.valid;
  }

  function resolveInteractionDecision({
    state,
    playerId,
    interactionId,
    params = {},
    mode,
    candidateInvariantsValidated = false,
    projection,
  }: ResolveDecisionInput<Contract>): InteractionDecisionResult<
    Contract,
    Definitions,
    Views
  > {
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
      const descriptorDecision: InteractionDecision = {
        available: false,
        code: FrameworkErrorCodes.INVALID_PARAMS,
        message: parsed.message,
      };
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
          descriptorDecision,
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

    const actorAuthorization = candidateInvariantsValidated
      ? ({ mode: "active" } as const)
      : authorization.resolveInteractionActorAuthorization(
          state,
          interaction,
          projection,
        );
    const authorized = candidateInvariantsValidated
      ? true
      : authorization.isActorAuthorized(state, playerId, actorAuthorization);
    let visible = candidateInvariantsValidated
      ? true
      : authorization.isInteractionVisible(
          interaction,
          actorAuthorization,
          authorized,
        );
    if (alreadySubmitted && !canResubmit && mode !== "submit") {
      visible = false;
    }
    const stageAllow = candidateInvariantsValidated
      ? null
      : stages.resolveActiveStageAllowlist(state, phaseName, projection);
    const stageAllowed =
      candidateInvariantsValidated ||
      !stageAllow ||
      stageAllow.has(interactionId);
    const stepAllowed =
      candidateInvariantsValidated ||
      stages.isInteractionAllowedInStep(state, interaction, projection);

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
      !candidateInvariantsValidated &&
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
          ruleAvailabilityIssue = issueFromRule({
            ruleId: rule.id,
            errorCode: rule.errorCode,
            message: rule.message,
          });
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
          ruleId: string;
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
          {
            ruleId: rule.id,
            errorCode: rule.errorCode,
            message: rule.message,
          },
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

    const candidateInvariantAvailable =
      stageAllowed && stepAllowed && authorized && !ruleAvailabilityIssue;
    const acceptsAssignment = (
      assignment: Readonly<Record<string, unknown>>,
    ): boolean =>
      acceptsSubmitAssignment({
        state,
        playerId,
        interactionId,
        assignment,
        projection,
      });
    const inputSatisfiability =
      candidateInvariantAvailable && mode !== "submit"
        ? hasAnyCollectorInputAssignment({
            interaction,
            domainState: projection?.domainState ?? scope.toDomainState(state),
            playerId,
            queries: projection?.q,
            derived: projection?.derived,
            initialValues: params,
            acceptsAssignment,
          })
        : undefined;
    const available =
      candidateInvariantAvailable &&
      (inputSatisfiability?.status === "yes" ||
        (inputSatisfiability?.status !== "no" &&
          costAffordable &&
          !authoredValidation));
    const descriptorDecision: InteractionDecision = available
      ? { available: true, cost }
      : !authorized
        ? {
            available: false,
            code: FrameworkErrorCodes.NOT_YOUR_TURN,
            message: "Not your turn",
            cost,
          }
        : !stageAllowed
          ? {
              available: false,
              code: FrameworkErrorCodes.WRONG_PHASE,
              message: "Interaction not allowed in current stage",
              cost,
            }
          : !stepAllowed
            ? {
                available: false,
                code: FrameworkErrorCodes.WRONG_STEP,
                message: "Interaction not allowed in current step",
                cost,
              }
            : ruleAvailabilityIssue
              ? {
                  available: false,
                  code: ruleAvailabilityIssue.errorCode,
                  ruleId: ruleAvailabilityIssue.ruleId,
                  message:
                    ruleAvailabilityIssue.message ??
                    ruleAvailabilityIssue.errorCode,
                  cost,
                }
              : !costAffordable
                ? {
                    available: false,
                    code: "INSUFFICIENT_RESOURCES",
                    message: "INSUFFICIENT_RESOURCES",
                    cost,
                    missingResources,
                  }
                : authoredValidation
                  ? {
                      available: false,
                      code: authoredValidation.errorCode,
                      ruleId: authoredValidation.ruleId,
                      message:
                        authoredValidation.message ?? "Interaction unavailable",
                      cost,
                    }
                  : inputSatisfiability?.status === "no"
                    ? {
                        available: false,
                        code: FrameworkErrorCodes.NO_LEGAL_INPUT,
                        message: "No legal input is currently available.",
                        cost,
                      }
                    : {
                        available: false,
                        code: "action-unavailable",
                        message: "Interaction unavailable",
                        cost,
                      };
    const descriptor = buildInteractionDescriptor(
      scope,
      state,
      playerId,
      trustedInteractionId,
      interaction,
      descriptorDecision,
      {
        projection,
        includeEligibleTargets: available || mode === "card",
        includeDiagnosticReasons: options.diagnostics === "verbose",
      },
    );
    return {
      found: true,
      interaction,
      parsedParams: parsed.params,
      visible,
      descriptor,
      inputSatisfiability,
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

  function resolveInteractionActionability(input: {
    state: State;
    playerId: PlayerId;
    interactionId: string;
    projection?: ProjectionContext<DomainState, State>;
  }): InteractionActionabilityResult {
    const decision = resolveInteractionDecision({
      ...input,
      params: {},
      mode: "descriptor",
    });
    if (!decision.found) return { found: false };
    if (!decision.visible) return { found: true, visible: false };
    return {
      found: true,
      visible: true,
      descriptor: decision.descriptor,
      inputSatisfiability: decision.inputSatisfiability,
    };
  }

  function enumerateInteractionParams(input: {
    state: State;
    playerId: PlayerId;
    interactionId: string;
    maxEvaluations: number;
    projection?: ProjectionContext<DomainState, State>;
  }): InteractionInputEnumerationResult {
    const decision = resolveInteractionDecision({
      state: input.state,
      playerId: input.playerId,
      interactionId: input.interactionId,
      params: {},
      mode: "descriptor",
      projection: input.projection,
    });
    if (!decision.found) return { found: false };
    if (!decision.visible) return { found: true, visible: false };
    const enumeration =
      decision.descriptor.availability.status === "available"
        ? enumerateCollectorInputAssignments({
            interaction: decision.interaction,
            domainState:
              input.projection?.domainState ?? scope.toDomainState(input.state),
            playerId: input.playerId,
            queries: input.projection?.q,
            derived: input.projection?.derived,
            acceptsAssignment: (assignment) =>
              acceptsSubmitAssignment({
                state: input.state,
                playerId: input.playerId,
                interactionId: input.interactionId,
                assignment,
                projection: input.projection,
              }),
            maxEvaluations: input.maxEvaluations,
          })
        : null;
    return {
      found: true,
      visible: true,
      descriptor: decision.descriptor,
      inputSatisfiability: decision.inputSatisfiability,
      enumeration,
    };
  }

  function explainInteraction(input: {
    state: State;
    playerId: PlayerId;
    interactionId: string;
    projection?: ProjectionContext<DomainState, State>;
  }): InteractionExplanation {
    const { state, playerId, interactionId, projection } = input;
    const phaseName = state.flow.currentPhase as PhaseName;
    const interaction = scope.findInteractionInPhase(phaseName, interactionId);
    if (!interaction) {
      return {
        interactionId,
        phase: String(state.flow.currentPhase),
        step: readStep(state),
        availability: "blocked",
        rules: [],
        actor: { required: [], playerIsActor: false },
        inputs: [],
      };
    }

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
    const required =
      actorAuthorization.mode === "addressees"
        ? [...actorAuthorization.addressees]
        : actorAuthorization.mode === "actors"
          ? [...actorAuthorization.actors]
          : [...(state.flow.activePlayers as readonly string[])];

    const decision = resolveInteractionDecision({
      state,
      playerId,
      interactionId,
      params: {},
      mode: "descriptor",
      projection,
    });
    const descriptorDecision: InteractionDecision =
      decision.found && decision.descriptor.availability.status === "available"
        ? { available: true }
        : decision.found &&
            decision.descriptor.availability.status === "notYourTurn"
          ? {
              available: false,
              code: FrameworkErrorCodes.NOT_YOUR_TURN,
              message: decision.descriptor.availability.reason,
            }
          : decision.found &&
              decision.descriptor.availability.status === "blocked" &&
              decision.descriptor.availability.code
            ? {
                available: false,
                code: decision.descriptor.availability.code,
                message: decision.descriptor.availability.reason,
              }
            : decision.found &&
                decision.descriptor.availability.status ===
                  "insufficientResources"
              ? {
                  available: false,
                  code: "INSUFFICIENT_RESOURCES",
                  message: decision.descriptor.availability.reason,
                }
              : {
                  available: false,
                  code: "action-unavailable",
                  message: "Interaction unavailable",
                };

    const ruleOutcomes: Array<InteractionExplanation["rules"][number]> = [];
    const canEvaluateRules =
      authorized &&
      stages.isInteractionAllowedInStep(state, interaction, projection);
    let sawFailure = false;
    const availabilityArgs = canEvaluateRules
      ? scope.buildRuntimeArgs(
          state,
          {
            state: projection?.domainState ?? scope.toDomainState(state),
            input: { playerId },
          },
          projection,
        )
      : null;
    for (const rule of interaction.rules ?? []) {
      if (sawFailure || !canEvaluateRules || !rule.available) {
        ruleOutcomes.push({
          ruleId: rule.id,
          outcome: "notEvaluated",
          errorCode: rule.errorCode,
          message: rule.message ?? defaultMessageForCode(rule.errorCode),
        });
        continue;
      }
      const passed = rule.available(availabilityArgs!);
      const issue = passed
        ? undefined
        : issueFromRule({
            ruleId: rule.id,
            errorCode: rule.errorCode,
            message: rule.message,
          });
      ruleOutcomes.push({
        ruleId: rule.id,
        outcome: passed ? "passed" : "failed",
        errorCode: passed ? undefined : issue?.errorCode,
        message: passed ? undefined : issue?.message,
      });
      if (!passed) sawFailure = true;
    }

    const domainDescriptor = buildInteractionDescriptor(
      scope,
      state,
      playerId,
      interactionId as InteractionId,
      interaction,
      { available: true },
      {
        projection,
        includeEligibleTargets: true,
      },
    );

    return {
      interactionId,
      phase: String(state.flow.currentPhase),
      step: readStep(state),
      availability: explanationAvailability(descriptorDecision),
      rules: ruleOutcomes,
      actor: { required, playerIsActor: authorized },
      inputs: domainDescriptor.inputs.map((entry) => ({
        key: entry.key,
        kind: entry.kind,
        eligibleCount: interactionDomainEligibleCount(entry.domain),
      })),
    };
  }

  return {
    enumerateInteractionParams,
    evaluateInteractionCost,
    explainInteraction,
    resolveAvailableInteractionsFor,
    resolveInteractionActionability,
    resolveInteractionDecision,
  };
}

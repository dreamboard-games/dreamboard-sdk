import { schemaForCollectors } from "../../client-param-schemas";
import { evaluateStepPrefix } from "./step-prefix";
import type {
  PhaseMapOf,
  ReducerGameContractLike,
  ReducerValidationResult,
  ViewOfContract,
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
  TrustedPhaseName,
  TrustedPlayerId,
  TrustedRuntimeScope,
  TrustedState,
} from "./runtime-scope";

type AuthorizationFor<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
> = ReturnType<
  typeof createInteractionAuthorization<Contract, Definitions, View>
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
  View extends ViewOfContract<Contract>,
>(
  scope: TrustedRuntimeScope<Contract, Definitions, View>,
  authorization: AuthorizationFor<Contract, Definitions, View>,
  options: { diagnostics?: InteractionDiagnosticsMode } = {},
) {
  type DomainState = TrustedDomainState<Contract>;
  type State = TrustedState<Contract>;
  type PhaseName = TrustedPhaseName<Contract, Definitions, View>;
  type PlayerId = TrustedPlayerId<Contract>;
  type InteractionId = TrustedInteractionId<Contract, Definitions, View>;
  type Descriptor = TrustedInteractionDescriptorShape<
    Contract,
    Definitions,
    View
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

  function acceptsSubmitAssignment(input: {
    state: State;
    playerId: PlayerId;
    interactionId: string;
    assignment: Readonly<Record<string, unknown>>;
    projection?: ProjectionContext<DomainState>;
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

  function resolveInteractionEligibility({
    state,
    playerId,
    interactionId,
    mode = "descriptor",
    candidateInvariantsValidated = false,
    projection,
  }: Omit<ResolveDecisionInput<Contract>, "params" | "mode"> & {
    mode?: ResolveDecisionInput<Contract>["mode"];
  }) {
    const phaseName = state.flow.currentPhase as PhaseName;
    const interaction = scope.findInteractionInPhase(phaseName, interactionId);
    if (!interaction)
      return {
        found: false as const,
        validation: makeValidationError(
          "unsupported-action",
          `Unknown interaction '${interactionId}'.`,
        ),
      };
    const pending = state.runtime.pending[playerId];
    const pendingMatches =
      pending?.phaseName === phaseName &&
      pending.interactionId === interactionId;
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
    let visible = authorized;
    if (alreadySubmitted && !canResubmit && mode !== "submit") {
      visible = false;
    }
    let validation: ReducerValidationResult = { valid: true };
    const otherPending = pending !== undefined && !pendingMatches;
    if (otherPending) {
      visible = false;
      validation = makeValidationError(
        "PENDING_INTERACTION",
        "Finish or cancel the pending interaction first.",
      );
    }
    if (!authorized) {
      validation = makeValidationError(
        "NOT_YOUR_TURN",
        `It is not your turn (interaction '${interactionId}').`,
      );
    } else if (alreadySubmitted && !canResubmit) {
      validation = makeValidationError(
        "ALREADY_SUBMITTED",
        `Interaction '${interactionId}' has already been submitted by '${playerId}'.`,
      );
    }

    const canEvaluateProjectionDetails =
      mode !== "submit" && visible && authorized;
    const canContinueSubmitValidation = mode === "submit" && validation.valid;
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

    return {
      found: true as const,
      interaction,
      authorized,
      visible,
      validation,
      ruleAvailabilityIssue,
      otherPending,
      canEvaluateProjectionDetails,
    };
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
    View
  > {
    const phaseName = state.flow.currentPhase as PhaseName;
    let interaction = scope.findInteractionInPhase(phaseName, interactionId);
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
    const originalInteraction = interaction;
    const pending = state.runtime.pending[playerId];
    const pendingMatches =
      pending?.phaseName === phaseName &&
      pending.interactionId === interactionId;
    const eligibility = resolveInteractionEligibility({
      state,
      playerId,
      interactionId,
      mode,
      candidateInvariantsValidated,
      projection,
    });
    if (!eligibility.found) return eligibility;
    const { authorized, visible, ruleAvailabilityIssue, otherPending } =
      eligibility;
    let validation = eligibility.validation;
    if (!validation.valid) {
      const code =
        "errorCode" in validation ? validation.errorCode : "action-unavailable";
      return {
        found: true,
        interaction,
        parsedParams: {},
        visible,
        descriptor: buildInteractionDescriptor(
          scope,
          state,
          playerId,
          trustedInteractionId,
          interaction,
          {
            available: false,
            code,
            message: validation.message ?? code,
            ...(ruleAvailabilityIssue
              ? { ruleId: ruleAvailabilityIssue.ruleId }
              : {}),
          },
          {
            projection,
            includeDiagnosticReasons: options.diagnostics === "verbose",
          },
        ),
        validation,
      };
    }
    const previousValues = pendingMatches ? pending.values : [];
    const submittedKey = interaction.steps?.entries[previousValues.length]?.key;
    const paramsRecord =
      params !== null && typeof params === "object" && !Array.isArray(params)
        ? params
        : {};
    const prefix = interaction.steps
      ? evaluateStepPrefix(
          interaction.steps,
          scope.toDomainState(state),
          playerId,
          mode === "submit"
            ? [...previousValues, paramsRecord[submittedKey ?? ""]]
            : previousValues,
        )
      : undefined;
    const submittedPrefix = mode === "submit" ? prefix : undefined;
    const stepComplete = submittedPrefix?.complete === true;
    const stepParamsValid =
      !prefix ||
      mode !== "submit" ||
      (!!submittedKey &&
        Object.keys(paramsRecord).length === 1 &&
        Object.prototype.hasOwnProperty.call(paramsRecord, submittedKey) &&
        prefix.values.length === previousValues.length + 1 &&
        !prefix.issue);
    if (prefix) {
      interaction = {
        ...interaction,
        steps: undefined,
        inputs: stepComplete
          ? submittedPrefix!.collectors
          : prefix.current
            ? { [prefix.current.key]: prefix.current.collector }
            : {},
        paramsSchema: stepComplete ? interaction.paramsSchema : undefined,
      };
    }

    const parseForSubmit = mode === "submit";
    const finalStepSchema =
      stepComplete && originalInteraction.paramsSchema
        ? originalInteraction.paramsSchema.safeParse(submittedPrefix!.selected)
        : undefined;
    const parsed = !stepParamsValid
      ? {
          ok: false as const,
          message: "Submit exactly the current eligible step value.",
        }
      : submittedPrefix
        ? finalStepSchema && !finalStepSchema.success
          ? {
              ok: false as const,
              message:
                "Complete step parameters do not match the interaction schema.",
            }
          : {
              ok: true as const,
              params: (finalStepSchema?.success
                ? finalStepSchema.data
                : submittedPrefix.selected) as Record<string, unknown>,
            }
        : parseForSubmit
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

    let authoredValidation:
      | {
          ruleId: string;
          errorCode: string;
          message?: string;
        }
      | undefined;
    if (validation.valid && mode === "submit" && (!prefix || stepComplete)) {
      validation = validateCollectorTargets(
        interaction,
        projection?.domainState ?? scope.toDomainState(state),
        playerId,
        parsed.params,
      );
    }

    if (validation.valid && mode === "submit" && (!prefix || stepComplete)) {
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
      authorized && !otherPending && !ruleAvailabilityIssue;
    const inputSatisfiability =
      candidateInvariantAvailable && mode !== "submit"
        ? hasAnyCollectorInputAssignment({
            interaction,
            domainState: projection?.domainState ?? scope.toDomainState(state),
            playerId,
            queries: projection?.q,
            initialValues: params,
            acceptsAssignment: () => true,
          })
        : undefined;
    const available =
      candidateInvariantAvailable &&
      (inputSatisfiability?.status === "yes" ||
        (inputSatisfiability?.status !== "no" && !authoredValidation));
    const descriptorDecision: InteractionDecision = available
      ? { available: true }
      : !authorized
        ? {
            available: false,
            code: FrameworkErrorCodes.NOT_YOUR_TURN,
            message: "Not your turn",
          }
        : ruleAvailabilityIssue
          ? {
              available: false,
              code: ruleAvailabilityIssue.errorCode,
              ruleId: ruleAvailabilityIssue.ruleId,
              message:
                ruleAvailabilityIssue.message ??
                ruleAvailabilityIssue.errorCode,
            }
          : authoredValidation
            ? {
                available: false,
                code: authoredValidation.errorCode,
                ruleId: authoredValidation.ruleId,
                message:
                  authoredValidation.message ?? "Interaction unavailable",
              }
            : inputSatisfiability?.status === "no"
              ? {
                  available: false,
                  code: FrameworkErrorCodes.NO_LEGAL_INPUT,
                  message: "No legal input is currently available.",
                }
              : {
                  available: false,
                  code: "action-unavailable",
                  message: "Interaction unavailable",
                };
    const descriptor = buildInteractionDescriptor(
      scope,
      state,
      playerId,
      trustedInteractionId,
      originalInteraction,
      descriptorDecision,
      {
        projection,
        stepPrefix: mode === "submit" ? undefined : prefix,
        includeEligibleTargets: available || mode === "card",
        includeDiagnosticReasons: options.diagnostics === "verbose",
      },
    );
    return {
      found: true,
      interaction,
      parsedParams: parsed.params,
      ...(submittedPrefix
        ? {
            stepResult: {
              values: submittedPrefix.values,
              complete: submittedPrefix.complete,
            },
          }
        : {}),
      visible,
      descriptor,
      inputSatisfiability,
      validation,
    };
  }

  function resolveAvailableInteractionsFor(
    state: State,
    playerId: PlayerId,
    options: { projection?: ProjectionContext<DomainState> } = {},
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
    projection?: ProjectionContext<DomainState>;
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

  function currentClientParamSchema(input: {
    state: State;
    playerId: PlayerId;
    interactionId: string;
  }) {
    const decision = resolveInteractionDecision({
      ...input,
      mode: "descriptor",
    });
    if (!decision.found || !decision.visible || !decision.descriptor.step)
      return null;
    return schemaForCollectors(decision.interaction.inputs ?? {});
  }

  function enumerateInteractionParams(input: {
    state: State;
    playerId: PlayerId;
    interactionId: string;
    maxEvaluations: number;
    projection?: ProjectionContext<DomainState>;
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
    projection?: ProjectionContext<DomainState>;
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
      actorAuthorization.mode === "actors"
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
            : {
                available: false,
                code: "action-unavailable",
                message: "Interaction unavailable",
              };

    const ruleOutcomes: Array<InteractionExplanation["rules"][number]> = [];
    const canEvaluateRules = authorized;
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
    currentClientParamSchema,
    enumerateInteractionParams,
    explainInteraction,
    resolveAvailableInteractionsFor,
    resolveInteractionActionability,
    resolveInteractionDecision,
    resolveInteractionEligibility,
  };
}

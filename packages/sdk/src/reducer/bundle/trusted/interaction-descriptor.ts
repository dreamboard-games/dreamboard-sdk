import { evaluateStepPrefix } from "./step-prefix";
import { createStateQueries } from "../../table-queries";
import type {
  AnyInteractionSpec,
  InputCollector,
  PhaseMapOf,
  ReducerGameContractLike,
  ViewOfContract,
} from "../../model";
import {
  collectCardZoneIds,
  collectFirstCardZoneId,
  interactionInputsOf,
} from "./collector-introspection";
import { collectInteractionInputs } from "./collector-domains";
import type {
  InteractionDecision,
  InteractionAvailabilityShape,
  InteractionDescriptorShape,
  TrustedInteractionDescriptorShape,
  TrustedInteractionId,
} from "./interaction-types";
import { FrameworkErrorCodes } from "../../model";
import type { ProjectionContext } from "./projection-context";
import type {
  TrustedDomainState,
  TrustedManifest,
  TrustedPhaseName,
  TrustedPlayerId,
  TrustedRuntimeScope,
  TrustedState,
} from "./runtime-scope";

function humanizeInteractionId(id: string): string {
  if (!id) return id;
  const withSpaces = id
    .replace(/[-_]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
  if (!withSpaces) return id;
  return withSpaces
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function isTargetCollector(collector: InputCollector): boolean {
  switch (collector.kind) {
    case "card":
    case "board-edge":
    case "board-space":
    case "board-tile":
    case "board-vertex":
      return true;
    default:
      return false;
  }
}

function isManyCollector(collector: InputCollector): boolean {
  return collector.selection?.mode === "many";
}

function deriveCommitPolicy(
  inputs: Record<string, InputCollector>,
  explicit: InteractionDescriptorShape["commit"] | undefined,
): InteractionDescriptorShape["commit"] {
  const collectors = Object.values(inputs);
  const hasManyCollector = collectors.some(isManyCollector);
  if (explicit) {
    if (explicit.mode === "autoWhenReady" && hasManyCollector) {
      throw new Error(
        'Interactions with many(...) inputs must use commit: { mode: "manual" }.',
      );
    }
    return explicit;
  }
  if (hasManyCollector) {
    return { mode: "manual" };
  }
  if (collectors.length === 0 || !collectors.some(isTargetCollector)) {
    return { mode: "manual" };
  }
  const terminalCollectors = Object.values(inputs);
  if (terminalCollectors.length === 0) {
    return { mode: "manual" };
  }
  return terminalCollectors.every(
    (collector) => isTargetCollector(collector) || collector.kind === "rng",
  ) && terminalCollectors.some(isTargetCollector)
    ? { mode: "autoWhenReady" }
    : { mode: "manual" };
}

function projectInteractionMetadata(interaction: {
  inputs: Record<string, InputCollector>;
  commit?: InteractionDescriptorShape["commit"];
  presentation?: { label?: string; help?: string };
  interactionId: string;
}): Pick<InteractionDescriptorShape, "kind" | "commit" | "label" | "help"> {
  const label = normalizePresentationText(interaction.presentation?.label);
  const help = normalizePresentationText(interaction.presentation?.help);
  return {
    kind: "action",
    commit: deriveCommitPolicy(interaction.inputs, interaction.commit),
    label: label ?? humanizeInteractionId(interaction.interactionId),
    help,
  };
}

function normalizePresentationText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function enrichResourceInputPresentation(
  inputs: InteractionDescriptorShape["inputs"],
  manifest: { literals?: { resourcePresentationById?: unknown } },
): InteractionDescriptorShape["inputs"] {
  const presentationById = manifest.literals?.resourcePresentationById;
  if (!presentationById || typeof presentationById !== "object") {
    return inputs;
  }
  const resources = presentationById as Record<
    string,
    { label?: unknown; icon?: unknown }
  >;
  const enrichChoice = <
    Choice extends { value: string | null; label: string; icon?: string },
  >(
    choice: Choice,
  ): Choice & { icon?: string } => {
    const presentation =
      choice.value === null ? undefined : resources[choice.value];
    return {
      ...choice,
      label:
        typeof presentation?.label === "string" &&
        (!choice.label || choice.label === choice.value)
          ? presentation.label
          : choice.label ||
            (typeof presentation?.label === "string" ? presentation.label : ""),
      icon:
        choice.icon ??
        (typeof presentation?.icon === "string"
          ? presentation.icon
          : undefined),
    };
  };
  return inputs.map((input) => {
    if (input.domain.type === "choice") {
      return {
        ...input,
        domain: {
          ...input.domain,
          choices: input.domain.choices.map(enrichChoice),
        },
      };
    }
    if (input.domain.type === "choiceList") {
      return {
        ...input,
        domain: {
          ...input.domain,
          choices: input.domain.choices.map(enrichChoice),
        },
      };
    }
    if (input.domain.type !== "resourceMap") return input;
    return {
      ...input,
      domain: {
        ...input.domain,
        resources: input.domain.resources.map((entry) => {
          const presentation = resources[entry.resourceId];
          return {
            ...entry,
            label:
              entry.label ??
              (typeof presentation?.label === "string"
                ? presentation.label
                : undefined),
            icon:
              entry.icon ??
              (typeof presentation?.icon === "string"
                ? presentation.icon
                : undefined),
          };
        }),
      },
    };
  });
}

function interactionAvailabilityFromDecision(
  decision: InteractionDecision,
): InteractionAvailabilityShape {
  if (decision.available) return { status: "available" };
  switch (decision.code) {
    case FrameworkErrorCodes.NOT_YOUR_TURN:
      return {
        status: "notYourTurn",
        reason: decision.message ?? "Not your turn",
      };
    case FrameworkErrorCodes.NO_LEGAL_INPUT:
      return {
        status: "blocked",
        reason: decision.message ?? "No legal input is currently available.",
        code: FrameworkErrorCodes.NO_LEGAL_INPUT,
      };
    default:
      return {
        status: "blocked",
        reason: decision.message ?? "Interaction unavailable",
        code: decision.code,
      };
  }
}

export function buildInteractionDescriptor<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
>(
  scope: TrustedRuntimeScope<Contract, Definitions, View>,
  state: TrustedState<Contract>,
  playerId: TrustedPlayerId<Contract>,
  interactionId: TrustedInteractionId<Contract, Definitions, View>,
  interaction: AnyInteractionSpec<
    TrustedDomainState<Contract>,
    TrustedManifest<Contract>
  >,
  decision: InteractionDecision,
  options: {
    projection?: ProjectionContext<TrustedDomainState<Contract>>;
    includeEligibleTargets?: boolean;
    includeDiagnosticReasons?: boolean;
    stepPrefix?: ReturnType<typeof evaluateStepPrefix>;
  } = {},
): TrustedInteractionDescriptorShape<Contract, Definitions, View> {
  type PhaseName = TrustedPhaseName<Contract, Definitions, View>;
  type Descriptor = TrustedInteractionDescriptorShape<
    Contract,
    Definitions,
    View
  >;
  const domainState =
    options.projection?.domainState ?? scope.toDomainState(state);
  const phaseName = state.flow.currentPhase as PhaseName;
  const saved = state.runtime.pending[playerId];
  const prefix =
    options.stepPrefix ??
    (interaction.steps &&
    (decision.available || decision.code === FrameworkErrorCodes.NO_LEGAL_INPUT)
      ? evaluateStepPrefix(
          interaction.steps,
          domainState,
          playerId,
          saved?.interactionId === interactionId &&
            saved.phaseName === phaseName
            ? saved.values
            : [],
        )
      : undefined);
  const projectedInteraction = prefix
    ? {
        ...interaction,
        steps: undefined,
        paramsSchema: undefined,
        inputs: prefix.current
          ? { [prefix.current.key]: prefix.current.collector }
          : {},
      }
    : interaction;
  const interactionInputs = interactionInputsOf(projectedInteraction);
  const metadata = projectInteractionMetadata({
    ...interaction,
    inputs: interactionInputs,
    interactionId: String(interactionId),
  });
  const queries = options.projection?.q ?? createStateQueries(domainState);

  const shouldMaterializeInputDomains =
    decision.available || decision.code === FrameworkErrorCodes.NO_LEGAL_INPUT;
  const inputs = shouldMaterializeInputDomains
    ? enrichResourceInputPresentation(
        collectInteractionInputs(projectedInteraction, domainState, playerId, {
          queries,
          eligibleTargetCache: options.projection?.eligibleTargets,
          eligibleTargetCachePrefix: `${phaseName}:${String(
            interactionId,
          )}:${String(playerId)}`,
          includeEligibleTargets: options.includeEligibleTargets,
          diagnostics: scope.diagnostics,
        }),
        scope.definition.contract.manifest,
      )
    : [];
  const baseDescriptor = {
    phaseName,
    interactionKey: `${phaseName}.${interactionId}`,
    interactionId,
    label: metadata.label,
    help: metadata.help,
    commit: metadata.commit,
    zoneId: collectFirstCardZoneId(projectedInteraction),
    zoneIds: collectCardZoneIds(projectedInteraction),
    inputs,
    ...(prefix
      ? {
          step: {
            index: prefix.values.length,
            total: interaction.steps!.entries.length,
            selected: prefix.selected,
            canCancel: !!saved,
          },
        }
      : {}),
    availability: interactionAvailabilityFromDecision(decision),
    reasons:
      options.includeDiagnosticReasons && !decision.available && decision.ruleId
        ? [{ ruleId: decision.ruleId, errorCode: decision.code }]
        : undefined,
  };
  return {
    ...baseDescriptor,
    kind: "action",
  } as Descriptor;
}

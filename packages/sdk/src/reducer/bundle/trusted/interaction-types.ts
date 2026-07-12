import type {
  AnyInteractionSpec,
  InputCollectorKind,
  InputDomainDescriptor,
  InteractionIdOfDefinition,
  PhaseMapOf,
  ReducerGameContractLike,
  ReducerValidationResult,
  ViewMapOf,
} from "../../model";
import type {
  TrustedDefinition,
  TrustedDomainState,
  TrustedManifest,
  TrustedPhaseName,
  TrustedPlayerId,
  TrustedState,
} from "./runtime-scope";
import type { ProjectionContext } from "./projection-context";
import type {
  CollectorInputEnumeration,
  CollectorInputSatisfiability,
} from "./collector-input-solver";

export type TrustedInteractionId<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
> = InteractionIdOfDefinition<TrustedDefinition<Contract, Definitions, Views>>;

export type InteractionDescriptorContext<PlayerId extends string = string> = {
  to: PlayerId;
  title?: string;
  options?: Array<{ id: string; label?: string }>;
};

export type InteractionCommitPolicyShape =
  | { mode: "manual" }
  | { mode: "autoWhenReady" };

export type InteractionAvailabilityShape =
  | { status: "available" }
  | { status: "notYourTurn"; reason: string }
  | {
      status: "insufficientResources";
      reason: string;
      missingResources: Record<string, number>;
    }
  | { status: "blocked"; reason: string; code?: string };

export type InteractionDecision =
  | { available: true; cost?: Record<string, number> }
  | {
      available: false;
      code: string;
      ruleId?: string;
      message?: string;
      cost?: Record<string, number>;
      missingResources?: Record<string, number>;
    };

export type InteractionDiagnosticReasonShape = {
  ruleId: string;
  errorCode: string;
};

export type InteractionExplanation = {
  interactionId: string;
  phase: string;
  step: string | null;
  availability:
    | "available"
    | "notYourTurn"
    | "wrongPhase"
    | "wrongStep"
    | "blocked";
  rules: ReadonlyArray<{
    ruleId: string;
    outcome: "passed" | "failed" | "notEvaluated";
    errorCode?: string;
    message?: string;
  }>;
  actor: { required: readonly string[]; playerIsActor: boolean };
  inputs: ReadonlyArray<{
    key: string;
    kind: string;
    eligibleCount: number | "lazy";
  }>;
};

type InteractionDescriptorBaseShape<
  PhaseName extends string = string,
  InteractionId extends string = string,
  ZoneId extends string = string,
> = {
  phaseName: PhaseName;
  interactionKey: `${PhaseName}.${InteractionId}`;
  interactionId: InteractionId;
  label: string;
  help?: string;
  commit: InteractionCommitPolicyShape;
  descriptorDigest?: string;
  actorSeat?: number;
  draftDigest?: string;
  zoneId?: ZoneId;
  zoneIds?: readonly ZoneId[];
  inputs: InteractionInputDescriptorShape[];
  cost?: Record<string, number>;
  currentResources?: Record<string, number>;
  availability: InteractionAvailabilityShape;
  reasons?: readonly InteractionDiagnosticReasonShape[];
};

export type ActionInteractionDescriptorShape<
  PhaseName extends string = string,
  InteractionId extends string = string,
  ZoneId extends string = string,
> = InteractionDescriptorBaseShape<PhaseName, InteractionId, ZoneId> & {
  kind: "action";
};

export type PromptInteractionDescriptorShape<
  PhaseName extends string = string,
  InteractionId extends string = string,
  PlayerId extends string = string,
  ZoneId extends string = string,
> = InteractionDescriptorBaseShape<PhaseName, InteractionId, ZoneId> & {
  kind: "prompt";
  context: InteractionDescriptorContext<PlayerId>;
};

export type InteractionDescriptorShape<
  PhaseName extends string = string,
  InteractionId extends string = string,
  PlayerId extends string = string,
  ZoneId extends string = string,
> =
  | ActionInteractionDescriptorShape<PhaseName, InteractionId, ZoneId>
  | PromptInteractionDescriptorShape<
      PhaseName,
      InteractionId,
      PlayerId,
      ZoneId
    >;

export type TrustedInteractionDescriptorShape<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
> = InteractionDescriptorShape<
  TrustedPhaseName<Contract, Definitions, Views>,
  TrustedInteractionId<Contract, Definitions, Views>,
  TrustedPlayerId<Contract>
>;

export type InteractionInputDescriptorShape = {
  key: string;
  kind: InputCollectorKind;
  domain: InputDomainDescriptor;
  defaultValue?: unknown;
};

export type InteractionActorAuthorization<PlayerId extends string> =
  | { readonly mode: "addressees"; readonly addressees: ReadonlySet<PlayerId> }
  | { readonly mode: "actors"; readonly actors: ReadonlySet<PlayerId> }
  | { readonly mode: "active" };

export type ResolveDecisionMode = "descriptor" | "card" | "submit";

export type InteractionDiagnosticsMode = "verbose" | undefined;

export type ResolveDecisionInput<Contract extends ReducerGameContractLike> = {
  state: TrustedState<Contract>;
  playerId: TrustedPlayerId<Contract>;
  interactionId: string;
  params?: Record<string, unknown>;
  mode: ResolveDecisionMode;
  /**
   * Internal finite-domain optimization. The caller has already proven the
   * param-independent actor, stage, step, and availability-rule invariants;
   * concrete submit validation still parses params and evaluates targets,
   * cost, and authored validate rules.
   */
  candidateInvariantsValidated?: boolean;
  projection?: ProjectionContext<
    TrustedDomainState<Contract>,
    TrustedState<Contract>
  >;
};

export type InteractionDecisionResult<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
> =
  | {
      found: false;
      validation: ReducerValidationResult;
    }
  | {
      found: true;
      interaction: AnyInteractionSpec<
        TrustedDomainState<Contract>,
        TrustedManifest<Contract>
      >;
      parsedParams: Record<string, unknown>;
      visible: boolean;
      descriptor: TrustedInteractionDescriptorShape<
        Contract,
        Definitions,
        Views
      >;
      /** Trusted collector/domain satisfiability used by inspect/explore. */
      inputSatisfiability?: CollectorInputSatisfiability;
      validation: ReducerValidationResult;
    };

export type InteractionActionabilityResult =
  | { readonly found: false }
  | { readonly found: true; readonly visible: false }
  | {
      readonly found: true;
      readonly visible: true;
      readonly descriptor: InteractionDescriptorShape;
      readonly inputSatisfiability?: CollectorInputSatisfiability;
    };

export type InteractionInputEnumerationResult =
  | { readonly found: false }
  | { readonly found: true; readonly visible: false }
  | {
      readonly found: true;
      readonly visible: true;
      readonly descriptor: InteractionDescriptorShape;
      readonly inputSatisfiability?: CollectorInputSatisfiability;
      /** Null when trusted availability fails before input enumeration. */
      readonly enumeration: CollectorInputEnumeration | null;
    };

export function makeValidationError(
  errorCode: string,
  message?: string,
): ReducerValidationResult {
  return {
    valid: false,
    errorCode,
    message,
  };
}

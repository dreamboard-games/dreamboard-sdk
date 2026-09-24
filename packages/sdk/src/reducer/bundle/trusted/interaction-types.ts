import type {
  InteractionDescriptor,
  InteractionCommitPolicy,
  InteractionAvailability,
  InteractionDiagnosticReason,
  InteractionInputDescriptor,
} from "../../../shared/interaction-schema";
import type {
  AnyInteractionSpec,
  InteractionIdOfDefinition,
  PhaseMapOf,
  ReducerGameContractLike,
  ReducerValidationResult,
  ViewOfContract,
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
  View extends ViewOfContract<Contract>,
> = InteractionIdOfDefinition<TrustedDefinition<Contract, Definitions, View>>;

export type InteractionCommitPolicyShape = InteractionCommitPolicy;
export type InteractionAvailabilityShape = InteractionAvailability;

export type InteractionDecision =
  | { available: true }
  | {
      available: false;
      code: string;
      ruleId?: string;
      message?: string;
    };

export type InteractionDiagnosticReasonShape = InteractionDiagnosticReason;

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
    eligibleCount: number | "unknown";
  }>;
};

// Before projection admission, authored collectors may still return unknown values.
// All transport fields derive from the admitting schema; only game identity and
// the not-yet-admitted authored values are narrowed here.
export type InteractionDescriptorShape<
  PhaseName extends string = string,
  InteractionId extends string = string,
  ZoneId extends string = string,
> = Omit<
  InteractionDescriptor,
  | "phaseName"
  | "interactionKey"
  | "interactionId"
  | "zoneId"
  | "zoneIds"
  | "inputs"
  | "step"
> & {
  phaseName: PhaseName;
  interactionKey: `${PhaseName}.${InteractionId}`;
  interactionId: InteractionId;
  zoneId?: ZoneId;
  zoneIds?: readonly ZoneId[];
  inputs: readonly InteractionInputDescriptorShape[];
  step?: Omit<NonNullable<InteractionDescriptor["step"]>, "selected"> & {
    selected: Record<string, unknown>;
  };
};

export type TrustedInteractionDescriptorShape<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
> = InteractionDescriptorShape<
  TrustedPhaseName<Contract, Definitions, View>,
  TrustedInteractionId<Contract, Definitions, View>
>;

export type InteractionInputDescriptorShape = Omit<
  InteractionInputDescriptor,
  "defaultValue"
> & { defaultValue?: unknown };

export type InteractionActorAuthorization<PlayerId extends string> =
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
  projection?: ProjectionContext<TrustedDomainState<Contract>>;
};

export type InteractionDecisionResult<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
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
      stepResult?: { values: unknown[]; complete: boolean };
      visible: boolean;
      descriptor: TrustedInteractionDescriptorShape<
        Contract,
        Definitions,
        View
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

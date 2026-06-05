import type {
  AnyInteractionSpec,
  InputCollectorKind,
  InputDomainDescriptor,
  InteractionIdOfDefinition,
  InteractionKind,
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

type InteractionDescriptorBaseShape<
  PhaseName extends string = string,
  InteractionId extends string = string,
  ZoneId extends string = string,
> = {
  phaseName: PhaseName;
  interactionKey: `${PhaseName}.${InteractionId}`;
  interactionId: InteractionId;
  commit: InteractionCommitPolicyShape;
  descriptorDigest?: string;
  draftDigest?: string;
  zoneId?: ZoneId;
  zoneIds?: readonly ZoneId[];
  inputs: InteractionInputDescriptorShape[];
  cost?: Record<string, number>;
  currentResources?: Record<string, number>;
  availability: InteractionAvailabilityShape;
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

export type ResolveDecisionInput<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
> = {
  state: TrustedState<Contract>;
  playerId: TrustedPlayerId<Contract>;
  interactionId: string;
  params?: Record<string, unknown>;
  mode: ResolveDecisionMode;
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
      validation: ReducerValidationResult;
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

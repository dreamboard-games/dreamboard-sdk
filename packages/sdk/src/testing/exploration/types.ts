import type { ScenarioCheckpoint, ScenarioCommand } from "../definitions.js";
import type {
  ActorRef,
  FlowDiagnostic,
  InspectEntropy,
  InspectNode,
  PerspectiveRef,
  ScenarioDispatchTraceEntry,
  ScenarioIdentity,
  Sha256Digest,
} from "../inspection/types.js";

export type ExploreTransitionResult = {
  readonly schemaVersion: 1;
  readonly mode: "transitions";
  readonly scenario: ScenarioIdentity;
  readonly perspective: PerspectiveRef;
  readonly node: InspectNode;
  readonly candidates: readonly {
    readonly ordinal: number;
    readonly command: ScenarioCommand;
    readonly after: {
      readonly checkpointDigest: Sha256Digest;
      readonly flow: FlowDiagnostic;
      readonly publicStateDigest: Sha256Digest;
      readonly viewDigest: Sha256Digest;
      readonly actions: readonly {
        readonly actor: ActorRef;
        readonly interactionId: string;
      }[];
      readonly entropy: InspectEntropy;
      readonly dispatchTrace: readonly ScenarioDispatchTraceEntry[];
    };
  }[];
  readonly omissions: readonly {
    readonly actor: ActorRef;
    readonly interactionId: string;
    readonly code: "INPUT_DOMAIN_NOT_ENUMERABLE" | "INPUT_DOMAIN_BUDGET";
    readonly inputKey?: string;
  }[];
  readonly page: {
    readonly limit: number;
    readonly evaluated: number;
    readonly truncated: boolean;
    readonly nextCursor: string | null;
  };
};

export type ExploreSeedResult = {
  readonly schemaVersion: 1;
  readonly mode: "seeds";
  readonly scenario: ScenarioIdentity;
  readonly perspective: PerspectiveRef;
  readonly checkpoint: ScenarioCheckpoint;
  readonly variants: readonly {
    readonly seed: number;
    readonly status: "replayed" | "rejected";
    readonly checkpointDigest?: Sha256Digest;
    readonly entropy?: InspectEntropy;
    readonly observable?: {
      readonly publicState: unknown;
      readonly view: unknown;
    };
    readonly signature?: {
      readonly phase: string;
      readonly step: string | null;
      readonly actions: readonly {
        readonly seat: number;
        readonly interactionId: string;
        readonly concreteOptionCount: number | "lazy";
      }[];
    };
    readonly rejection?: {
      readonly segment: "given" | "when";
      readonly sourceIndex: number;
      readonly interactionId: string;
      readonly errorCode: string;
    };
  }[];
};

export type ExploreScenarioResult = ExploreTransitionResult | ExploreSeedResult;

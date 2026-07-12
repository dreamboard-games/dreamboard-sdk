import type {
  InteractionExplanationLike,
  ScenarioCheckpoint,
  ScenarioSetup,
} from "../definitions.js";

export type Sha256Digest = `sha256:${string}`;

export type ScenarioIdentity = {
  readonly id: string;
  readonly path: string;
  readonly sourceDigest: Sha256Digest;
};

export type ActorRef = {
  readonly seat: number;
  readonly playerId: string;
};

export type PerspectiveRef =
  | { readonly kind: "player"; readonly actor: ActorRef }
  | { readonly kind: "spectator" };

export type PerspectiveSelector =
  | { readonly kind: "player"; readonly seat: number }
  | { readonly kind: "spectator" };

export type FlowDiagnostic = {
  readonly phase: string;
  readonly step: string | null;
  readonly activeActors: readonly ActorRef[];
  readonly pendingActors: readonly ActorRef[];
  readonly continuationWaiters: readonly ActorRef[];
  readonly blockedBy: readonly {
    readonly actor: ActorRef;
    readonly blockers: readonly ActorRef[];
    readonly source: "scheduler";
  }[];
};

export type InspectInteractionInput = {
  readonly key: string;
  readonly kind: string;
  readonly eligibleCount: number | "lazy";
};

export type InspectInteraction = {
  readonly actor: ActorRef;
  readonly interactionId: string;
  readonly availability: {
    readonly status:
      | "available"
      | "notYourTurn"
      | "insufficientResources"
      | "blocked";
    readonly code?: string;
    readonly reason?: string;
  };
  readonly inputs: readonly InspectInteractionInput[];
  readonly explanation: InteractionExplanationLike;
};

export type InspectAction = {
  readonly actor: ActorRef;
  readonly interactionId: string;
  readonly inputs: readonly InspectInteractionInput[];
  readonly explanation: InteractionExplanationLike;
  readonly hasConcreteCommand: true;
};

export type ScenarioDispatchTraceEntry =
  | {
      readonly kind: "acceptedCommand";
      readonly actor: ActorRef;
      readonly interactionId: string;
    }
  | {
      readonly kind: "appliedInstruction";
      readonly instructionKind: string;
    }
  | {
      readonly kind: "entropyDraw";
      readonly drawIndex: number;
    };

export type InspectEntropy = {
  readonly seed: number;
  readonly draws: readonly {
    readonly index: number;
    readonly cursorBefore: number;
    readonly cursorAfter: number;
    readonly operation: {
      readonly kind: string;
      readonly parameters: Readonly<Record<string, string | number | boolean>>;
    };
  }[];
};

export type InspectNode = {
  readonly checkpoint: ScenarioCheckpoint;
  readonly checkpointDigest: Sha256Digest;
  readonly setup: ScenarioSetup;
  readonly flow: FlowDiagnostic;
  readonly perspective: PerspectiveRef;
  readonly publicState: unknown;
  readonly view: unknown;
  readonly interactions: readonly InspectInteraction[];
  readonly actions: readonly InspectAction[];
  readonly entropy: InspectEntropy;
  readonly dispatchTrace: readonly ScenarioDispatchTraceEntry[];
};

export type InspectScenarioResult = {
  readonly schemaVersion: 1;
  readonly scenario: ScenarioIdentity;
  readonly node: InspectNode;
  readonly seedSource: "scenario" | "override";
};

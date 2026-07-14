import { digestScenarioJson } from "./canonical.js";
import { interactionDomainEligibleCount } from "../reducer/bundle/trusted/interaction-domain-metadata.js";
import type { InspectNode, Sha256Digest } from "./inspection/types.js";

export type ScenarioProjectionInteractionInput = {
  readonly key: string;
  readonly kind: string;
  readonly domain: unknown;
};

/** Shared SDK normalization for inspect DTOs and backend parity projections. */
export function scenarioProjectionInputMetadata(
  input: ScenarioProjectionInteractionInput,
): {
  readonly key: string;
  readonly kind: string;
  readonly eligibleCount: number | "lazy";
} {
  return {
    key: input.key,
    kind: input.kind,
    eligibleCount: interactionDomainEligibleCount(input.domain),
  };
}

export type ScenarioProjectionParity = {
  readonly perspective: "spectator" | { readonly seat: number };
  readonly flow: {
    readonly phase: string;
    readonly step: string | null;
    readonly activeSeats: readonly number[];
    readonly pendingSeats: readonly number[];
    readonly continuationWaiterSeats: readonly number[];
    readonly blockedBy: readonly {
      readonly actorSeat: number;
      readonly blockerSeats: readonly number[];
    }[];
  };
  readonly view: unknown;
  readonly interactions: readonly {
    readonly actorSeat: number;
    readonly interactionId: string;
    readonly availability: {
      readonly status: string;
      readonly code?: string;
      readonly reason?: string;
    };
    readonly inputs: readonly {
      readonly key: string;
      readonly kind: string;
      readonly eligibleCount: number | "lazy";
    }[];
  }[];
};

/**
 * Canonical local/backend parity authority. It deliberately excludes raw
 * reducer public/private state, interaction explanations, entropy, and trace:
 * backend gameplay frames expose the selected projection, not reducer state.
 */
export function scenarioProjectionParityFromInspectNode(
  node: InspectNode,
): ScenarioProjectionParity {
  return {
    perspective:
      node.perspective.kind === "spectator"
        ? "spectator"
        : { seat: node.perspective.actor.seat },
    flow: {
      phase: node.flow.phase,
      step: node.flow.step,
      activeSeats: node.flow.activeActors.map(({ seat }) => seat),
      pendingSeats: node.flow.pendingActors.map(({ seat }) => seat),
      continuationWaiterSeats: node.flow.continuationWaiters.map(
        ({ seat }) => seat,
      ),
      blockedBy: node.flow.blockedBy.map(({ actor, blockers }) => ({
        actorSeat: actor.seat,
        blockerSeats: blockers.map(({ seat }) => seat),
      })),
    },
    view: node.view,
    interactions: node.interactions.map(
      ({ actor, interactionId, availability, inputs }) => ({
        actorSeat: actor.seat,
        interactionId,
        availability,
        inputs,
      }),
    ),
  };
}

export function digestScenarioProjection(
  projection: ScenarioProjectionParity,
): Sha256Digest {
  return digestScenarioJson({
    digestVersion: "scenario-projection@1",
    projection,
  });
}

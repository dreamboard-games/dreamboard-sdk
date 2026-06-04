import type { RuntimePayload } from "../model";

export type TrustedInteractionInput<PlayerId extends string> = {
  // Canonical single-kind player-originated input. `interactionId` addresses
  // either an ordinary action or an addressed prompt; the trusted bundle
  // disambiguates from the interaction spec.
  kind: "interaction";
  playerId: PlayerId;
  interactionId: string;
  params: RuntimePayload;
};

export type TrustedContinuationInput = {
  // Engine-internal input produced by resolved runtime instructions
  // (e.g. after fx.rollDie) to route a typed continuation back through reduce.
  // External clients never send this kind.
  kind: "continuation";
  continuationId: string;
  resumeData: RuntimePayload;
  source: "effect";
  effectKind: "rollDie" | "shuffleSharedZone" | "shufflePlayerZone";
  response: RuntimePayload;
};

export type TrustedRuntimeInput<PlayerId extends string> =
  | TrustedInteractionInput<PlayerId>
  | TrustedContinuationInput;

export type DecodedReducerInput<PlayerId extends string> =
  TrustedRuntimeInput<PlayerId>;

import type { RuntimePayload } from "../model";

export type TrustedInteractionInput<PlayerId extends string> = {
  // Canonical single-kind player-originated input. `interactionId` addresses
  // an ordinary actor-authorized interaction; the trusted bundle
  // disambiguates from the interaction spec.
  kind: "interaction";
  playerId: PlayerId;
  interactionId: string;
  params: RuntimePayload;
};

export type TrustedRuntimeInput<PlayerId extends string> =
  TrustedInteractionInput<PlayerId>;

export type DecodedReducerInput<PlayerId extends string> =
  TrustedRuntimeInput<PlayerId>;

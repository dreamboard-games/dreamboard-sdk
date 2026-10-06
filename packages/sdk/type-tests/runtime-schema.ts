import type { RuntimeJson } from "../src/shared/runtime-json";
import type {
  GameInput,
  InitializeRequest,
  ReducerSessionState,
} from "../src/shared/runtime-types";

const request: InitializeRequest = { table: {}, playerIds: [], rngSeed: null };
const input: GameInput = {
  kind: "interaction",
  basis: {
    sessionId: "type-test",
    version: 1,
    perspectivePlayerId: "p",
    actionSetVersion: "type-test",
  },
  playerId: "p",
  interactionId: "play",
  params: [null, { nested: true }],
};
const json: RuntimeJson = input.params;
// @ts-expect-error JSON does not include undefined.
const invalidJson: RuntimeJson = undefined;
// @ts-expect-error Interaction identities are required.
const invalidInput: GameInput = { kind: "interaction", params: {} };
// @ts-expect-error The removed fingerprint metadata is not a session field.
type RemovedMetadata = ReducerSessionState["meta"];
void request;
void json;
void invalidJson;
void invalidInput;

import type { SourceSnapshot } from "../src/headless/sources/types.js";
declare const snapshot: SourceSnapshot;
const displayCard = snapshot.frame.zones.hand["player-1"].cardViewsById.card;
// @ts-expect-error Source snapshots own deeply immutable card properties.
displayCard.properties.value = 3;
// @ts-expect-error Source snapshots own immutable card identity.
displayCard.id = "replacement";
declare const propertyArray: Extract<
  typeof displayCard.properties.values,
  readonly unknown[]
>;
// @ts-expect-error Nested property arrays are immutable in source snapshots.
const mutableProperties: unknown[] = propertyArray;
void mutableProperties;

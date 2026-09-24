import type { RuntimeJson } from "../src/shared/runtime-json";
import type {
  GameInput,
  InitializeRequest,
  ReducerSessionState,
} from "../src/shared/runtime-types";

const request: InitializeRequest = { table: {}, playerIds: [], rngSeed: null };
const input: GameInput = {
  kind: "interaction",
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

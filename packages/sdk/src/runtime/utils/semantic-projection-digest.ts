import type {
  GameplaySnapshot,
  InteractionDescriptor,
  InteractionInputDescriptor,
  PluginRuntimeProjection,
} from "../types/plugin-state.js";

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

type CanonicalJson = JsonValue;

export const AUTHORIZED_SEAT_PROJECTION_DIGEST_VERSION =
  "authorized-seat-projection@2";

export function semanticProjectionDigestForState(
  state: PluginRuntimeProjection,
): string | null {
  const actorPlayerId = state.session.controllingPlayerId;
  if (!actorPlayerId) {
    return null;
  }
  const seatOrder = state.lobby?.seats.map((seat) => seat.playerId) ?? [];
  if (!seatOrder.includes(actorPlayerId)) {
    return null;
  }
  return hashJson(semanticSeatProjection(state, state.gameplay, seatOrder));
}

function semanticSeatProjection(
  state: PluginRuntimeProjection,
  gameplay: GameplaySnapshot,
  seatOrder: readonly string[],
): CanonicalJson {
  const playerToSeat = new Map(
    seatOrder.map((playerId, index) => [playerId, index] as const),
  );
  const actorPlayerId = state.session.controllingPlayerId;
  const actorSeat = actorPlayerId ? playerToSeat.get(actorPlayerId) : undefined;
  if (actorSeat === undefined) {
    throw new Error(
      `authorized projection player ${actorPlayerId ?? "__none__"} is not present in seat order`,
    );
  }

  return {
    digestVersion: AUTHORIZED_SEAT_PROJECTION_DIGEST_VERSION,
    actorSeat,
    currentStage: gameplay.currentStage ?? null,
    stageSeats: gameplay.activePlayers.map((playerId) =>
      canonicalizeSeatReference(playerId, playerToSeat),
    ),
    view: canonicalizeSemanticProjectionValue(state.view, playerToSeat),
    zones: canonicalizeSemanticProjectionValue(
      gameplay.zones ?? {},
      playerToSeat,
    ),
    availableInteractions: gameplay.availableInteractions.map((descriptor) =>
      semanticInteractionDescriptor(descriptor, playerToSeat),
    ),
  };
}

function semanticInteractionDescriptor(
  descriptor: InteractionDescriptor,
  playerToSeat: ReadonlyMap<string, number>,
): CanonicalJson {
  const inputs = descriptor.inputs.map((input) =>
    semanticInteractionInput(input, playerToSeat),
  );
  const { defaults, defaultProvenance } = collectDefaults(descriptor.inputs);
  return {
    interactionKey: descriptor.interactionKey,
    interactionId: descriptor.interactionId,
    stableIdentity: canonicalizeSemanticProjectionValue(
      `${descriptor.interactionKey}:${descriptor.interactionId}`,
      playerToSeat,
    ),
    kind: descriptor.kind,
    surface:
      descriptor.zoneId ??
      descriptor.zoneIds?.find((zoneId) => typeof zoneId === "string") ??
      null,
    commitMode:
      descriptor.commit.mode === "autoWhenReady" ? "autoWhenReady" : "manual",
    status: descriptor.availability.status ?? null,
    available: descriptor.availability.status === "available",
    inputs,
    defaults: canonicalizeSemanticProjectionValue(defaults, playerToSeat),
    defaultProvenance,
  };
}

function semanticInteractionInput(
  input: InteractionInputDescriptor,
  playerToSeat: ReadonlyMap<string, number>,
): CanonicalJson {
  const domain = asRecord(input.domain);
  const selection = asRecord(domain.selection);
  return {
    key: input.key,
    kind: input.kind,
    domain: canonicalizeSemanticProjectionValue(input.domain, playerToSeat),
    defaultValue:
      input.defaultValue === undefined
        ? null
        : canonicalizeSemanticProjectionValue(input.defaultValue, playerToSeat),
    defaultProvenance: input.defaultValue === undefined ? null : "input",
    selectionMode: stringField(selection, "mode"),
    min: numberField(domain),
    max: numberField(domain, "max"),
  };
}

function collectDefaults(inputs: readonly InteractionInputDescriptor[]): {
  defaults: Record<string, JsonValue>;
  defaultProvenance: Record<string, "input">;
} {
  const defaults: Record<string, JsonValue> = {};
  const defaultProvenance: Record<string, "input"> = {};
  for (const input of inputs) {
    if (input.defaultValue !== undefined) {
      defaults[input.key] = toCanonicalJson(input.defaultValue) as JsonValue;
      defaultProvenance[input.key] = "input";
    }
  }
  return { defaults, defaultProvenance };
}

function canonicalizeSemanticProjectionValue(
  value: unknown,
  playerToSeat: ReadonlyMap<string, number>,
): CanonicalJson {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return toCanonicalJson(value);
  }
  if (typeof value === "string") {
    return canonicalizeSeatReference(value, playerToSeat);
  }
  if (Array.isArray(value)) {
    return value.map((item) =>
      canonicalizeSemanticProjectionValue(item, playerToSeat),
    );
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key, item]) =>
            item !== undefined &&
            !SEMANTIC_PROJECTION_TRANSPORT_FIELDS.has(key),
        )
        .map(([key, item]) => [
          canonicalizeObjectKey(key, playerToSeat),
          canonicalizeSemanticProjectionProperty(key, item, playerToSeat),
        ]),
    );
  }
  return null;
}

function canonicalizeSemanticProjectionProperty(
  key: string,
  value: unknown,
  playerToSeat: ReadonlyMap<string, number>,
): CanonicalJson {
  const canonicalValue = canonicalizeSemanticProjectionValue(
    value,
    playerToSeat,
  );
  if (
    (key === "eligibleTargets" || key === "dependentCases") &&
    Array.isArray(canonicalValue)
  ) {
    return [...canonicalValue].sort((left, right) =>
      compareJson(canonicalJson(left), canonicalJson(right)),
    );
  }
  return canonicalValue;
}

function canonicalizeSeatReference(
  value: string,
  playerToSeat: ReadonlyMap<string, number>,
): CanonicalJson {
  const seat = playerToSeat.get(value);
  return seat === undefined ? value : { $seat: seat };
}

function canonicalizeObjectKey(
  key: string,
  playerToSeat: ReadonlyMap<string, number>,
): string {
  const seat = playerToSeat.get(key);
  return seat === undefined ? key : `$seat:${seat}`;
}

const SEMANTIC_PROJECTION_TRANSPORT_FIELDS = new Set([
  "availableInteractionRefs",
  "board",
  "cursor",
  "etag",
  "hydratedAt",
  "hydrationCursor",
  "hydrationSequence",
  "interactionRef",
  "interactionRefs",
  "lastEventId",
  "receivedAt",
  "sequence",
  "serverTime",
  "snapshotVersion",
  "transportSequence",
  "transportVersion",
  "updatedAt",
]);

function toCanonicalJson(value: unknown): CanonicalJson {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return value;
  }
  if (typeof value === "number") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toCanonicalJson(item));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, toCanonicalJson(item)]),
    );
  }
  return null;
}

function hashJson(value: CanonicalJson): string {
  return `sha256:${sha256Hex(canonicalJson(value))}`;
}

function canonicalJson(value: CanonicalJson): string {
  return JSON.stringify(canonicalizeJson(value));
}

function canonicalizeJson(value: CanonicalJson): CanonicalJson {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("canonical JSON contains a non-finite number");
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeJson(item));
  }
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => compareJson(left, right))
      .map(([key, item]) => [key, canonicalizeJson(item)]),
  );
}

function compareJson(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function stringField(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function numberField(
  record: Record<string, unknown>,
  key = "min",
): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function sha256Hex(input: string): string {
  const bytes = utf8Bytes(input);
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) {
    bytes.push(0);
  }
  for (let shift = 56; shift >= 0; shift -= 8) {
    bytes.push(Math.floor(bitLength / 2 ** shift) & 0xff);
  }

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const words = new Array<number>(64);

  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      const base = offset + index * 4;
      words[index] =
        ((bytes[base]! << 24) |
          (bytes[base + 1]! << 16) |
          (bytes[base + 2]! << 8) |
          bytes[base + 3]!) >>>
        0;
    }
    for (let index = 16; index < 64; index += 1) {
      const s0 =
        rotateRight(words[index - 15]!, 7) ^
        rotateRight(words[index - 15]!, 18) ^
        (words[index - 15]! >>> 3);
      const s1 =
        rotateRight(words[index - 2]!, 17) ^
        rotateRight(words[index - 2]!, 19) ^
        (words[index - 2]! >>> 10);
      words[index] = (words[index - 16]! + s0 + words[index - 7]! + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let index = 0; index < 64; index += 1) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + SHA256_K[index]! + words[index]!) >>> 0;
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((value) => value.toString(16).padStart(8, "0"))
    .join("");
}

function rotateRight(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

function utf8Bytes(input: string): number[] {
  return Array.from(new TextEncoder().encode(input));
}

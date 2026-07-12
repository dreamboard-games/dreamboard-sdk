import { Buffer } from "node:buffer";
import { digestPluginRuntimeJson } from "@dreamboard-games/plugin-runtime-contract";
import type {
  PerspectiveRef,
  ScenarioIdentity,
  Sha256Digest,
} from "../inspection/types.js";

const CURSOR_VERSION = 1;

type CursorPayload = {
  readonly version: typeof CURSOR_VERSION;
  readonly scenarioSourceDigest: Sha256Digest;
  readonly checkpointDigest: Sha256Digest;
  readonly perspective: PerspectiveRef;
  readonly seedOverride: number | null;
  readonly nextOrdinal: number;
};

export class ExploreCursorError extends Error {
  readonly code = "TEST_EXPLORE_CURSOR_STALE";
  readonly scenarioSourceDigest: Sha256Digest;
  readonly checkpointDigest: Sha256Digest;

  constructor(options: {
    readonly scenarioSourceDigest: Sha256Digest;
    readonly checkpointDigest: Sha256Digest;
  }) {
    super("The exploration cursor no longer matches scenario authority.");
    this.name = "ExploreCursorError";
    this.scenarioSourceDigest = options.scenarioSourceDigest;
    this.checkpointDigest = options.checkpointDigest;
  }
}

export function createExploreCursor(options: {
  readonly scenario: ScenarioIdentity;
  readonly checkpointDigest: Sha256Digest;
  readonly perspective: PerspectiveRef;
  readonly seedOverride?: number;
  readonly nextOrdinal: number;
}): string {
  assertOrdinal(options.nextOrdinal);
  const payload: CursorPayload = {
    version: CURSOR_VERSION,
    scenarioSourceDigest: options.scenario.sourceDigest,
    checkpointDigest: options.checkpointDigest,
    perspective: options.perspective,
    seedOverride: options.seedOverride ?? null,
    nextOrdinal: options.nextOrdinal,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const digest = digestPluginRuntimeJson(payload).slice("sha256:".length);
  return `dbx1.${encoded}.${digest}`;
}

export function readExploreCursor(options: {
  readonly cursor: string;
  readonly scenario: ScenarioIdentity;
  readonly checkpointDigest: Sha256Digest;
  readonly perspective: PerspectiveRef;
  readonly seedOverride?: number;
}): number {
  const stale = () => {
    throw new ExploreCursorError({
      scenarioSourceDigest: options.scenario.sourceDigest,
      checkpointDigest: options.checkpointDigest,
    });
  };
  const [prefix, encoded, digest, extra] = options.cursor.split(".");
  if (prefix !== "dbx1" || !encoded || !digest || extra !== undefined) stale();

  let payload: CursorPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as CursorPayload;
  } catch {
    return stale();
  }

  if (
    digestPluginRuntimeJson(payload).slice("sha256:".length) !== digest ||
    payload.version !== CURSOR_VERSION ||
    payload.scenarioSourceDigest !== options.scenario.sourceDigest ||
    payload.checkpointDigest !== options.checkpointDigest ||
    payload.seedOverride !== (options.seedOverride ?? null) ||
    JSON.stringify(payload.perspective) !== JSON.stringify(options.perspective)
  ) {
    return stale();
  }
  assertOrdinal(payload.nextOrdinal);
  return payload.nextOrdinal;
}

function assertOrdinal(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(
      "Explore cursor ordinal must be a non-negative safe integer.",
    );
  }
}

export interface FixtureEnvironmentInit {
  readonly clockIso: string;
  readonly randomSeed: string;
  readonly locale: "en-US";
  readonly timezone: "UTC";
  readonly reducedMotion: true;
  readonly network: "blocked";
}

export const defaultFixtureEnvironmentInit: FixtureEnvironmentInit = {
  clockIso: "2026-01-01T00:00:00.000Z",
  randomSeed: "dreamboard-ui-fixture",
  locale: "en-US",
  timezone: "UTC",
  reducedMotion: true,
  network: "blocked",
};

export type DeterministicIdFactory = () => string;

export function createDeterministicIdFactory(
  seed: string,
): DeterministicIdFactory {
  let cursor = 0;
  return () => {
    cursor += 1;
    return `fixture-${slug(seed)}-${cursor.toString(36).padStart(4, "0")}`;
  };
}

export function fixtureEnvironmentInitFor(options: {
  readonly clockIso: string;
  readonly randomSeed: string;
}): FixtureEnvironmentInit {
  return {
    ...defaultFixtureEnvironmentInit,
    clockIso: options.clockIso,
    randomSeed: options.randomSeed,
  };
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "seed"
  );
}

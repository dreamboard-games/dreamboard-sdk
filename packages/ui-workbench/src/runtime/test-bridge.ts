import type {
  FixtureHostEvent,
  FixtureHostHarness,
} from "@dreamboard-games/sdk/testing";

export interface UIFixtureTestBridge {
  getScenarioId(): string;
  getFrameId(): string;
  getHostEvents(): readonly FixtureHostEvent[];
  getRuntimeEvents(): readonly FixtureHostEvent[];
  getProjectionDigest(): string;
  reset(): Promise<void>;
  assertConsumed(): void;
}

declare global {
  interface Window {
    __dreamboardUIFixture?: UIFixtureTestBridge;
  }
}

export function installUIFixtureTestBridge(options: {
  readonly scenarioId: string;
  readonly harness: FixtureHostHarness;
  readonly enabled: boolean;
}): void {
  if (!options.enabled) {
    return;
  }
  window.__dreamboardUIFixture = {
    getScenarioId: () => options.scenarioId,
    getFrameId: () => options.harness.getCurrentFrameId(),
    getHostEvents: () => options.harness.getEvents(),
    getRuntimeEvents: () => options.harness.getEvents(),
    getProjectionDigest: () => {
      const frameId = options.harness.getCurrentFrameId();
      const frame = options.harness.tape.frames.find(
        (candidate) => candidate.id === frameId,
      );
      if (!frame) {
        throw new Error(`Current fixture frame '${frameId}' is missing.`);
      }
      return frame.projectionDigest;
    },
    reset: async () => {
      options.harness.reset();
      await options.harness.flush();
    },
    assertConsumed: () => {
      options.harness.assertConsumed();
    },
  };
}

export function uninstallUIFixtureTestBridge(): void {
  delete window.__dreamboardUIFixture;
}

export {};

import type {
  BrowserFixtureHostEvent,
  BrowserFixtureHostHarness,
  BrowserUIScenarioFixture,
  BrowserUIReplayStep,
} from "./browser-fixture-runtime.js";
import type { PluginRuntimeClient } from "@dreamboard-games/sdk/runtime";

export interface UIFixtureTestBridge {
  getScenarioId(): string;
  getFrameId(): string;
  getHostEvents(): readonly BrowserFixtureHostEvent[];
  getRuntimeEvents(): readonly BrowserFixtureHostEvent[];
  getProjectionDigest(): string;
  getReplaySteps(): readonly BrowserUIReplayStep[];
  getExpected(): BrowserUIScenarioFixture["expected"];
  flush(): Promise<void>;
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
  readonly harness: BrowserFixtureHostHarness;
  readonly runtime: PluginRuntimeClient;
  readonly replay: readonly BrowserUIReplayStep[];
  readonly expected: BrowserUIScenarioFixture["expected"];
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
    getReplaySteps: () => options.replay,
    getExpected: () => options.expected,
    flush: () => options.harness.flush(),
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

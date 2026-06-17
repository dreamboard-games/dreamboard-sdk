import type React from "react";
import {
  createPluginRuntimeClient,
  type PluginRuntimeClient,
} from "@dreamboard-games/sdk/runtime";
import {
  createDeterministicIdFactory,
  createFixtureHostHarness,
  parseUIScenarioFixture,
  type FixtureHostHarness,
  type UIScenarioFixture,
} from "@dreamboard-games/sdk/testing";

export type SDKCandidateMode =
  | {
      readonly kind: "source";
      readonly sdkRoot: string;
    }
  | {
      readonly kind: "packed";
      readonly tarball: string;
      readonly sha256: string;
    };

export interface UIScenarioRenderModule {
  readonly Root: React.ComponentType;
  readonly uiContractFingerprint: string;
}

export interface LoadedUIScenario {
  readonly fixture: UIScenarioFixture;
  readonly module: UIScenarioRenderModule;
  readonly harness: FixtureHostHarness;
  readonly runtime: PluginRuntimeClient;
  readonly sdkCandidate: SDKCandidateMode;
}

export interface CreatedUIScenarioRuntime {
  readonly harness: FixtureHostHarness;
  readonly runtime: PluginRuntimeClient;
}

export async function loadUIScenarioFixture(
  fixtureUrl: string,
): Promise<UIScenarioFixture> {
  const response = await fetch(fixtureUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to load UI scenario fixture '${fixtureUrl}': ${response.status} ${response.statusText}`,
    );
  }
  return parseUIScenarioFixture(await response.json());
}

export async function loadUIScenarioRenderModule(
  renderModuleUrl: string,
): Promise<UIScenarioRenderModule> {
  const module = (await import(
    /* @vite-ignore */ renderModuleUrl
  )) as Partial<UIScenarioRenderModule>;
  if (typeof module.uiContractFingerprint !== "string") {
    throw new Error(
      `Render module '${renderModuleUrl}' is missing uiContractFingerprint.`,
    );
  }
  if (typeof module.Root !== "function") {
    throw new Error(`Render module '${renderModuleUrl}' is missing Root.`);
  }
  return {
    Root: module.Root,
    uiContractFingerprint: module.uiContractFingerprint,
  };
}

export function assertContractFingerprint(
  renderModuleFingerprint: string,
  fixtureFingerprint: string,
): void {
  if (renderModuleFingerprint !== fixtureFingerprint) {
    throw new Error(
      `UI scenario render module fingerprint ${renderModuleFingerprint} does not match fixture fingerprint ${fixtureFingerprint}. Regenerate the UI fixture bundle.`,
    );
  }
}

export async function loadUIScenario(options: {
  readonly fixtureUrl: string;
  readonly renderModuleUrl: string;
  readonly sdkCandidate: SDKCandidateMode;
  readonly strict?: boolean;
  readonly latencyMs?: number;
}): Promise<LoadedUIScenario> {
  const fixture = await loadUIScenarioFixture(options.fixtureUrl);
  const module = await loadUIScenarioRenderModule(options.renderModuleUrl);
  assertContractFingerprint(
    module.uiContractFingerprint,
    fixture.source.uiContractFingerprint,
  );
  const { harness, runtime } = createUIScenarioRuntime({
    fixture,
    strict: options.strict,
    latencyMs: options.latencyMs,
  });
  return {
    fixture,
    module,
    harness,
    runtime,
    sdkCandidate: options.sdkCandidate,
  };
}

export function createUIScenarioRuntime(options: {
  readonly fixture: UIScenarioFixture;
  readonly strict?: boolean;
  readonly latencyMs?: number;
}): CreatedUIScenarioRuntime {
  const clockMs = Date.parse(options.fixture.environment.clockIso);
  if (!Number.isFinite(clockMs)) {
    throw new Error(
      `UI scenario fixture '${options.fixture.id}' has an invalid clockIso '${options.fixture.environment.clockIso}'.`,
    );
  }
  const nextDeterministicId = createDeterministicIdFactory(
    `${options.fixture.id}:${options.fixture.environment.randomSeed}`,
  );
  const clock = { now: () => clockMs };
  const harness = createFixtureHostHarness({
    tape: options.fixture.protocol,
    strict: options.strict ?? true,
    latencyMs: options.latencyMs ?? 0,
    nowMs: clock.now,
  });
  const runtime = createPluginRuntimeClient({
    transport: harness.transport,
    clock,
    idFactory: {
      nextId: (prefix) => `${prefix}-${nextDeterministicId()}`,
    },
  });
  return {
    harness,
    runtime,
  };
}

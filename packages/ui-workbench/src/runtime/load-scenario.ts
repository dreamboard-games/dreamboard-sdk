import type React from "react";
import {
  createFixtureRuntime,
  parseUIScenarioFixture,
  type FixtureRuntimeHarness,
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
  readonly harness: FixtureRuntimeHarness;
  readonly sdkCandidate: SDKCandidateMode;
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
  const harness = createFixtureRuntime({
    fixture,
    strict: options.strict ?? true,
    latencyMs: options.latencyMs ?? 0,
  });
  return {
    fixture,
    module,
    harness,
    sdkCandidate: options.sdkCandidate,
  };
}

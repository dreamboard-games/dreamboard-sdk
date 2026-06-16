import React from "react";
import { PluginRuntimeBoundary } from "../../runtime/components/PluginRuntimeBoundary.js";
import type { FixtureRuntimeHarness } from "./create-fixture-runtime.js";

export function FixturePluginRuntime({
  harness,
  children,
}: {
  harness: FixtureRuntimeHarness;
  children: React.ReactNode;
}) {
  return (
    <PluginRuntimeBoundary runtime={harness.runtime}>
      {children}
    </PluginRuntimeBoundary>
  );
}

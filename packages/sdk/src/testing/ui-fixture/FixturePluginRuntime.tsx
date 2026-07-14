import React, { useMemo } from "react";
import { createPluginRuntimeClient } from "../../runtime/core/create-plugin-runtime-client.js";
import { PluginRuntimeBoundary } from "../../runtime/components/PluginRuntimeBoundary.js";
import type { PluginRuntimeClient } from "../../runtime/core/types.js";
import type { FixtureHostHarness } from "./create-fixture-host-harness.js";

export function FixturePluginRuntime({
  harness,
  runtime,
  children,
}: {
  harness: FixtureHostHarness;
  runtime?: PluginRuntimeClient;
  children: React.ReactNode;
}) {
  const fixtureRuntime = useMemo(
    () =>
      runtime ?? createPluginRuntimeClient({ transport: harness.transport }),
    [harness.transport, runtime],
  );
  return (
    <PluginRuntimeBoundary runtime={fixtureRuntime}>
      {children}
    </PluginRuntimeBoundary>
  );
}

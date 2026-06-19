import React, { useEffect, useMemo, useState } from "react";
import {
  installUIFixtureTestBridge,
  uninstallUIFixtureTestBridge,
} from "./runtime/test-bridge.js";
import type { UIScenarioCatalogEntry } from "./catalog.js";
import { JsonPanel } from "./inspectors/JsonPanel.js";
import { createInPageReplayAdapter } from "./replay/in-page-adapter.js";
import {
  ReplayStepExecutionError,
  runReplaySequence,
} from "./replay/replay-runner.js";
import type {
  ReplayStepDiagnostics,
  WorkbenchSemanticReplayStep,
} from "./replay/replay-plan.js";
import {
  BrowserFixtureRuntime,
  loadBrowserUIScenario,
  type LoadedBrowserUIScenario,
} from "./runtime/browser-fixture-runtime.js";

type ScenarioStatus = "loading" | "ready" | "failed" | "complete";
type ViewportMode = "desktop" | "tablet" | "phone";

function initialViewport(entry: UIScenarioCatalogEntry): ViewportMode {
  if (entry.viewportTags.includes("phone")) return "phone";
  if (entry.viewportTags.includes("tablet")) return "tablet";
  return "desktop";
}

function currentFrame(loaded: LoadedBrowserUIScenario | null) {
  if (!loaded) return null;
  const frameId = loaded.harness.getCurrentFrameId();
  return (
    loaded.fixture.protocol.frames.find(
      (candidate) => candidate.id === frameId,
    ) ?? null
  );
}

function replaySteps(loaded: LoadedBrowserUIScenario | null) {
  return (
    loaded?.fixture.replay.filter(
      (step): step is WorkbenchSemanticReplayStep => "resolve" in step,
    ) ?? []
  );
}

export function ScenarioPage({
  entry,
  panel,
  testMode,
}: {
  readonly entry: UIScenarioCatalogEntry;
  readonly panel: string;
  readonly testMode: boolean;
}) {
  const [loaded, setLoaded] = useState<LoadedBrowserUIScenario | null>(null);
  const [status, setStatus] = useState<ScenarioStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<ViewportMode>(() =>
    initialViewport(entry),
  );
  const [revision, setRevision] = useState(0);
  const [replayDiagnostics, setReplayDiagnostics] = useState<
    readonly ReplayStepDiagnostics[]
  >([]);

  useEffect(() => {
    let active = true;
    let unsubscribeFrame: (() => void) | undefined;
    setStatus("loading");
    setError(null);
    setLoaded(null);
    setReplayDiagnostics([]);

    loadBrowserUIScenario({
      fixtureUrl: entry.fixtureUrl,
      renderModuleUrl: entry.renderModuleUrl,
      renderModuleLoader: entry.renderModuleLoader,
    })
      .then(async (nextLoaded) => {
        await nextLoaded.harness.flush();
        if (!active) {
          nextLoaded.runtime.disconnect();
          return;
        }
        setLoaded(nextLoaded);
        setStatus("ready");
        installUIFixtureTestBridge({
          scenarioId: entry.id,
          harness: nextLoaded.harness,
          runtime: nextLoaded.runtime,
          replay: nextLoaded.fixture.replay,
          enabled: testMode,
        });
        unsubscribeFrame = nextLoaded.runtime.subscribeFrame(() => {
          setRevision((value) => value + 1);
        });
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus("failed");
      });

    return () => {
      active = false;
      unsubscribeFrame?.();
      uninstallUIFixtureTestBridge();
      setLoaded((previous) => {
        previous?.runtime.disconnect();
        return null;
      });
    };
  }, [entry.fixtureUrl, entry.id, entry.renderModuleUrl, testMode]);

  const frame = useMemo(() => currentFrame(loaded), [loaded, revision]);
  const events = loaded?.harness.getEvents() ?? [];
  const replay = replaySteps(loaded);
  const Root = loaded?.module.Root;

  async function resetScenario() {
    if (!loaded) return;
    setStatus("loading");
    setReplayDiagnostics([]);
    loaded.harness.reset();
    await loaded.harness.flush();
    setRevision((value) => value + 1);
    setStatus("ready");
  }

  async function replayScenario() {
    if (!loaded || replay.length === 0) return;
    setStatus("loading");
    try {
      const evidence = await runReplaySequence(
        createInPageReplayAdapter({ harness: loaded.harness }),
        replay,
      );
      setReplayDiagnostics(evidence.map((step) => step.diagnostics));
      setRevision((value) => value + 1);
      setStatus("complete");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      if (cause instanceof ReplayStepExecutionError) {
        setReplayDiagnostics((previous) => [...previous, cause.diagnostics]);
      } else {
        const firstStep = replay[0];
        if (firstStep) {
          setReplayDiagnostics((previous) => [
            ...previous,
            {
              stepId: firstStep.stepId,
              request: firstStep.resolve,
              requestDigest: firstStep.requestDigest,
              expectedSemanticDigest: firstStep.expect.semanticDigest,
              firstFailure: message,
            },
          ]);
        }
      }
      setError(message);
      setStatus("failed");
    }
  }

  return (
    <main
      className={`workbench scenario-view scenario-view--${viewport} ${
        testMode ? "scenario-view--test" : ""
      }`}
      data-dreamboard-workbench="scenario"
      data-dreamboard-scenario-id={entry.id}
      data-dreamboard-scenario-status={status}
      data-dreamboard-frame-id={frame?.id ?? "none"}
    >
      {!testMode ? (
        <header className="scenario-header">
          <div>
            <p>{entry.gameId}</p>
            <h1>{entry.title}</h1>
          </div>
          <div className="toolbar">
            {(["desktop", "tablet", "phone"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={viewport === mode}
                onClick={() => setViewport(mode)}
              >
                {mode}
              </button>
            ))}
            <button type="button" onClick={() => void resetScenario()}>
              Reset
            </button>
            <button
              type="button"
              onClick={() => void replayScenario()}
              disabled={!loaded || replay.length === 0}
            >
              Replay
            </button>
          </div>
        </header>
      ) : null}

      <div className="scenario-layout">
        <section className="fixture-stage" aria-label="Scenario" tabIndex={0}>
          {status === "failed" ? (
            <div className="error-state">{error}</div>
          ) : Root && loaded ? (
            <BrowserFixtureRuntime
              key={`${entry.id}:${revision === -1 ? "reset" : "runtime"}`}
              harness={loaded.harness}
              runtime={loaded.runtime}
            >
              <Root />
            </BrowserFixtureRuntime>
          ) : (
            <div className="loading-state">Loading scenario</div>
          )}
        </section>

        {!testMode ? (
          <aside className="inspector-stack">
            <div className="digest-strip">
              <span>Frame {frame?.id ?? "none"}</span>
              <span>{frame?.projectionDigest ?? "no projection"}</span>
            </div>
            {panel === "runtime" ? (
              <JsonPanel title="Runtime transcript" value={events} />
            ) : (
              <JsonPanel
                title="Semantic snapshot"
                value={{
                  scenarioId: entry.id,
                  frameId: frame?.id ?? null,
                  projectionDigest: frame?.projectionDigest ?? null,
                  expected: loaded?.fixture.expected ?? null,
                  replay: loaded?.fixture.replay ?? [],
                  replayDiagnostics,
                }}
              />
            )}
            <JsonPanel
              title="Fixture metadata"
              value={{
                sourceDigest: entry.sourceDigest,
                components: entry.components,
                capabilities: entry.capabilities,
                viewportTags: entry.viewportTags,
                renderModuleUrl: entry.renderModuleUrl,
              }}
            />
          </aside>
        ) : null}
      </div>
    </main>
  );
}

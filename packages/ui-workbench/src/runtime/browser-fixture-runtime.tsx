import React, { useMemo } from "react";
import {
  DREAMBOARD_PLUGIN_PROTOCOL,
  DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
  type HostToPluginEnvelope,
  type PluginProtocolTape,
  type PluginToHostPayload,
} from "@dreamboard-games/sdk/plugin-runtime-contract";
import {
  createPluginRuntimeClient,
  PluginRuntimeBoundary,
  type PluginRuntimeClient,
  type PluginTransport,
} from "@dreamboard-games/sdk/runtime";
import type { UIScenarioReplayStep } from "@dreamboard-games/sdk/testing";

export interface BrowserUIScenarioFixture {
  readonly schemaVersion: number;
  readonly id: string;
  readonly title: string;
  readonly gameId: string;
  readonly source: {
    readonly uiContractFingerprint: string;
    readonly sourceDigest: string;
  };
  readonly environment: {
    readonly clockIso: string;
    readonly randomSeed: string;
    readonly viewportTags: readonly string[];
  };
  readonly protocol: PluginProtocolTape;
  readonly replay: readonly BrowserUIReplayStep[];
  readonly expected: {
    readonly initialProjectionDigest: string;
    readonly finalProjectionDigest: string;
    readonly finalSemanticDigest: string;
    readonly submissionDigest: string;
  };
}

export type BrowserUIReplayStep = UIScenarioReplayStep;

export interface BrowserFixtureHostEvent {
  readonly sequence: number;
  readonly kind:
    | "frame-sent"
    | "submit-received"
    | "ack-received"
    | "ready-received"
    | "diagnostic";
  readonly frameId?: string;
  readonly projectionDigest?: string;
  readonly result?: "accepted" | "rejected";
}

export interface BrowserFixtureHostHarness {
  readonly tape: PluginProtocolTape;
  readonly transport: PluginTransport;
  reset(): void;
  flush(): Promise<void>;
  getCurrentFrameId(): string;
  getEvents(): readonly BrowserFixtureHostEvent[];
  assertConsumed(): void;
}

export interface UIScenarioRenderModule {
  readonly Root: React.ComponentType;
  readonly uiContractFingerprint: string;
}

export interface LoadedBrowserUIScenario {
  readonly fixture: BrowserUIScenarioFixture;
  readonly module: UIScenarioRenderModule;
  readonly harness: BrowserFixtureHostHarness;
  readonly runtime: PluginRuntimeClient;
}

export async function loadBrowserUIScenario(options: {
  readonly fixtureUrl: string;
  readonly renderModuleUrl: string;
  readonly renderModuleLoader?: () => Promise<unknown>;
}): Promise<LoadedBrowserUIScenario> {
  const fixtureResponse = await fetch(options.fixtureUrl);
  if (!fixtureResponse.ok) {
    throw new Error(
      `Failed to load UI scenario fixture '${options.fixtureUrl}': ${fixtureResponse.status} ${fixtureResponse.statusText}`,
    );
  }
  const fixture = (await fixtureResponse.json()) as BrowserUIScenarioFixture;
  const module = (
    options.renderModuleLoader
      ? await options.renderModuleLoader()
      : await import(/* @vite-ignore */ options.renderModuleUrl)
  ) as Partial<UIScenarioRenderModule>;
  if (typeof module.Root !== "function") {
    throw new Error(
      `Render module '${options.renderModuleUrl}' is missing Root.`,
    );
  }
  if (module.uiContractFingerprint !== fixture.source.uiContractFingerprint) {
    throw new Error(
      `UI scenario render module fingerprint ${String(
        module.uiContractFingerprint,
      )} does not match fixture fingerprint ${fixture.source.uiContractFingerprint}. Regenerate the UI fixture bundle.`,
    );
  }
  const harness = createBrowserFixtureHostHarness(fixture.protocol);
  const runtime = createPluginRuntimeClient({ transport: harness.transport });
  return {
    fixture,
    module: {
      Root: module.Root,
      uiContractFingerprint: module.uiContractFingerprint,
    },
    harness,
    runtime,
  };
}

export function BrowserFixtureRuntime({
  harness,
  runtime,
  children,
}: {
  readonly harness: BrowserFixtureHostHarness;
  readonly runtime: PluginRuntimeClient;
  readonly children: React.ReactNode;
}) {
  const fixtureRuntime = useMemo(() => runtime, [runtime]);
  return (
    <PluginRuntimeBoundary runtime={fixtureRuntime}>
      {children}
    </PluginRuntimeBoundary>
  );
}

function createBrowserFixtureHostHarness(
  tape: PluginProtocolTape,
): BrowserFixtureHostHarness {
  const frameById = new Map(tape.frames.map((frame) => [frame.id, frame]));
  const events: BrowserFixtureHostEvent[] = [];
  let onMessage: ((message: HostToPluginEnvelope) => void) | null = null;
  let eventSequence = 0;
  let envelopeSequence = 0;
  let stepCursor = 0;
  let currentFrameId: string | null = null;
  let firstError: Error | null = null;
  const pending = new Set<Promise<void>>();

  function record(event: Omit<BrowserFixtureHostEvent, "sequence">) {
    events.push({ sequence: ++eventSequence, ...event });
  }

  function fail(message: string): never {
    record({ kind: "diagnostic" });
    throw new Error(message);
  }

  function remember(error: unknown) {
    if (!firstError) {
      firstError = error instanceof Error ? error : new Error(String(error));
    }
  }

  function send(payload: HostToPluginEnvelope["payload"]) {
    onMessage?.({
      protocol: DREAMBOARD_PLUGIN_PROTOCOL,
      version: DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
      channelId: "ui-workbench-fixture",
      sequence: ++envelopeSequence,
      payload,
    });
  }

  function publishFrame(frameId: string) {
    const frame = frameById.get(frameId);
    if (!frame) {
      fail(`Plugin protocol tape references missing frame '${frameId}'.`);
    }
    currentFrameId = frame.id;
    record({
      kind: "frame-sent",
      frameId: frame.id,
      projectionDigest: frame.projectionDigest,
    });
    send({ type: "gameplay.frame", frame: frame.frame });
  }

  function drainHostFrames() {
    while (tape.steps[stepCursor]?.kind === "host.frame") {
      const step = tape.steps[stepCursor] as Extract<
        PluginProtocolTape["steps"][number],
        { kind: "host.frame" }
      >;
      stepCursor += 1;
      publishFrame(step.frameId);
    }
  }

  function consume(kind: "client.submit") {
    const step = tape.steps[stepCursor];
    if (!step) {
      fail(`Plugin protocol tape has no remaining step for ${kind}.`);
    }
    if (step.kind !== kind) {
      fail(`Expected protocol step '${step.kind}' but received '${kind}'.`);
    }
    if (step.fromFrameId !== currentFrameId) {
      fail(
        `Expected protocol from frame '${step.fromFrameId}' but current frame is '${currentFrameId ?? "<none>"}'.`,
      );
    }
    stepCursor += 1;
    return step as Extract<
      PluginProtocolTape["steps"][number],
      { kind: typeof kind }
    >;
  }

  async function handlePayload(payload: PluginToHostPayload) {
    switch (payload.type) {
      case "runtime.ready":
        record({ kind: "ready-received" });
        break;
      case "runtime.ack":
        record({ kind: "ack-received" });
        break;
      case "runtime.error":
        record({ kind: "diagnostic" });
        break;
      case "interaction.submit": {
        const step = consume("client.submit") as Extract<
          PluginProtocolTape["steps"][number],
          { kind: "client.submit" }
        >;
        record({
          kind: "submit-received",
          result: step.response.accepted ? "accepted" : "rejected",
        });
        send({
          ...step.response,
          clientActionId: payload.clientActionId,
        });
        if (step.response.accepted) {
          drainHostFrames();
        }
        break;
      }
      default: {
        const _exhaustive: never = payload;
        return _exhaustive;
      }
    }
  }

  return {
    tape,
    transport: {
      start(nextOnMessage) {
        onMessage = nextOnMessage;
        queueMicrotask(() => {
          send({ type: "runtime.init", session: tape.session });
          drainHostFrames();
        });
        return () => {
          onMessage = null;
        };
      },
      send(message) {
        const task = handlePayload(message)
          .catch(remember)
          .finally(() => pending.delete(task));
        pending.add(task);
      },
    },
    reset() {
      eventSequence = 0;
      envelopeSequence = 0;
      stepCursor = 0;
      currentFrameId = null;
      firstError = null;
      events.length = 0;
      pending.clear();
      if (onMessage) {
        send({ type: "runtime.init", session: tape.session });
        drainHostFrames();
      }
    },
    async flush() {
      await Promise.resolve();
      while (pending.size > 0) {
        await Promise.allSettled([...pending]);
      }
      if (firstError) {
        throw firstError;
      }
    },
    getCurrentFrameId() {
      if (!currentFrameId) {
        fail("Fixture host has not emitted a gameplay frame.");
      }
      return currentFrameId;
    },
    getEvents() {
      return events.map((event) => ({ ...event }));
    },
    assertConsumed() {
      if (firstError) {
        throw firstError;
      }
      if (stepCursor !== tape.steps.length) {
        fail(
          `Plugin protocol tape consumed ${stepCursor} of ${tape.steps.length} protocol step(s).`,
        );
      }
    },
  };
}

import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { PluginRuntimeBoundary } from "../components/PluginRuntimeBoundary.js";
import { pluginGameplayFrameFromStateSnapshot } from "../context/PluginGameplayFrameContext.js";
import { usePluginState } from "../context/PluginStateContext.js";
import type { PluginRuntimeClient } from "../core/types.js";
import type { PluginStateSnapshot } from "../types/plugin-state.js";
import { useGameSelector } from "./useGameSelector.js";

beforeAll(() => {
  GlobalRegistrator.register({ width: 1024, height: 768 });
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
});

afterAll(() => {
  GlobalRegistrator.unregister();
});

afterEach(() => {
  document.body.replaceChildren();
});

interface MountedDom {
  host: HTMLDivElement;
  root: Root;
}

async function mountIntoDom(element: React.ReactElement): Promise<MountedDom> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(element);
  });
  return { host, root };
}

async function unmount({ host, root }: MountedDom): Promise<void> {
  await act(async () => {
    root.unmount();
  });
  host.remove();
}

type TestView = {
  score: number;
};

function makeSnapshot({
  syncId,
  controllingPlayerId = "player-1",
  phase = "play",
  score = 0,
}: {
  syncId: number;
  controllingPlayerId?: string;
  phase?: string;
  score?: number;
}): PluginStateSnapshot<TestView> {
  return {
    view: { score },
    gameplay: {
      currentPhase: phase,
      currentStage: null,
      activePlayers: ["player-1"],
      simultaneousPhase: null,
      availableInteractions: [],
      zones: {},
    },
    lobby: null,
    notifications: [
      {
        id: `n-${syncId}`,
        type: "STATE_CHANGED",
        payload: { type: "STATE_CHANGED", newState: `sync-${syncId}` },
        timestamp: syncId,
        read: false,
      },
    ],
    session: {
      sessionId: "session-1",
      controllablePlayerIds: ["player-1", "player-2"],
      controllingPlayerId,
      userId: "user-1",
      status: "ready",
    },
    history: null,
    syncId,
  };
}

function makeRuntime(initialSnapshot: PluginStateSnapshot<TestView>) {
  let snapshot = initialSnapshot;
  let frame = pluginGameplayFrameFromStateSnapshot(snapshot);
  const frameListeners = new Set<() => void>();
  const sessionListeners = new Set<() => void>();
  const runtime: PluginRuntimeClient = {
    getSession: () => ({
      sessionId: snapshot.session.sessionId ?? "session-1",
      players: snapshot.session.controllablePlayerIds.map((playerId) => ({
        playerId,
        displayName: playerId,
      })),
    }),
    subscribeSession: (listener) => {
      sessionListeners.add(listener);
      return () => {
        sessionListeners.delete(listener);
      };
    },
    getFrame: () => frame,
    subscribeFrame: (listener) => {
      frameListeners.add(listener);
      return () => {
        frameListeners.delete(listener);
      };
    },
    validateInteraction: async () => ({ valid: true }),
    submitInteraction: async () => undefined,
    disconnect: () => undefined,
  };
  return {
    runtime,
    emit(nextSnapshot: PluginStateSnapshot<TestView>) {
      snapshot = nextSnapshot;
      frame = pluginGameplayFrameFromStateSnapshot(snapshot);
      for (const listener of sessionListeners) {
        listener();
      }
      for (const listener of frameListeners) {
        listener();
      }
    },
  };
}

function shallowEqualRecord(
  left: Readonly<Record<string, unknown>>,
  right: Readonly<Record<string, unknown>>,
): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => Object.is(left[key], right[key]));
}

test("usePluginState skips rerenders when a primitive selection is unchanged", async () => {
  const harness = makeRuntime(makeSnapshot({ syncId: 1 }));
  let renders = 0;

  function SelectedPlayer() {
    const playerId = usePluginState(
      (state) => state.session.controllingPlayerId,
    );
    renders += 1;
    return createElement("span", null, playerId);
  }

  const mounted = await mountIntoDom(
    createElement(
      PluginRuntimeBoundary,
      { runtime: harness.runtime },
      createElement(SelectedPlayer),
    ),
  );

  expect(renders).toBe(1);

  await act(async () => {
    for (let syncId = 2; syncId <= 101; syncId += 1) {
      harness.emit(makeSnapshot({ syncId }));
    }
  });
  expect(renders).toBe(1);

  await act(async () => {
    harness.emit(
      makeSnapshot({ syncId: 102, controllingPlayerId: "player-2" }),
    );
  });
  expect(renders).toBe(2);

  await unmount(mounted);
});

test("usePluginState applies explicit equality for allocated selections", async () => {
  const harness = makeRuntime(makeSnapshot({ syncId: 1 }));
  let objectIsRenders = 0;
  let shallowRenders = 0;

  function ObjectIsSelection() {
    usePluginState((state) => ({ phase: state.gameplay.currentPhase }));
    objectIsRenders += 1;
    return null;
  }

  function ShallowSelection() {
    usePluginState(
      (state) => ({ phase: state.gameplay.currentPhase }),
      shallowEqualRecord,
    );
    shallowRenders += 1;
    return null;
  }

  const mounted = await mountIntoDom(
    createElement(
      PluginRuntimeBoundary,
      { runtime: harness.runtime },
      createElement(ObjectIsSelection),
      createElement(ShallowSelection),
    ),
  );

  expect(objectIsRenders).toBe(1);
  expect(shallowRenders).toBe(1);

  await act(async () => {
    harness.emit(makeSnapshot({ syncId: 2 }));
  });
  expect(objectIsRenders).toBe(2);
  expect(shallowRenders).toBe(1);

  await act(async () => {
    harness.emit(makeSnapshot({ syncId: 3, phase: "score" }));
  });
  expect(objectIsRenders).toBe(3);
  expect(shallowRenders).toBe(2);

  await unmount(mounted);
});

test("usePluginState applies a changed selector on the next render", async () => {
  const harness = makeRuntime(makeSnapshot({ syncId: 1, phase: "play" }));
  let selected: string | null = null;

  function SelectedValue({ mode }: { mode: "player" | "phase" }) {
    selected = usePluginState((state) =>
      mode === "player"
        ? (state.session.controllingPlayerId ?? "none")
        : state.gameplay.currentPhase,
    );
    return createElement("span", null, selected);
  }

  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(
      createElement(
        PluginRuntimeBoundary,
        { runtime: harness.runtime },
        createElement(SelectedValue, { mode: "player" }),
      ),
    );
  });
  expect(selected).toBe("player-1");

  await act(async () => {
    root.render(
      createElement(
        PluginRuntimeBoundary,
        { runtime: harness.runtime },
        createElement(SelectedValue, { mode: "phase" }),
      ),
    );
  });
  expect(selected).toBe("play");

  await unmount({ host, root });
});

test("useGameSelector shares selective subscription behavior", async () => {
  const harness = makeRuntime(makeSnapshot({ syncId: 1, score: 7 }));
  let renders = 0;
  let score = 0;

  function SelectedScore() {
    score = useGameSelector((view) => (view as TestView).score);
    renders += 1;
    return createElement("span", null, score);
  }

  const mounted = await mountIntoDom(
    createElement(
      PluginRuntimeBoundary,
      { runtime: harness.runtime },
      createElement(SelectedScore),
    ),
  );

  expect(renders).toBe(1);
  expect(score).toBe(7);

  await act(async () => {
    for (let syncId = 2; syncId <= 101; syncId += 1) {
      harness.emit(makeSnapshot({ syncId, score: 7 }));
    }
  });
  expect(renders).toBe(1);

  await act(async () => {
    harness.emit(makeSnapshot({ syncId: 102, score: 8 }));
  });
  expect(renders).toBe(2);
  expect(score).toBe(8);

  await unmount(mounted);
});

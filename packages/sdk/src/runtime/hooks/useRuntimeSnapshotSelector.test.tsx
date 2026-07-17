import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { createElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { PluginRuntimeBoundary } from "../components/PluginRuntimeBoundary.js";
import { usePluginGameplayFrameSelector } from "../context/PluginGameplayFrameContext.js";
import { usePluginSession } from "../context/PluginSessionContext.js";
import {
  makeTestGameplayFrame,
  makeTestRuntimeHarness,
} from "../test-runtime-harness.js";
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
  gameVersion,
  controllingPlayerId = "player-1",
  phase = "play",
  score = 0,
}: {
  gameVersion: number;
  controllingPlayerId?: string;
  phase?: string;
  score?: number;
}) {
  return makeTestGameplayFrame<TestView>({
    gameVersion,
    view: { score },
    perspectivePlayerId: controllingPlayerId,
    currentPhase: phase,
  });
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

test("usePluginSession skips rerenders when perspective is unchanged", async () => {
  const harness = makeTestRuntimeHarness(makeSnapshot({ gameVersion: 1 }), {
    session: {
      sessionId: "session-1",
      players: [
        { playerId: "player-1", displayName: "Player One" },
        { playerId: "player-2", displayName: "Player Two" },
      ],
    },
  });
  let renders = 0;

  function SelectedPlayer() {
    const playerId = usePluginSession().controllingPlayerId;
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
    for (let gameVersion = 2; gameVersion <= 101; gameVersion += 1) {
      harness.emit(makeSnapshot({ gameVersion }));
    }
  });
  expect(renders).toBe(1);

  await act(async () => {
    harness.emit(
      makeSnapshot({ gameVersion: 102, controllingPlayerId: "player-2" }),
    );
  });
  expect(renders).toBe(2);

  await unmount(mounted);
});

test("usePluginGameplayFrameSelector applies explicit equality for allocated selections", async () => {
  const harness = makeTestRuntimeHarness(makeSnapshot({ gameVersion: 1 }));
  let objectIsRenders = 0;
  let shallowRenders = 0;

  function ObjectIsSelection() {
    usePluginGameplayFrameSelector((frame) => ({
      phase: frame.flow.currentPhase,
    }));
    objectIsRenders += 1;
    return null;
  }

  function ShallowSelection() {
    usePluginGameplayFrameSelector(
      (frame) => ({ phase: frame.flow.currentPhase }),
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
    harness.emit(makeSnapshot({ gameVersion: 2 }));
  });
  expect(objectIsRenders).toBe(2);
  expect(shallowRenders).toBe(1);

  await act(async () => {
    harness.emit(makeSnapshot({ gameVersion: 3, phase: "score" }));
  });
  expect(objectIsRenders).toBe(3);
  expect(shallowRenders).toBe(2);

  await unmount(mounted);
});

test("usePluginGameplayFrameSelector applies a changed selector on the next render", async () => {
  const harness = makeTestRuntimeHarness(
    makeSnapshot({ gameVersion: 1, phase: "play" }),
  );
  let selected: string | null = null;

  function SelectedValue({ mode }: { mode: "player" | "phase" }) {
    const session = usePluginSession();
    selected = usePluginGameplayFrameSelector((frame) =>
      mode === "player"
        ? (session.controllingPlayerId ?? "none")
        : frame.flow.currentPhase,
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
  const harness = makeTestRuntimeHarness(
    makeSnapshot({ gameVersion: 1, score: 7 }),
  );
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
    for (let gameVersion = 2; gameVersion <= 101; gameVersion += 1) {
      harness.emit(makeSnapshot({ gameVersion, score: 7 }));
    }
  });
  expect(renders).toBe(1);

  await act(async () => {
    harness.emit(makeSnapshot({ gameVersion: 102, score: 8 }));
  });
  expect(renders).toBe(2);
  expect(score).toBe(8);

  await unmount(mounted);
});

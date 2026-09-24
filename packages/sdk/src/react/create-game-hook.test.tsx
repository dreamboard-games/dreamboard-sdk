import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { act, StrictMode, useState, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { createGameHook } from "./create-game-hook.js";
import { createTestSource } from "../testing/sources/test-source.js";
import { frame, session } from "../headless/sources/__fixtures__/frames.js";
import type {
  SourceSnapshot,
  Drafts,
  GameInstance,
} from "../headless/model.js";

beforeAll(() => {
  GlobalRegistrator.register();
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());
const roots: Root[] = [];
afterEach(async () => {
  await act(async () => roots.splice(0).forEach((root) => root.unmount()));
  document.body.replaceChildren();
});
function snapshot(version = 1): SourceSnapshot {
  const { basis, ...seat } = frame(version);
  void basis;
  return {
    me: "alice",
    players: session.players,
    version,
    frame: {
      ...seat,
      availableInteractions: [
        {
          kind: "action",
          interactionId: "move",
          interactionKey: "play.move",
          phaseName: "play",
          label: "Move",
          availability: { status: "available" },
          commit: { mode: "manual" },
          inputs: [
            {
              key: "choice",
              kind: "form",
              domain: {
                type: "choice",
                choices: [
                  { value: "a", label: "A" },
                  { value: "b", label: "B" },
                ],
              },
            },
          ],
        },
      ],
    },
  };
}
async function mount(element: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  roots.push(root);
  await act(async () => root.render(element));
  return {
    root,
    host,
    render: async (next: ReactElement) => act(async () => root.render(next)),
  };
}

test("selectors isolate renders and Subscribe uses immutable selected values", async () => {
  const source = createTestSource(snapshot());
  const { GameProvider, useGame, Subscribe } = createGameHook()({});
  let meRenders = 0;
  let scoreRenders = 0;
  let composedRenders = 0;
  function Me() {
    meRenders++;
    return <span>{useGame((s) => s.me?.id)}</span>;
  }
  function Score() {
    scoreRenders++;
    return <b>{useGame((s) => (s.view as { score: number }).score)}</b>;
  }
  const mounted = await mount(
    <GameProvider source={source}>
      <Me />
      <Score />
      <Subscribe
        selector={(s) => ({ id: s.me?.id })}
        compare={(a, b) => a.id === b.id}
      >
        {(value) => {
          composedRenders++;
          return <i>{value.id}</i>;
        }}
      </Subscribe>
    </GameProvider>,
  );
  expect([meRenders, scoreRenders, composedRenders]).toEqual([1, 1, 1]);
  await act(async () => source.emit(snapshot(2)));
  expect([meRenders, scoreRenders, composedRenders]).toEqual([1, 2, 1]);
  expect(mounted.host.textContent).toBe("alice2alice");
});

test("StrictMode replay owns one instance and disposes source once on actual unmount", async () => {
  const source = createTestSource(snapshot());
  const dispose = vi.spyOn(source, "dispose");
  const features = vi.fn(() => ({}));
  const { GameProvider, useGame } = createGameHook()({ features });
  const seen = new Set();
  function Child() {
    seen.add(useGame());
    return <span>ready</span>;
  }
  const mounted = await mount(
    <StrictMode>
      <GameProvider source={source}>
        <Child />
      </GameProvider>
    </StrictMode>,
  );
  expect(features).toHaveBeenCalledTimes(1);
  expect(seen.size).toBe(1);
  expect(dispose).not.toHaveBeenCalled();
  expect(mounted.host.textContent).toBe("ready");
  await act(async () => mounted.root.unmount());
  roots.splice(roots.indexOf(mounted.root), 1);
  expect(dispose).toHaveBeenCalledTimes(1);
});

test("uncommitted rendering neither constructs features nor takes source ownership", async () => {
  const source = createTestSource(snapshot());
  const dispose = vi.spyOn(source, "dispose");
  const features = vi.fn(() => ({}));
  const { GameProvider } = createGameHook()({ features });
  expect(
    renderToString(
      <GameProvider source={source}>
        <span>child</span>
      </GameProvider>,
    ),
  ).toBe("");
  expect(features).not.toHaveBeenCalled();
  expect(dispose).not.toHaveBeenCalled();
  const host = document.createElement("div");
  const root = createRoot(host);
  await act(async () => {
    root.render(<GameProvider source={source} />);
    root.unmount();
  });
  expect(features).not.toHaveBeenCalled();
  expect(dispose).not.toHaveBeenCalled();
  source.dispose();
});

test("source replacement keeps the instance and discards old source intent", async () => {
  const old = createTestSource(snapshot());
  const next = createTestSource(snapshot(4));
  const dispose = vi.spyOn(old, "dispose");
  const { GameProvider, useGame } = createGameHook()({});
  let game!: GameInstance<unknown>;
  function Child() {
    game = useGame();
    return <span>{game.version}</span>;
  }
  const mounted = await mount(
    <GameProvider source={old}>
      <Child />
    </GameProvider>,
  );
  const first = game;
  await act(async () => game.inputs.get("play.move", "choice")!.setValue("a"));
  let pending!: Promise<unknown>;
  await act(async () => {
    pending = game.interactions.get("play.move")!.submit();
  });
  const rejection = expect(pending).rejects.toThrow();
  await mounted.render(
    <GameProvider source={next}>
      <Child />
    </GameProvider>,
  );
  await rejection;
  expect(game).toBe(first);
  expect(dispose).toHaveBeenCalledTimes(1);
  expect(game.state.drafts).toEqual({});
  expect(mounted.host.textContent).toBe("4");
  old.submissions[0]!.resolve({ accepted: true });
  expect(next.submissions).toEqual([]);
});

test("controlled drafts use current callbacks and preserve newer edits through ACK/frame", async () => {
  const source = createTestSource(snapshot());
  const first = vi.fn();
  const current = vi.fn();
  const { GameProvider, useGame } = createGameHook()({});
  let game!: GameInstance<unknown>;
  function Child() {
    game = useGame();
    return (
      <span>
        {String(game.inputs.get("play.move", "choice")!.getValue() ?? "empty")}
      </span>
    );
  }
  let edit!: (drafts: Drafts<unknown>) => void;
  function Owner({
    callback,
  }: {
    callback: (drafts: Drafts<unknown>) => void;
  }) {
    const [drafts, setDrafts] = useState<Drafts<unknown>>({});
    edit = setDrafts;
    return (
      <GameProvider
        source={source}
        state={{ drafts }}
        onDraftsChange={(next) => {
          callback(next);
          setDrafts(next);
        }}
      >
        <Child />
      </GameProvider>
    );
  }
  const mounted = await mount(<Owner callback={first} />);
  await act(async () => game.inputs.get("play.move", "choice")!.setValue("a"));
  expect(mounted.host.textContent).toBe("a");
  await mounted.render(<Owner callback={current} />);
  await act(async () => game.inputs.get("play.move", "choice")!.setValue("b"));
  expect(current).toHaveBeenLastCalledWith({ "play.move": { choice: "b" } });
  expect(first).toHaveBeenCalledTimes(1);
  await act(async () => game.inputs.get("play.move", "choice")!.setValue("a"));
  let pending!: Promise<unknown>;
  await act(async () => {
    pending = game.interactions.get("play.move")!.submit();
  });
  await act(async () => edit({ "play.move": { choice: "b" } }));
  await act(async () => {
    source.submissions[0]!.resolve({ accepted: true });
    await pending;
    source.emit(snapshot(2));
  });
  expect(mounted.host.textContent).toBe("b");
  expect(game.state.drafts).toEqual({ "play.move": { choice: "b" } });
});

test("request-only updates preserve selected domain objects and old snapshot values", async () => {
  const source = createTestSource(snapshot());
  const { GameProvider, useGame } = createGameHook()({});
  const views: unknown[] = [];
  let requestRenders = 0;
  function View() {
    const view = useGame((state) => state.view);
    views.push(view);
    return null;
  }
  function Request() {
    useGame((state) => state.request);
    requestRenders++;
    return null;
  }
  await mount(
    <GameProvider source={source}>
      <View />
      <Request />
    </GameProvider>,
  );
  let pending!: Promise<unknown>;
  await act(async () => {
    pending = source.submit("move", { choice: "a" });
  });
  expect(views).toHaveLength(1);
  expect(requestRenders).toBe(2);
  await act(async () => {
    source.submissions[0]!.resolve({ accepted: false, errorCode: "rejected" });
    await pending;
  });
  expect(views).toHaveLength(1);
  await act(async () => source.emit(snapshot(2)));
  expect(views).toEqual([{ score: 1 }, { score: 2 }]);
  expect(views[0]).not.toBe(views[1]);
});

test("coverage observation remains owned by the instance and warns once", async () => {
  const source = createTestSource(snapshot());
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    const { GameProvider } = createGameHook()({ debug: true });
    await mount(<GameProvider source={source} />);
    await act(async () => source.emit(snapshot(2)));
    expect(warning).toHaveBeenCalledTimes(1);
    expect(warning).toHaveBeenCalledWith(
      "Available interaction 'play.move' has not been read.",
    );
  } finally {
    warning.mockRestore();
  }
});

test("one hook binding supports independently owned provider sources", async () => {
  const source = createTestSource(snapshot());
  const other = createTestSource(snapshot(4));
  const dispose = vi.spyOn(source, "dispose");
  const otherDispose = vi.spyOn(other, "dispose");
  const { GameProvider, useGame } = createGameHook()({});
  function Child() {
    return <span>{useGame((state) => state.version)}</span>;
  }
  const first = await mount(
    <GameProvider source={source}>
      <Child />
    </GameProvider>,
  );
  const second = await mount(
    <GameProvider source={other}>
      <Child />
    </GameProvider>,
  );
  expect(first.host.textContent).toBe("1");
  expect(second.host.textContent).toBe("4");
  await act(async () => source.emit(snapshot(2)));
  expect(first.host.textContent).toBe("2");
  expect(second.host.textContent).toBe("4");
  await act(async () => first.root.unmount());
  roots.splice(roots.indexOf(first.root), 1);
  expect(dispose).toHaveBeenCalledTimes(1);
  expect(otherDispose).not.toHaveBeenCalled();
  await act(async () => other.emit(snapshot(5)));
  expect(second.host.textContent).toBe("5");
});

import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MobileHandTrayProvider, ToastProvider } from "../../ui.js";
import { PluginRuntimeBoundary } from "../components/PluginRuntimeBoundary.js";
import type { PluginRuntimeClient } from "../core/types.js";
import {
  makeTestGameplayFrame,
  makeTestRuntimeHarness,
} from "../test-runtime-harness.js";
import { createDreamboardUI } from "../ui-contract.js";
import { createWorkspaceUIContract } from "../workspace-contract/index.js";

// Mobile-width viewport so useIsMobile() -> matchMedia reports mobile and the
// provider mounts the tray. happy-dom is registered for this file only; the
// other ui-runtime suites stay on react-dom/server SSR.
beforeAll(() => {
  GlobalRegistrator.register({ width: 390, height: 844 });
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
});

afterAll(() => {
  GlobalRegistrator.unregister();
});

afterEach(() => {
  document.body.replaceChildren();
});

function frame() {
  return makeTestGameplayFrame({
    gameVersion: 1,
    view: { ok: true },
    currentPhase: "play",
    zones: {
      hand: {
        cardIds: ["card-1"],
        cardViewsById: {
          "card-1": JSON.stringify({
            id: "card-1",
            cardType: "test-card",
            name: "Test card",
            properties: {},
          }),
        },
        playableByCardId: {},
      },
    },
  });
}

function mountRuntime(): PluginRuntimeClient {
  return makeTestRuntimeHarness(frame()).runtime;
}

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

test("UI.Root composes MobileHandTrayProvider so generated hands can register", async () => {
  // Sanity: importing the SDK provider directly proves the surface is public
  // and constructible. UI.Root is meant to do this for authors. With no hand
  // registered the shell exists and reports a zero count.
  const mounted = await mountIntoDom(
    createElement(
      ToastProvider,
      null,
      createElement(
        MobileHandTrayProvider,
        null,
        createElement("div", { "data-marker": "child" }),
      ),
    ),
  );
  const shell = mounted.host.querySelector(
    "[data-dreamboard-mobile-hand-shell]",
  );
  expect(shell).not.toBeNull();
  expect(shell?.getAttribute("data-mobile-hand-count")).toBe("0");
  expect(mounted.host.querySelector("[data-marker='child']")).not.toBeNull();
  await unmount(mounted);
});

function buildHandHarness({ withActions }: { withActions?: boolean } = {}) {
  const uiContract = {
    interactions: { "play.placeCard": {} },
    zones: { hand: {} },
    cards: { "card-1": {} },
    phases: { play: {} },
  } as const;
  const UI = createWorkspaceUIContract<{
    Root: ReturnType<typeof createDreamboardUI>["Root"];
    Game: ReturnType<typeof createDreamboardUI>["Game"];
    Zone: { useHand: typeof useHandFacade };
  }>({
    uiContract,
    formInputKeysForInteraction: () => new Set(),
    resourceIds: [],
    hexStaticBoards: {},
    cardIdFromZoneCard: (card: { id: string }) => card.id,
    zoneIdFromZoneCard: () => "hand",
  });

  interface HandFacade {
    Hand: (props: { children?: unknown }) => unknown;
  }
  const useHandFacade = (
    UI as unknown as {
      Zone: {
        useHand: (
          name: string,
          options: { zone: string; role: string; label: string },
        ) => HandFacade;
      };
    }
  ).Zone.useHand;

  function HandHarness() {
    const hand = useHandFacade("playerHand", {
      zone: "hand",
      role: "primary",
      label: "Player hand",
    });
    return createElement(
      hand.Hand as unknown as React.FC<unknown>,
      {
        // No `layout` prop: the generated facade always renders the projected
        // HandSurfaceView (fan on desktop / tray on mobile) now, so the default
        // path is what we exercise here. The body renders a single card so the
        // registered hand reports count 1.
        children: () =>
          createElement("span", { "data-marker": "card" }, "card-1"),
        // The action slot must travel into the mobile dock so a hand's commit
        // stays reachable while docked.
        ...(withActions
          ? {
              renderActions: () =>
                createElement(
                  "button",
                  { type: "button", "data-marker": "hand-action" },
                  "Commit",
                ),
            }
          : {}),
      } as unknown,
    );
  }

  return { UI, HandHarness };
}

test("generated hand registers into the mobile tray after effects run", async () => {
  const runtime = mountRuntime();
  const { UI, HandHarness } = buildHandHarness();

  const mounted = await mountIntoDom(
    createElement(
      PluginRuntimeBoundary,
      { runtime },
      createElement(
        UI.Root as unknown as React.FC<{ children?: unknown }>,
        null,
        createElement(HandHarness),
      ),
    ),
  );

  const shell = mounted.host.querySelector(
    "[data-dreamboard-mobile-hand-shell]",
  );
  expect(shell).not.toBeNull();
  // The useEffect in useRegisterMobileHand has run: the provider now counts
  // exactly one registered hand. SSR could never prove this (count stayed 0).
  expect(shell?.getAttribute("data-mobile-hand-count")).toBe("1");

  // Because the viewport is mobile width and a hand is registered, the
  // provider renders the SDK mobile tray. The card body lives inside the tray
  // (the generated hand returns null inline on mobile), so the tray is the
  // only place the registered hand content appears.
  const tray = mounted.host.querySelector("[data-dreamboard-mobile-hand-tray]");
  expect(tray).not.toBeNull();
  expect(tray?.getAttribute("data-active-hand")).toBe("playerHand:hand");

  // Regression guard for the fan layout loop: the generated hand pins its
  // outermost element to the available width (`w-full min-w-0`) so a centering
  // parent can't shrink-wrap to the fan's own measured width and start a
  // ResizeObserver feedback loop. The wrapper renders even on mobile (the
  // inline body is empty there), so we can assert it from this suite.
  const widthWrapper = mounted.host.querySelector(
    '[data-dreamboard-zone-root][class*="w-full"]',
  );
  expect(widthWrapper).not.toBeNull();

  await unmount(mounted);
});

test("renderActions content travels into the mobile dock", async () => {
  const runtime = mountRuntime();
  const { UI, HandHarness } = buildHandHarness({ withActions: true });

  const mounted = await mountIntoDom(
    createElement(
      PluginRuntimeBoundary,
      { runtime },
      createElement(
        UI.Root as unknown as React.FC<{ children?: unknown }>,
        null,
        createElement(HandHarness),
      ),
    ),
  );

  const tray = mounted.host.querySelector("[data-dreamboard-mobile-hand-tray]");
  expect(tray).not.toBeNull();

  // The dock keeps its body mounted even at the peek, and the trigger raises
  // it; exercise the toggle so we also cover the open path.
  const trigger = tray?.querySelector<HTMLButtonElement>(
    "[data-dreamboard-mobile-hand-trigger]",
  );
  expect(trigger).not.toBeNull();
  await act(async () => {
    trigger?.click();
  });

  // The action slot renders inside the registered hand content, so it lands
  // inside the dock (where it is pinned as a footer) rather than being stranded
  // on the board behind a scrim.
  const actions = tray?.querySelector("[data-dreamboard-hand-actions]");
  expect(actions).not.toBeNull();
  expect(tray?.querySelector("[data-marker='hand-action']")).not.toBeNull();

  await unmount(mounted);
});

test("unmounting the generated hand deregisters it from the tray", async () => {
  const runtime = mountRuntime();
  const { UI, HandHarness } = buildHandHarness();

  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);

  function App({ showHand }: { showHand: boolean }) {
    return createElement(
      PluginRuntimeBoundary,
      { runtime },
      createElement(
        UI.Root as unknown as React.FC<{ children?: unknown }>,
        null,
        showHand ? createElement(HandHarness) : null,
      ),
    );
  }

  await act(async () => {
    root.render(createElement(App, { showHand: true }));
  });
  expect(
    host
      .querySelector("[data-dreamboard-mobile-hand-shell]")
      ?.getAttribute("data-mobile-hand-count"),
  ).toBe("1");

  // Removing the generated hand must run the registration cleanup and drop the
  // count back to zero, which also tears down the mobile tray.
  await act(async () => {
    root.render(createElement(App, { showHand: false }));
  });
  expect(
    host
      .querySelector("[data-dreamboard-mobile-hand-shell]")
      ?.getAttribute("data-mobile-hand-count"),
  ).toBe("0");
  expect(host.querySelector("[data-dreamboard-mobile-hand-tray]")).toBeNull();

  await act(async () => {
    root.unmount();
  });
  host.remove();
});

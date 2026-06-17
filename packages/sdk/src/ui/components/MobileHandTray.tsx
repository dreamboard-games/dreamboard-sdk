import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";
import { useDrag } from "@use-gesture/react";
import { clsx } from "clsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { useThemeCssVars } from "../theme/ThemeProvider.js";

export type HandRole = "primary" | "auxiliary" | "task";

export interface MobileHandRegistration {
  id: string;
  zone: string;
  label: string;
  role: HandRole;
  order?: number;
  version: string;
  count: number;
  active: boolean;
  autoOpen: boolean;
  content: ReactNode;
}

interface MobileHandTrayContextValue {
  registerHand: (hand: MobileHandRegistration) => () => void;
}

interface OverlayInsetContextValue {
  bottomInset: number;
  registerBottomOverlayInset: (id: string, height: number) => () => void;
}

const MobileHandTrayContext = createContext<MobileHandTrayContextValue | null>(
  null,
);

const OverlayInsetContext = createContext<OverlayInsetContextValue | null>(
  null,
);

// Kept separate from the registration context on purpose: this value changes
// whenever the tray opens/closes or hands (de)register, whereas `registerHand`
// must stay referentially stable so `useRegisterMobileHand`'s effect does not
// re-run and thrash registrations.
const MobileHandTrayStateContext = createContext<{ active: boolean }>({
  active: false,
});

const ROLE_PRIORITY: Record<HandRole, number> = {
  task: 0,
  primary: 1,
  auxiliary: 2,
};

const TRAY_CONTENT_ID = "dreamboard-mobile-hand-tray";

/** Dock snap heights, ordered collapsed → tall. */
const DOCK_SNAPS = ["peek", "raised", "expanded"] as const;
type DockSnap = (typeof DOCK_SNAPS)[number];
const DOCK_SNAP_MAX_HEIGHT: Record<DockSnap, number | string> = {
  peek: 0,
  raised: "min(52vh, 440px)",
  expanded: "82vh",
};

export function MobileHandTrayProvider({ children }: { children: ReactNode }) {
  const [handsById, setHandsById] = useState<
    ReadonlyMap<string, MobileHandRegistration>
  >(() => new Map());
  const [bottomOverlayInsets, setBottomOverlayInsets] = useState<
    ReadonlyMap<string, number>
  >(() => new Map());
  const isMobile = useIsMobile();
  const registerHand = useCallback((hand: MobileHandRegistration) => {
    setHandsById((current) => {
      const previous = current.get(hand.id);
      if (
        previous &&
        previous.zone === hand.zone &&
        previous.label === hand.label &&
        previous.role === hand.role &&
        previous.order === hand.order &&
        previous.version === hand.version &&
        previous.count === hand.count &&
        previous.active === hand.active &&
        previous.autoOpen === hand.autoOpen
      ) {
        return current;
      }
      const next = new Map(current);
      next.set(hand.id, hand);
      return next;
    });
    return () => {
      setHandsById((current) => {
        if (!current.has(hand.id)) return current;
        const next = new Map(current);
        next.delete(hand.id);
        return next;
      });
    };
  }, []);
  const value = useMemo<MobileHandTrayContextValue>(
    () => ({ registerHand }),
    [registerHand],
  );
  const registerBottomOverlayInset = useCallback(
    (id: string, height: number) => {
      const normalizedHeight = Math.max(0, Math.ceil(height));
      setBottomOverlayInsets((current) => {
        if (current.get(id) === normalizedHeight) return current;
        const next = new Map(current);
        if (normalizedHeight === 0) next.delete(id);
        else next.set(id, normalizedHeight);
        return next;
      });
      return () => {
        setBottomOverlayInsets((current) => {
          if (!current.has(id)) return current;
          const next = new Map(current);
          next.delete(id);
          return next;
        });
      };
    },
    [],
  );
  const bottomInset = useMemo(
    () =>
      [...bottomOverlayInsets.values()].reduce(
        (total, height) => total + height,
        0,
      ),
    [bottomOverlayInsets],
  );
  const overlayValue = useMemo<OverlayInsetContextValue>(
    () => ({ bottomInset, registerBottomOverlayInset }),
    [bottomInset, registerBottomOverlayInset],
  );
  const hands = useMemo(
    () =>
      [...handsById.values()].sort(
        (a, b) =>
          (a.order ?? ROLE_PRIORITY[a.role]) -
            (b.order ?? ROLE_PRIORITY[b.role]) ||
          ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role] ||
          a.label.localeCompare(b.label),
      ),
    [handsById],
  );

  const trayActive = isMobile && hands.length > 0;
  const stateValue = useMemo(() => ({ active: trayActive }), [trayActive]);

  return (
    <MobileHandTrayContext.Provider value={value}>
      <OverlayInsetContext.Provider value={overlayValue}>
        <MobileHandTrayStateContext.Provider value={stateValue}>
          <div
            data-dreamboard-mobile-hand-shell=""
            data-mobile-hand-count={hands.length}
            data-mobile-hand-tray-active={trayActive ? "true" : undefined}
            style={{ minHeight: "100%" }}
          >
            {children}
          </div>
          {trayActive ? <MobileHandTray hands={hands} /> : null}
        </MobileHandTrayStateContext.Provider>
      </OverlayInsetContext.Provider>
    </MobileHandTrayContext.Provider>
  );
}

export function useRegisterMobileHand(hand: MobileHandRegistration): void {
  const context = useContext(MobileHandTrayContext);
  if (!context) {
    throw new Error(
      "Generated hand surfaces must be rendered inside <UI.Root>; mobile hand tray registration is unavailable.",
    );
  }
  useEffect(() => context.registerHand(hand), [context, hand]);
}

/**
 * Whether the mobile hand tray is currently presenting hands — i.e. the
 * viewport is below the mobile breakpoint and at least one primary/auxiliary
 * hand has registered. Authors can use this to drop redundant inline hand
 * chrome (labels, framing) that the tray already provides, instead of guessing
 * the breakpoint with a CSS media query. Returns `false` outside `<UI.Root>`.
 */
export function useMobileHandTrayActive(): boolean {
  return useContext(MobileHandTrayStateContext).active;
}

export function useOverlayInsets(): { bottom: number } {
  const context = useContext(OverlayInsetContext);
  return { bottom: context?.bottomInset ?? 0 };
}

export function useRegisterBottomOverlayInset(
  id: string,
  height: number,
): void {
  const context = useContext(OverlayInsetContext);
  useEffect(() => {
    if (!context) return undefined;
    return context.registerBottomOverlayInset(id, height);
  }, [context, height, id]);
}

function MobileHandTray({
  hands,
}: {
  hands: readonly MobileHandRegistration[];
}) {
  // Snap height of the dock. `peek` is the collapsed handle bar; `raised` shows
  // the hand at an actionable height; `expanded` opens it tall for a long hand.
  // The dock is always mounted and never modal — there is no scrim, and only
  // the dock surface captures pointer events, so the board behind it stays
  // visible and interactive.
  const [snap, setSnap] = useState<DockSnap>("peek");
  const open = snap !== "peek";
  const advanceSnap = useCallback((direction: 1 | -1) => {
    setSnap((current) => {
      const index = DOCK_SNAPS.indexOf(current);
      const next = Math.min(
        DOCK_SNAPS.length - 1,
        Math.max(0, index + direction),
      );
      return DOCK_SNAPS[next] ?? current;
    });
  }, []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const themeCssVars = useThemeCssVars();
  const panelRef = useRef<HTMLDivElement | null>(null);

  const preferredHand =
    hands.find((hand) => hand.id === activeId) ??
    hands.find((hand) => hand.active) ??
    hands.find((hand) => hand.role === "primary") ??
    hands[0] ??
    null;
  const selectedHand =
    hands.find((hand) => hand.id === activeId) ?? preferredHand;

  useEffect(() => {
    if (!preferredHand) {
      setActiveId(null);
      return;
    }
    setActiveId((current) =>
      current && hands.some((hand) => hand.id === current)
        ? current
        : preferredHand.id,
    );
  }, [hands, preferredHand]);

  // Auto-raise to the actionable height when it becomes this seat's turn to
  // act, and settle back to the peek when the turn passes. We only toggle on
  // the active transition, so a manual expand/collapse sticks until the turn
  // changes.
  const active = selectedHand?.active ?? false;
  const prevActiveRef = useRef(false);
  useEffect(() => {
    if (active !== prevActiveRef.current) {
      prevActiveRef.current = active;
      setSnap(active ? "raised" : "peek");
    }
  }, [active]);

  // Swipe the handle up to expand a step (peek → raised → expanded), down to
  // collapse a step. Taps fall through to the handle's onClick toggle
  // (filterTaps), and velocity lets a quick flick advance even on a short drag.
  const bindDrag = useDrag(
    ({ movement: [, my], velocity: [, vy], last }) => {
      if (!last) return;
      if (my < -24 || (my < 0 && vy > 0.4)) advanceSnap(1);
      else if (my > 24 || (my > 0 && vy > 0.4)) advanceSnap(-1);
    },
    { axis: "y", filterTaps: true },
  );

  if (!selectedHand) return null;

  const activeBadges = hands.filter(
    (hand) => hand.id !== selectedHand.id && hand.active,
  );

  return (
    <MobileHandTrayFrame
      panelRef={panelRef}
      snap={snap}
      selectedHand={selectedHand}
      hands={hands}
      open={open}
      active={active}
      activeBadges={activeBadges}
      bindDrag={bindDrag}
      setSnap={setSnap}
      setActiveId={setActiveId}
      themeCssVars={themeCssVars}
    />
  );
}

function MobileHandTrayFrame({
  panelRef,
  snap,
  selectedHand,
  hands,
  open,
  active,
  activeBadges,
  bindDrag,
  setSnap,
  setActiveId,
  themeCssVars,
}: {
  panelRef: RefObject<HTMLDivElement | null>;
  snap: DockSnap;
  selectedHand: MobileHandRegistration;
  hands: readonly MobileHandRegistration[];
  open: boolean;
  active: boolean;
  activeBadges: readonly MobileHandRegistration[];
  bindDrag: ReturnType<typeof useDrag>;
  setSnap: Dispatch<SetStateAction<DockSnap>>;
  setActiveId: Dispatch<SetStateAction<string | null>>;
  themeCssVars: CSSProperties;
}) {
  const [measuredHeight, setMeasuredHeight] = useState(0);
  useEffect(() => {
    const node = panelRef.current;
    if (!node) {
      setMeasuredHeight(0);
      return undefined;
    }
    const update = () => setMeasuredHeight(node.getBoundingClientRect().height);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [panelRef, snap, selectedHand.id, hands.length]);
  useRegisterBottomOverlayInset("dreamboard-mobile-hand-tray", measuredHeight);

  return (
    <div
      data-dreamboard-mobile-hand-tray=""
      data-state={snap}
      data-active-hand={selectedHand.id}
      style={{
        ...themeCssVars,
        position: "fixed",
        left: "env(safe-area-inset-left, 0px)",
        right: "env(safe-area-inset-right, 0px)",
        bottom: 0,
        zIndex: 900,
        display: "flex",
        justifyContent: "center",
        // Non-modal: the wrapper ignores pointers so taps land on the board;
        // only the dock panel below opts back in.
        pointerEvents: "none",
      }}
    >
      <div
        ref={panelRef}
        className="flex w-full flex-col overflow-hidden rounded-t-2xl"
        style={{
          pointerEvents: "auto",
          maxWidth: "min(40rem, 100%)",
          background: "var(--background, #fdfbf7)",
          color: "var(--foreground, #2d2d2d)",
          borderTop: "1px solid var(--border, rgba(45,45,45,0.18))",
          borderLeft: "1px solid var(--border, rgba(45,45,45,0.10))",
          borderRight: "1px solid var(--border, rgba(45,45,45,0.10))",
          boxShadow:
            "0 -18px 48px -22px rgba(45,45,45,0.30), 0 -6px 18px -16px rgba(45,45,45,0.20)",
        }}
      >
        {/* Handle + summary bar — drag or tap to toggle peek/open. */}
        <button
          type="button"
          {...bindDrag()}
          onClick={() =>
            setSnap((value) => (value === "peek" ? "raised" : "peek"))
          }
          aria-controls={TRAY_CONTENT_ID}
          aria-expanded={open}
          data-dreamboard-mobile-hand-trigger=""
          data-hand-role={selectedHand.role}
          data-active-badges={activeBadges.length || undefined}
          className="flex w-full flex-col items-stretch gap-1.5 px-4 pb-2 pt-2 text-left"
          style={{
            touchAction: "none",
            background: "transparent",
            border: 0,
            cursor: "pointer",
          }}
        >
          <span
            aria-hidden
            className="mx-auto h-1.5 w-10 rounded-full"
            style={{ background: "rgba(45,45,45,0.28)" }}
          />
          <span className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
              <span className="truncate">{selectedHand.label}</span>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-bold"
                style={{ background: "rgba(45,45,45,0.08)" }}
              >
                {selectedHand.count}
              </span>
              {active ? (
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                  your turn
                </span>
              ) : null}
            </span>
            {activeBadges.length > 0 ? (
              <span
                aria-label={`${activeBadges.length} other active hand sections`}
                className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white"
              >
                {activeBadges.length}
              </span>
            ) : null}
          </span>
        </button>

        {/* Collapsible body — kept mounted at the peek (clipped to zero height
            and made inert) so raising the dock never remounts the hand or
            loses scroll position, and so the auto-raise can animate. The body
            is the scroll container, so the action slot's sticky footer pins to
            its bottom edge. */}
        <div
          id={TRAY_CONTENT_ID}
          role="region"
          aria-label={selectedHand.label}
          data-state={snap}
          inert={open ? undefined : true}
          className="overscroll-contain"
          style={{
            maxHeight: DOCK_SNAP_MAX_HEIGHT[snap],
            overflowY: open ? "auto" : "hidden",
            transition: "max-height 240ms ease",
          }}
        >
          {hands.length > 1 ? (
            <div
              role="tablist"
              aria-label="Hand sections"
              className="flex gap-2 overflow-x-auto px-4 pb-2 pt-1 [scrollbar-width:none]"
            >
              {hands.map((hand) => (
                <button
                  key={hand.id}
                  type="button"
                  role="tab"
                  aria-selected={hand.id === selectedHand.id}
                  data-active={hand.active || undefined}
                  data-hand-role={hand.role}
                  onClick={() => setActiveId(hand.id)}
                  className={clsx(
                    "shrink-0 rounded-full border px-3 py-1 text-sm font-semibold",
                    hand.id === selectedHand.id
                      ? "border-slate-900 bg-white text-slate-950"
                      : "border-slate-300 bg-white/60 text-slate-600",
                    hand.active && hand.id !== selectedHand.id
                      ? "ring-2 ring-red-400"
                      : null,
                  )}
                >
                  {hand.label} ({hand.count})
                </button>
              ))}
            </div>
          ) : null}
          <div
            className="px-3 pt-2 sm:px-4"
            style={{
              paddingBottom: 20,
            }}
          >
            {selectedHand.content}
          </div>
        </div>
      </div>
    </div>
  );
}

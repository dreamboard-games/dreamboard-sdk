import { Button } from "@/components/ui/button";
import { Drawer } from "@base-ui/react/drawer";
import { computePosition, shift, size, type Placement } from "@floating-ui/dom";
import { useGame } from "@game";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import "./tokens.css";

type TouchSession = {
  pointerId: number;
  x: number;
  y: number;
  placement?: Placement;
  width?: number;
};
const Browsing = createContext<{
  session: TouchSession | null;
  inSheet: boolean;
  closeSheet(): void;
}>({ session: null, inSheet: false, closeSheet() {} });
export const useCardBrowsingContext = () => useContext(Browsing);

/** Track presentation coordinates only; the SDK owns gesture recognition. */
export function useCardBrowsing() {
  const [session, setSession] = useState<TouchSession | null>(null);
  const perspective = useGame((game) => game.snapshot?.me);
  useEffect(() => setSession(null), [perspective]);
  useEffect(() => {
    if (!session) return;
    const move = (event: globalThis.PointerEvent) => {
      if (event.pointerId !== session.pointerId) return;
      session.x = event.clientX;
      session.y = event.clientY;
    };
    const end = (event: globalThis.PointerEvent) => {
      if (event.pointerId === session.pointerId) setSession(null);
    };
    const cancel = () => setSession(null);
    addEventListener("pointermove", move, true);
    addEventListener("pointerup", end);
    addEventListener("pointercancel", end);
    addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", cancel);
    return () => {
      removeEventListener("pointermove", move, true);
      removeEventListener("pointerup", end);
      removeEventListener("pointercancel", end);
      removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", cancel);
    };
  }, [session]);
  return {
    session,
    props: {
      "data-card-browsing": session ? "touch" : undefined,
      onPointerDownCapture(event: PointerEvent<HTMLElement>) {
        if (
          event.pointerType !== "touch" ||
          !event.isPrimary ||
          !event.currentTarget.contains(event.target as Node) ||
          !(event.target as Element).closest("[data-card]")
        )
          return;
        setSession({
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
        });
      },
    },
  };
}

/** One explicit, readable destination for both hands and table rows. */
export function CardBrowser({
  session,
  count,
  overlapping,
  label,
  children,
  renderCards,
}: {
  session: TouchSession | null;
  count: number;
  overlapping: boolean;
  label: string;
  children: ReactNode;
  renderCards(): ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const perspective = useGame((game) => game.snapshot?.me);
  useEffect(() => setOpen(false), [perspective]);
  const closeSheet = () => setOpen(false);
  return (
    <Browsing value={{ session, inSheet: false, closeSheet }}>
      <Drawer.Root open={open} onOpenChange={setOpen}>
        {overlapping && count > 1 ? (
          <Drawer.Trigger
            render={<Button variant="outline" className="db-card-browse" />}
          >
            Browse {count} cards
          </Drawer.Trigger>
        ) : null}
        {children}
        <Drawer.Portal>
          <Drawer.Backdrop className="db-hand-sheet-backdrop" />
          <Drawer.Viewport className="db-hand-sheet-viewport">
            <Drawer.Popup className="db-hand-sheet">
              <div className="db-hand-sheet-handle" aria-hidden />
              <div className="db-hand-sheet-header">
                <Drawer.Title className="db-hand-sheet-title">
                  {label} · {count}
                </Drawer.Title>
                <Drawer.Close
                  render={<Button variant="outline" className="min-h-11" />}
                >
                  Done
                </Drawer.Close>
              </div>
              <Drawer.Content className="db-hand-sheet-cards">
                <Browsing value={{ session: null, inSheet: true, closeSheet }}>
                  {renderCards()}
                </Browsing>
              </Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </Browsing>
  );
}

/** A portalled face; its position never changes the source row's hit targets. */
export function TouchCardPreview({
  session,
  anchor,
  cardId,
  children,
}: {
  session: TouchSession;
  anchor: Element;
  cardId: string;
  children: ReactNode;
}) {
  const floating = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = floating.current!;
    const face = content.current!;
    const source = anchor.querySelector<HTMLElement>(".db-card");
    // Authored controls may omit the standard card surface. Browse still works.
    if (!source) return;
    const sourceStyle = getComputedStyle(source);
    const sourceWidth = parseFloat(sourceStyle.width);
    const sourceHeight = parseFloat(sourceStyle.height);
    const aspect = sourceWidth / sourceHeight;
    face.style.setProperty("--card-w", `${sourceWidth}px`);
    face.style.width = `${sourceWidth}px`;
    face.style.height = `${sourceHeight}px`;
    const reference = {
      getBoundingClientRect: () =>
        new DOMRect(session.x - 40, session.y - 32, 80, 112),
    };
    let revision = 0;
    let frame = 0;
    let disposed = false;
    async function position() {
      const current = ++revision;
      const style = getComputedStyle(element);
      const padding = {
        top: 16 + parseFloat(style.getPropertyValue("--safe-top")),
        bottom: 16 + parseFloat(style.getPropertyValue("--safe-bottom")),
        left: 16 + parseFloat(style.getPropertyValue("--safe-left")),
        right: 16 + parseFloat(style.getPropertyValue("--safe-right")),
      };
      const desired = session.width ?? 240;
      element.style.width = `${desired}px`;
      element.style.height = `${desired / aspect}px`;
      const evaluate = async (placement: Placement) => {
        let width = desired;
        const result = await computePosition(reference, element, {
          strategy: "fixed",
          placement,
          middleware: [
            shift({ padding }),
            size({
              padding,
              apply({ availableWidth, availableHeight }) {
                width = Math.max(
                  0,
                  Math.min(desired, availableWidth, availableHeight * aspect),
                );
              },
            }),
          ],
        });
        return { ...result, width };
      };
      // Keep the accepted side and size unless it no longer fits. Prefer a
      // full-size alternative before shrinking; below needs extra hand clearance.
      const placements: Placement[] = [
        "top",
        "bottom",
        ...(session.x < innerWidth / 2
          ? (["right", "left"] as const)
          : (["left", "right"] as const)),
      ];
      const retained = session.placement
        ? await evaluate(session.placement)
        : null;
      const candidates =
        retained && retained.width >= desired - 0.5
          ? [retained]
          : await Promise.all(placements.map(evaluate));
      const chosen =
        candidates.find((candidate) => candidate.width >= desired - 0.5) ??
        candidates.reduce((best, candidate) =>
          candidate.width > best.width ? candidate : best,
        );
      if (disposed || current !== revision) return;
      // Smaller faces are not a useful reading view. Browse remains available.
      element.style.visibility = chosen.width < 180 ? "hidden" : "visible";
      if (chosen.width < 180) return;
      session.placement = chosen.placement;
      session.width = chosen.width;
      element.style.width = `${chosen.width}px`;
      element.style.height = `${chosen.width / aspect}px`;
      const settled = await computePosition(reference, element, {
        strategy: "fixed",
        placement: chosen.placement,
        middleware: [shift({ padding })],
      });
      if (disposed || current !== revision) return;
      element.style.left = `${settled.x}px`;
      element.style.top = `${settled.y}px`;
      element.dataset.placement = chosen.placement;
      face.style.transform = `scale(${chosen.width / sourceWidth})`;
    }
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => void position());
    };
    void position();
    addEventListener("pointermove", schedule);
    addEventListener("resize", schedule);
    addEventListener("scroll", schedule, true);
    visualViewport?.addEventListener("resize", schedule);
    visualViewport?.addEventListener("scroll", schedule);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      removeEventListener("pointermove", schedule);
      removeEventListener("resize", schedule);
      removeEventListener("scroll", schedule, true);
      visualViewport?.removeEventListener("resize", schedule);
      visualViewport?.removeEventListener("scroll", schedule);
    };
  }, [session, anchor]);
  return createPortal(
    <div
      ref={floating}
      className="db-card-touch-preview"
      data-touch-preview={cardId}
      aria-hidden
    >
      <div ref={content} className="db-card-preview-face">
        {children}
      </div>
    </div>,
    document.body,
  );
}

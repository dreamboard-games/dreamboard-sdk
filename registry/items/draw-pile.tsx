import { Popover } from "@base-ui/react/popover";
import {
  createGestureRecognizer,
  type GestureRecognizer,
} from "@dreamboard-games/sdk";
import { useGame } from "@game";
import { motion, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { backImageOf, CardBack, cardSpring } from "./card";
import { Pile } from "./pile";
import { useCardMotion, type CardBox } from "./card-motion";
import "./tokens.css";

type Model = Parameters<Parameters<typeof useGame>[0]>[0];
type ZoneId = Parameters<Model["zones"]["get"]>[0];
type InteractionKey = Parameters<Model["interactions"]["get"]>[0];
export interface DrawPileProps {
  zoneId: ZoneId;
  interaction: InteractionKey;
  destinationZoneId: ZoneId;
  label?: string;
  className?: string;
}

/** A face-down draw action: tap for its menu or drop its visual copy into a hand. */
export function DrawPile({
  zoneId,
  interaction: key,
  destinationZoneId,
  label = "Draw pile",
  className,
}: DrawPileProps) {
  const draw = useGame((game) => game.interactions.find(key));
  const count = useGame((game) => game.zones.find(zoneId)?.count ?? 0);
  const back = useGame((game) => {
    const top = game.zones.find(zoneId)?.getCards()[0];
    return top ? backImageOf(top) : null;
  });
  const snapshot = useGame((game) => game.snapshot);
  const request = useGame((game) => game.request);
  const table = useCardMotion();
  const reduced = useReducedMotion();
  const control = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{
    box: CardBox;
    phase: "drag" | "pending" | "return";
    snapshot: Model["snapshot"];
  } | null>(null);
  const press = useRef<{
    recognizer: GestureRecognizer;
    detach(): void;
  } | null>(null);
  const suppressClick = useRef(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const available = count > 0 && !!draw && !draw.getSubmitProps().disabled;
  const latest = useRef({ draw, available, snapshot, table });
  latest.current = { draw, available, snapshot, table };
  const highlighted = useRef<HTMLElement | null>(null);

  function clearTarget() {
    highlighted.current = null;
    latest.current.table.setDrop(null);
  }
  function destination() {
    return (
      control.current
        ?.closest("[data-game-ui]")
        ?.querySelector<HTMLElement>(
          `.db-hand[data-zone="${CSS.escape(destinationZoneId)}"]`,
        ) ?? null
    );
  }
  function isOver(clientX: number, clientY: number) {
    const hand = highlighted.current;
    const over =
      !!hand &&
      document
        .elementsFromPoint(clientX, clientY)
        .some((element) => hand.contains(element));
    latest.current.table.setDrop(destinationZoneId, over);
    return over;
  }
  function returnToPile() {
    clearTarget();
    setGhost((current) => (current ? { ...current, phase: "return" } : null));
  }
  async function submit(box: CardBox) {
    const current = latest.current;
    if (!current.available || !current.draw) {
      returnToPile();
      return;
    }
    setOpen(false);
    setError(null);
    current.table.stageDraw(zoneId, destinationZoneId, box);
    setGhost({ box, phase: "pending", snapshot: current.snapshot });
    try {
      const result = await current.draw.submit();
      if (!result.accepted) {
        current.table.clearDraw();
        setError(result.message ?? result.errorCode);
        returnToPile();
      }
    } catch (cause) {
      current.table.clearDraw();
      setError(cause instanceof Error ? cause.message : String(cause));
      returnToPile();
    }
  }

  useEffect(() => {
    if (
      ghost?.phase === "pending" &&
      snapshot !== ghost.snapshot &&
      request === null
    )
      setGhost(null);
  }, [snapshot, request, ghost?.phase, ghost?.snapshot]);
  useEffect(() => {
    press.current?.recognizer.cancel();
  }, [snapshot, request]);
  useEffect(
    () => () => {
      press.current?.detach();
      latest.current.table.setDrop(null);
    },
    [],
  );

  function start(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    suppressClick.current = false;
    if (press.current || ghost || !available) return;
    const box = event.currentTarget.getBoundingClientRect();
    const grab = { x: event.clientX - box.x, y: event.clientY - box.y };
    const recognizer = createGestureRecognizer(
      event.nativeEvent,
      {
        hold() {},
        dragStart() {
          if (!latest.current.available) return false;
          setOpen(false);
          x.set(box.x);
          y.set(box.y);
          setGhost({ box, phase: "drag", snapshot });
          highlighted.current = destination();
          latest.current.table.setDrop(destinationZoneId);
          return true;
        },
        dragMove(at) {
          x.set(at.x - grab.x);
          y.set(at.y - grab.y);
          isOver(at.x, at.y);
        },
        end(kind, at) {
          const over = kind === "drag" && isOver(at.x, at.y);
          press.current?.detach();
          press.current = null;
          suppressClick.current = kind !== "tap";
          clearTarget();
          if (kind !== "drag") return;
          if (over)
            void submit({
              x: x.get(),
              y: y.get(),
              width: box.width,
              height: box.height,
            });
          else returnToPile();
        },
        cancel(kind) {
          press.current?.detach();
          press.current = null;
          suppressClick.current = kind !== "tap";
          if (kind === "drag") returnToPile();
          else clearTarget();
        },
      },
      { dragDirection: "any" },
    );
    const move = (next: globalThis.PointerEvent) => recognizer.move(next);
    const up = (next: globalThis.PointerEvent) => recognizer.up(next);
    const cancel = (next: globalThis.PointerEvent) => recognizer.cancel(next);
    const blur = () => recognizer.cancel();
    const escape = (next: KeyboardEvent) => {
      if (next.key === "Escape") recognizer.cancel();
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
    addEventListener("pointercancel", cancel);
    addEventListener("blur", blur);
    addEventListener("keydown", escape);
    event.currentTarget.setPointerCapture(event.pointerId);
    press.current = {
      recognizer,
      detach() {
        removeEventListener("pointermove", move);
        removeEventListener("pointerup", up);
        removeEventListener("pointercancel", cancel);
        removeEventListener("blur", blur);
        removeEventListener("keydown", escape);
      },
    };
  }

  const returning = ghost?.phase === "return";
  return (
    <>
      <Pile
        count={count}
        label={label}
        data-zone={zoneId}
        className={className}
      >
        <button
          ref={control}
          type="button"
          className="db-draw-pile-card"
          aria-label={`${label} actions`}
          aria-disabled={!available || undefined}
          aria-haspopup="dialog"
          aria-expanded={open}
          data-draw-pile={zoneId}
          data-picked-up={ghost?.phase === "drag" || undefined}
          onPointerDown={start}
          onDragStart={(event) => event.preventDefault()}
          onContextMenu={(event) => event.preventDefault()}
          onClick={(event) => {
            if (suppressClick.current && event.detail !== 0) {
              suppressClick.current = false;
              return;
            }
            setOpen((current) => !current);
          }}
        >
          <CardBack image={back} />
        </button>
      </Pile>
      {open && (
        <Popover.Root
          open
          onOpenChange={(next, details) => {
            if (
              !next &&
              !(
                details.reason === "outside-press" &&
                details.event.target instanceof Node &&
                control.current?.contains(details.event.target)
              )
            )
              setOpen(false);
          }}
        >
          <Popover.Portal>
            <Popover.Positioner
              anchor={control.current}
              side="top"
              sideOffset={10}
              collisionPadding={8}
              className="z-50"
            >
              <Popover.Popup
                aria-label={`${label} actions`}
                finalFocus={() => control.current}
                className="db-card-actions"
              >
                <Popover.Arrow className="db-card-action-arrow" />
                <Button
                  type="button"
                  className="min-h-11 px-4"
                  disabled={!available}
                  data-action="draw"
                  data-interaction={key}
                  onClick={() => {
                    const box = control.current!.getBoundingClientRect();
                    x.set(box.x);
                    y.set(box.y);
                    void submit(box);
                  }}
                >
                  {draw?.label ?? "Draw"}
                </Button>
                {!available && (
                  <p role="status" className="m-0 px-2 py-1 text-sm">
                    {draw?.getUnavailableReason() ?? "You can't draw now."}
                  </p>
                )}
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      )}
      {error && <p role="status">{error}</p>}
      {ghost &&
        createPortal(
          <motion.div
            aria-hidden
            data-draw-overlay={ghost.phase}
            className="db-draw-overlay"
            style={
              {
                x: returning ? undefined : x,
                y: returning ? undefined : y,
                width: ghost.box.width,
                height: ghost.box.height,
                "--card-w": `${ghost.box.width}px`,
              } as React.CSSProperties
            }
            initial={returning ? { x: x.get(), y: y.get() } : { scale: 1 }}
            animate={
              returning
                ? {
                    x: control.current?.getBoundingClientRect().x,
                    y: control.current?.getBoundingClientRect().y,
                    scale: 1,
                  }
                : { scale: ghost.phase === "drag" && !reduced ? 1.06 : 1 }
            }
            transition={reduced ? { duration: 0 } : cardSpring}
            onAnimationComplete={() => {
              if (returning) setGhost(null);
            }}
          >
            <CardBack image={back} />
          </motion.div>,
          document.body,
        )}
    </>
  );
}

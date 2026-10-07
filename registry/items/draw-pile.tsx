import { Popover } from "@base-ui/react/popover";
import {
  createGestureRecognizer,
  type GestureRecognizer,
} from "@dreamboard-games/sdk";
import { useGame } from "@game";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type MotionStyle,
} from "motion/react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  backImageOf,
  CardBack,
  cardDragScale,
  cardPickup,
  cardSettle,
} from "./card";
import { Pile } from "./pile";
import { useCardMotion, type CardBox, type CardPlacement } from "./card-motion";
import "./tokens.css";

import type { GameModel as Model, GameCard as Card, ZoneId } from "@game";
import type { InteractionKey } from "@game";
export interface DrawPileProps {
  zoneId: ZoneId;
  hostId: Card["hostId"];
  destinationHostId: Card["hostId"];
  interaction: InteractionKey;
  destinationZoneId: ZoneId;
  label?: string;
  className?: string;
}

/** A face-down draw action: tap for its menu or drop its visual copy into a hand. */
export function DrawPile({
  zoneId,
  hostId,
  destinationHostId,
  interaction: key,
  destinationZoneId,
  label = "Draw pile",
  className,
}: DrawPileProps) {
  const draw = useGame((game) => game.interactions.find(key));
  const count = useGame((game) => game.zones.find(zoneId, hostId)?.count ?? 0);
  const back = useGame((game) => {
    const top = game.zones.find(zoneId, hostId)?.getCards()[0];
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
  const scale = useMotionValue(1);
  const rotate = useMotionValue(0);
  const available = count > 0 && !!draw && !draw.getSubmitProps().disabled;
  const latest = useRef({ draw, available, snapshot, table });
  latest.current = { draw, available, snapshot, table };
  const highlighted = useRef<HTMLElement | null>(null);
  const sourceZone = { zoneId, hostId };
  const destinationZone = {
    zoneId: destinationZoneId,
    hostId: destinationHostId,
  };

  function clearTarget() {
    highlighted.current = null;
    latest.current.table.setDrop(null);
  }
  function destination() {
    return (
      control.current
        ?.closest("[data-game-ui]")
        ?.querySelector<HTMLElement>(
          `.db-hand[data-zone="${CSS.escape(destinationZoneId)}"][data-zone-host="${CSS.escape(destinationHostId)}"]`,
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
    latest.current.table.setDrop(destinationZone, over);
    return over;
  }
  function returnToPile() {
    clearTarget();
    setGhost((current) => (current ? { ...current, phase: "return" } : null));
    const home = control.current!.getBoundingClientRect();
    void moveTo(
      {
        x: home.x,
        y: home.y,
        width: home.width,
        height: home.height,
        rotate: 0,
      },
      home,
    ).then(() => setGhost(null));
  }
  function moveTo(target: CardPlacement, source: CardBox) {
    const transition = reduced ? { duration: 0 } : cardSettle;
    return Promise.all([
      animate(x, target.x + (target.width - source.width) / 2, transition),
      animate(y, target.y + (target.height - source.height) / 2, transition),
      animate(scale, target.width / source.width, transition),
      animate(rotate, target.rotate, transition),
    ]);
  }
  function placement(box: CardBox): CardPlacement {
    const width = box.width * scale.get();
    const height = box.height * scale.get();
    return {
      x: x.get() + (box.width - width) / 2,
      y: y.get() + (box.height - height) / 2,
      width,
      height,
      rotate: rotate.get(),
    };
  }
  async function submit(box: CardBox) {
    const current = latest.current;
    if (!current.available || !current.draw) {
      returnToPile();
      return;
    }
    setOpen(false);
    setError(null);
    const target = current.table.getDrawTarget(destinationZone);
    current.table.stageDraw(
      sourceZone,
      destinationZone,
      () => placement(box),
      target,
    );
    current.table.setDrop(destinationZone, true);
    setGhost({ box, phase: "pending", snapshot: current.snapshot });
    void moveTo(target, box);
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

  useLayoutEffect(() => {
    if (
      ghost?.phase === "pending" &&
      snapshot !== ghost.snapshot &&
      request === null
    ) {
      x.stop();
      y.stop();
      scale.stop();
      rotate.stop();
      setGhost(null);
    }
  }, [snapshot, request, ghost?.phase, ghost?.snapshot, x, y, scale, rotate]);
  useEffect(() => {
    press.current?.recognizer.cancel();
  }, [snapshot, request, zoneId, hostId, destinationZoneId, destinationHostId]);
  useEffect(
    () => () => {
      press.current?.detach();
      latest.current.table.setDrop(null);
      x.stop();
      y.stop();
      scale.stop();
      rotate.stop();
    },
    [],
  );

  function start(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    suppressClick.current = false;
    if (press.current || ghost) return;
    const box = event.currentTarget.getBoundingClientRect();
    const grab = {
      x: event.clientX - box.x,
      y:
        event.clientY -
        box.y +
        (event.pointerType === "touch" ? box.height * 0.3 : 0),
    };
    const recognizer = createGestureRecognizer(
      event.nativeEvent,
      {
        hold() {},
        dragStart() {
          if (!latest.current.available) return false;
          setOpen(false);
          x.set(box.x);
          y.set(box.y);
          scale.set(1);
          rotate.set(0);
          void animate(
            scale,
            reduced ? 1 : cardDragScale,
            reduced ? { duration: 0 } : cardPickup,
          );
          setGhost({ box, phase: "drag", snapshot });
          highlighted.current = destination();
          latest.current.table.setDrop(destinationZone);
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
          const touchTap = kind === "tap" && event.pointerType === "touch";
          suppressClick.current = kind !== "tap" || touchTap;
          if (touchTap) {
            setOpen((current) => !current);
          }
          if (kind !== "drag") {
            clearTarget();
            return;
          }
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

  return (
    <>
      <Pile
        count={count}
        label={label}
        data-zone={zoneId}
        data-zone-host={hostId}
        className={className}
      >
        <button
          ref={control}
          type="button"
          className="db-draw-pile-card"
          aria-label={`${label} actions`}
          data-draw-available={available}
          aria-haspopup="dialog"
          aria-expanded={open}
          data-draw-pile={zoneId}
          data-picked-up={ghost !== null || undefined}
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
                initialFocus
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
                    scale.set(1);
                    rotate.set(0);
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
                x,
                y,
                scale,
                rotate,
                width: ghost.box.width,
                height: ghost.box.height,
                "--card-w": `${ghost.box.width}px`,
              } as MotionStyle
            }
          >
            <CardBack image={back} />
          </motion.div>,
          document.body,
        )}
    </>
  );
}

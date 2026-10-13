import { useGame } from "@game";
import { motion, useReducedMotion, type MotionStyle } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { backImageOf, CardBack, cardSettle } from "./card";
import "./tokens.css";

import type { ShortcutZoneTarget } from "@game";
type PileZone = ShortcutZoneTarget extends infer Target
  ? Target extends { readonly zoneId: infer Zone; readonly hostId: infer Host }
    ? { zoneId: Zone; hostId: Host }
    : never
  : never;

/** Seconds from the split until the riffled pile squares up. */
const RIFFLE_DURATION = 0.66;
const PACKET_ROTATION = 9;

/**
 * Riffles the `Pile` it is placed in when the operation that produced the
 * current frame shuffled its zone, on every seat that sees the zone. Two
 * packets split off the top, interleave back and square up above the page,
 * so a clipped pile still has room; a pile at the window's edge splits
 * further in, keeping both packets in view. Requires `originsFeature`.
 */
export function PileRiffle({ zoneId, hostId }: PileZone) {
  const version = useGame(
    (game) => game.zones.find(zoneId, hostId)?.getShuffle()?.version ?? null,
  );
  const back = useGame((game) => {
    const top = game.zones.find(zoneId, hostId)?.getCards()[0];
    return top ? backImageOf(top) : null;
  });
  const reduced = useReducedMotion();
  const anchor = useRef<HTMLSpanElement>(null);
  const [riffle, setRiffle] = useState<{ key: number; box: DOMRect } | null>(
    null,
  );
  useLayoutEffect(() => {
    if (version === null || reduced) return;
    setRiffle({
      key: version,
      box: anchor.current!.parentElement!.getBoundingClientRect(),
    });
  }, [version, reduced]);
  const overlay = () => {
    const { x, y, width, height } = riffle!.box;
    const apart = width * 0.6;
    // sin(angle) <= angle keeps this margin safe throughout the rotation,
    // including the interpolated frames on the way back to the pile.
    const verticalReach = (width * PACKET_ROTATION * Math.PI) / 360;
    const lift = Math.min(
      Math.max(width * -0.12, verticalReach - y),
      innerHeight - y - height - verticalReach,
    );
    // A tilted packet reaches a little past its spread.
    const reach = width * 0.75;
    const center = Math.min(
      Math.max(0, reach - x),
      innerWidth - x - width - reach,
    );
    const split = (side: number) => center + side * apart;
    return createPortal(
      <motion.div
        key={riffle!.key}
        aria-hidden
        data-pile-riffle={zoneId}
        className="db-pile-riffle"
        style={{ left: x, top: y, "--card-w": `${width}px` } as MotionStyle}
        animate={{ scaleX: [1, 1, 1.04, 1], scaleY: [1, 1, 0.97, 1] }}
        transition={{ duration: RIFFLE_DURATION, times: [0, 0.82, 0.9, 1] }}
        onAnimationComplete={() => setRiffle(null)}
      >
        {[-1, 1].map((side) => (
          <CardBack
            key={side}
            image={back}
            animate={{
              x: [0, split(side), split(side), 0],
              y: [0, lift, lift, 0],
              rotate: [0, side * PACKET_ROTATION, side * PACKET_ROTATION, 0],
            }}
            transition={{
              duration: 0.5,
              times: [0, 0.3, 0.48, 1],
              ease: cardSettle.ease,
            }}
          />
        ))}
        {Array.from({ length: 6 }, (_, index) => {
          const side = index % 2 ? 1 : -1;
          const delay = 0.2 + index * 0.04;
          return (
            <CardBack
              key={index}
              image={back}
              initial={{
                x: split(side),
                y: lift,
                rotate: side * PACKET_ROTATION,
                opacity: 0,
              }}
              animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
              transition={{
                delay,
                duration: 0.16,
                ease: cardSettle.ease,
                opacity: { delay, duration: 0 },
              }}
            />
          );
        })}
      </motion.div>,
      document.body,
    );
  };
  return (
    <>
      {/* Measures the pile's stack without taking part in its layout. */}
      <span ref={anchor} hidden />
      {riffle ? overlay() : null}
    </>
  );
}

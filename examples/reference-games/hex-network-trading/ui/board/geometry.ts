import { useEffect, useState } from "react";
import { boardHelpers, idGuards } from "@dreamboard/manifest-contract";

export const FRONTIER_TRAILS_HEX_SIZE = 56;
export const FRONTIER_TRAILS_INITIAL_ZOOM = 0.9;
export const FRONTIER_TRAILS_MAX_ZOOM = 1.2;
export const FRONTIER_TRAILS_BASE_VIEWPORT = { width: 900, height: 560 };
export const TILE_OUTER_INSET = 6;
export const TILE_INNER_INSET = 13;
export const SECTOR = "frontier" as const;
export const SPACE_KINDS = boardHelpers.spaceKinds(SECTOR);
// Sticky-note market posts sit out in the borderland margin, pointing back at
// the frontier edge with a pencil tick.
export const PORT_BADGE_OCEAN_OFFSET = 34;

export function spaceKind(spaceId: string) {
  return idGuards.isSpaceId(spaceId) ? SPACE_KINDS[spaceId] : undefined;
}

function seededFraction(seed: string, salt: number) {
  let hash = salt * 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

export function seededRotation(seed: string, salt: number, range: number) {
  return (seededFraction(seed, salt) - 0.5) * 2 * range;
}

export function useElementSize<Element extends HTMLElement>() {
  const [element, setElement] = useState<Element | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const update = () => {
      if (!element) return;
      const rect = element.getBoundingClientRect();
      setSize((current) =>
        current.width === rect.width && current.height === rect.height
          ? current
          : { width: rect.width, height: rect.height },
      );
    };
    update();

    window.addEventListener("resize", update);

    const observer =
      !element || typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(update);
    if (element) observer?.observe(element);

    return () => {
      window.removeEventListener("resize", update);
      observer?.disconnect();
    };
  }, [element]);

  return { ref: setElement, size };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function starPoints(seed: string, count: number, radius: number) {
  return Array.from({ length: count }, (_, index) => {
    const angle = seededFraction(seed, index + 1) * Math.PI * 2;
    const distance = (0.28 + seededFraction(seed, index + 11) * 0.62) * radius;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      r: 0.6 + seededFraction(seed, index + 21) * 0.9,
    };
  });
}

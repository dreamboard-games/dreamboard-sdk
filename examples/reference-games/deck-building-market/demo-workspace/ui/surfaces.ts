import { UI, Zone } from "#dreamboard/ui-contract";
import { literals, type CardType } from "../shared/manifest-contract";

export type SupplyZoneId =
  (typeof literals.homeSharedZoneIdByCardType)[CardType];

// Supply piles grouped by card kind, so the supply renders as four labelled
// sections of one tile per pile (top card only — never one tile per card).
export const ACTION_SUPPLY_ZONES = [
  "supply-brainstorm",
  "supply-studio",
  "supply-gallery",
  "supply-open-mic",
  "supply-critic",
  "supply-eraser",
  "supply-sketchpad",
  "supply-studio-visit",
] as const satisfies readonly SupplyZoneId[];

export const TREASURE_SUPPLY_ZONES = [
  "supply-doodle",
  "supply-sketch",
  "supply-inkwork",
] as const satisfies readonly SupplyZoneId[];

export const VICTORY_SUPPLY_ZONES = [
  "supply-idea",
  "supply-concept",
  "supply-masterpiece",
] as const satisfies readonly SupplyZoneId[];

export const CURSE_SUPPLY_ZONES = [
  "supply-smudge",
] as const satisfies readonly SupplyZoneId[];

export const SUPPLY_ZONES = [
  ...ACTION_SUPPLY_ZONES,
  ...TREASURE_SUPPLY_ZONES,
  ...VICTORY_SUPPLY_ZONES,
  ...CURSE_SUPPLY_ZONES,
] as const satisfies readonly SupplyZoneId[];

export const useSketchbookSurfaces = UI.defineSurfaces({
  hand: Zone.hand("hand", {
    role: "primary",
    label: "Your hand",
  }),
  deck: Zone.pile("deck"),
  discard: Zone.pile("discard"),
  // Single collector spanning every supply pile. Bound to both `buyCard`
  // (buy step) and `resolveStudioVisit` (resolve step); the active step picks
  // which interaction a supply tap routes to, so one binding serves both.
  market: Zone.collection(SUPPLY_ZONES, { mode: "top-card" }),
  // Grouped top-card display surfaces (one tile per pile).
  supplyActions: Zone.collection(ACTION_SUPPLY_ZONES, { mode: "top-card" }),
  supplyTreasures: Zone.collection(TREASURE_SUPPLY_ZONES, { mode: "top-card" }),
  supplyVictory: Zone.collection(VICTORY_SUPPLY_ZONES, { mode: "top-card" }),
  supplyCurses: Zone.collection(CURSE_SUPPLY_ZONES, { mode: "top-card" }),
});

export type SketchbookSurfaces = ReturnType<typeof useSketchbookSurfaces>;

export const SUPPLY_GROUPS = [
  { label: "Actions", surfaceKey: "supplyActions" },
  { label: "Treasures", surfaceKey: "supplyTreasures" },
  { label: "Victory", surfaceKey: "supplyVictory" },
  { label: "Curses", surfaceKey: "supplyCurses" },
] as const satisfies ReadonlyArray<{
  label: string;
  surfaceKey: keyof SketchbookSurfaces;
}>;

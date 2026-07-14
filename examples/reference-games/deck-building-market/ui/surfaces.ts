import { UI, Zone } from "../shared/generated/ui-contract";
import type { SharedZoneId } from "../shared/manifest-contract";

export const TECHNIQUE_SUPPLY_ZONES = [
  "supply-brainstorm",
  "supply-studio",
  "supply-gallery",
  "supply-eraser",
  "supply-studio-visit",
] as const satisfies readonly SharedZoneId[];

export const INSPIRATION_SUPPLY_ZONES = [
  "supply-doodle",
  "supply-sketch",
  "supply-inkwork",
] as const satisfies readonly SharedZoneId[];

export const PORTFOLIO_SUPPLY_ZONES = [
  "supply-idea",
  "supply-concept",
  "supply-masterpiece",
] as const satisfies readonly SharedZoneId[];

export const SUPPLY_ZONES = [
  ...INSPIRATION_SUPPLY_ZONES,
  ...PORTFOLIO_SUPPLY_ZONES,
  ...TECHNIQUE_SUPPLY_ZONES,
] as const;

export const useSketchbookSurfaces = UI.defineSurfaces({
  hand: Zone.hand("hand", { role: "primary", label: "Your hand" }),
  market: Zone.collection(SUPPLY_ZONES, { mode: "top-card" }),
  supplyTechniques: Zone.collection(TECHNIQUE_SUPPLY_ZONES, {
    mode: "top-card",
  }),
  supplyInspiration: Zone.collection(INSPIRATION_SUPPLY_ZONES, {
    mode: "top-card",
  }),
  supplyPortfolio: Zone.collection(PORTFOLIO_SUPPLY_ZONES, {
    mode: "top-card",
  }),
});

export type SketchbookSurfaces = ReturnType<typeof useSketchbookSurfaces>;

export const SUPPLY_GROUPS = [
  { label: "Inspiration", surfaceKey: "supplyInspiration" },
  { label: "Portfolio", surfaceKey: "supplyPortfolio" },
  { label: "Techniques", surfaceKey: "supplyTechniques" },
] as const satisfies ReadonlyArray<{
  readonly label: string;
  readonly surfaceKey: keyof SketchbookSurfaces;
}>;

import { UI, Zone } from "#dreamboard/ui-contract";

export const useHeartsSurfaces = UI.defineSurfaces({
  handSurface: Zone.hand("hand", {
    role: "primary",
    label: "Your hand",
  }),
});

export type HeartsSurfaces = ReturnType<typeof useHeartsSurfaces>;

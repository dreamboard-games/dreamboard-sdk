import { UI, Zone } from "./game-ui";

export const useHeartsSurfaces = UI.defineSurfaces({
  handSurface: Zone.hand("hand", {
    role: "primary",
    label: "Your hand",
  }),
});

export type HeartsSurfaces = ReturnType<typeof useHeartsSurfaces>;

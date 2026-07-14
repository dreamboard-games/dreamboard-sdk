import { Interaction, UI, Zone } from "../shared/generated/ui-contract";

export const useLanternMarketSurfaces = UI.defineSurfaces({
  hand: Zone.hand("hand", {
    role: "primary",
    label: "Your market hand",
  }),
  draftingForm: Interaction.form("drafting.submit"),
});

export type LanternMarketSurfaces = ReturnType<typeof useLanternMarketSurfaces>;

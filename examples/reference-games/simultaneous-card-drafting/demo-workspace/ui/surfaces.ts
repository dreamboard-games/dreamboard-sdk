import { Interaction, UI, Zone } from "#dreamboard/ui-contract";

export const useSushiGoSurfaces = UI.defineSurfaces({
  hand: Zone.hand("hand", {
    role: "primary",
    label: "Your hand",
  }),
  draftingForm: Interaction.form("drafting.submit"),
});

export type SushiGoSurfaces = ReturnType<typeof useSushiGoSurfaces>;

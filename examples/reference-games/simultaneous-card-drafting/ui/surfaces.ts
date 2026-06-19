import { Interaction, UI, Zone } from "../shared/generated/ui-contract.ts";

export const useSushiGoSurfaces = UI.defineSurfaces({
  hand: Zone.hand("hand", {
    role: "primary",
    label: "Your hand",
  }),
  draftingForm: Interaction.form("drafting.submit"),
});

export type SushiGoSurfaces = ReturnType<typeof useSushiGoSurfaces>;

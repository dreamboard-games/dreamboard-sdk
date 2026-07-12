import { Interaction } from "../shared/generated/ui-contract";
import { PRIMARY_BUTTON_CLASS } from "./components/surfaces";
import type { LanternMarketSurfaces } from "./surfaces";

export function LanternMarketInteractionRoutes({
  hand,
  draftingForm,
  renderSubmit = true,
}: Pick<LanternMarketSurfaces, "hand" | "draftingForm"> & {
  renderSubmit?: boolean;
}) {
  return (
    <>
      <Interaction.Routes
        routes={{
          "setup.submit": { collect: {} },
          "drafting.submit": {
            collect: { cardId: hand.slot.card },
          },
          "scoreRound.submit": { collect: {} },
          "gameOver.submit": { collect: {} },
        }}
      />
      {renderSubmit ? (
        <LanternMarketDraftingAction draftingForm={draftingForm} />
      ) : null}
    </>
  );
}

export function LanternMarketDraftingAction({
  draftingForm,
}: Pick<LanternMarketSurfaces, "draftingForm">) {
  return (
    <draftingForm.State unavailable={null}>
      {(state) =>
        state.available ? (
          <div className="grid min-w-[190px] gap-2 rounded-xl border-2 border-[#40251b] bg-[#fffaf0] p-3 shadow-[4px_4px_0_#40251b]">
            <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-[#9b3f2f]">
              Sealed choice
            </p>
            <p className="m-0 text-xs leading-5 text-[#68483b]">
              Select one card. It stays private until every stall owner locks a
              choice.
            </p>
            <draftingForm.Submit className={PRIMARY_BUTTON_CLASS}>
              Lock card
            </draftingForm.Submit>
          </div>
        ) : null
      }
    </draftingForm.State>
  );
}

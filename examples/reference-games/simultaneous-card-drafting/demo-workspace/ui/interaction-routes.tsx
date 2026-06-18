import { Interaction, type InteractionRoutes } from "#dreamboard/ui-contract";
import type { ReactNode } from "react";
import {
  ACTION_BUTTON_CLASS,
  PRIMARY_BUTTON_CLASS,
} from "./components/surfaces";
import type { SushiGoSurfaces } from "./types";

function ActionPanel({
  title,
  detail,
  children,
}: {
  title: string;
  detail?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2 rounded-lg border-2 border-[#2d2d2d] bg-[#fdfbf7] p-2">
      <div>
        <div className="text-sm font-bold">{title}</div>
        {detail ? (
          <div className="text-[11px] text-slate-500">{detail}</div>
        ) : null}
      </div>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}

export function SushiGoInteractionRoutes({
  hand,
  draftingForm,
  canUseChopsticks,
}: Pick<SushiGoSurfaces, "hand" | "draftingForm"> & {
  canUseChopsticks: boolean;
}) {
  const setupForm = Interaction.useForm("setup.submit");
  const scoreRoundForm = Interaction.useForm("scoreRound.submit");
  const gameOverForm = Interaction.useForm("gameOver.submit");

  const routes = {
    "setup.submit": {
      collect: {},
    },
    "drafting.submit": {
      collect: {
        cardIds: hand.slot.card,
        useChopsticks: draftingForm.slot.useChopsticks,
      },
    },
    "scoreRound.submit": {
      collect: {},
    },
    "gameOver.submit": {
      collect: {},
    },
  } satisfies InteractionRoutes;

  return (
    <>
      <Interaction.Routes routes={routes} />
      <setupForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <setupForm.Submit className={ACTION_BUTTON_CLASS}>
              Continue
            </setupForm.Submit>
          ) : null
        }
      </setupForm.State>
      <draftingForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <ActionPanel
              title="Make your pick"
              detail={
                canUseChopsticks
                  ? "Choose one card, or use chopsticks to choose two."
                  : "Choose one card to keep."
              }
            >
              {canUseChopsticks ? (
                <draftingForm.slot.useChopsticks.Field />
              ) : (
                <draftingForm.slot.useChopsticks.Default />
              )}
              <draftingForm.Submit className={PRIMARY_BUTTON_CLASS}>
                Confirm pick
              </draftingForm.Submit>
            </ActionPanel>
          ) : null
        }
      </draftingForm.State>
      <scoreRoundForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <scoreRoundForm.Submit className={ACTION_BUTTON_CLASS}>
              Continue
            </scoreRoundForm.Submit>
          ) : null
        }
      </scoreRoundForm.State>
      <gameOverForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <gameOverForm.Submit className={ACTION_BUTTON_CLASS}>
              Finish
            </gameOverForm.Submit>
          ) : null
        }
      </gameOverForm.State>
    </>
  );
}

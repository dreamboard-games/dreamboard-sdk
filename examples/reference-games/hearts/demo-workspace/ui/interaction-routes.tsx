import { Interaction, type HandSurface } from "#dreamboard/ui-contract";

export const PRIMARY_BUTTON =
  "rounded-xl border-2 border-slate-900 bg-rose-500 px-5 py-2 text-sm font-bold text-white shadow-[3px_3px_0_#111] transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

export function HeartsInteractionRoutes({
  handSurface,
}: {
  handSurface: HandSurface<readonly ["hand"]>;
}) {
  const setupForm = Interaction.useForm("setup.submit");
  const playingSubmitForm = Interaction.useForm("playing.submit");
  const playingCardForm = Interaction.useForm("playing.playCard");
  const scoreHandForm = Interaction.useForm("scoreHand.submit");
  const gameOverForm = Interaction.useForm("gameOver.submit");

  return (
    <>
      <Interaction.Routes
        routes={{
          "setup.submit": {
            collect: {},
          },
          "passing.submit": {
            collect: {
              cardIds: handSurface.slot.card,
            },
          },
          "playing.submit": {
            collect: {},
          },
          "playing.playCard": {
            collect: {
              cardId: handSurface.slot.card,
            },
          },
          "scoreHand.submit": {
            collect: {},
          },
          "gameOver.submit": {
            collect: {},
          },
        }}
      />
      <setupForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <setupForm.Submit className={PRIMARY_BUTTON}>
              Continue
            </setupForm.Submit>
          ) : null
        }
      </setupForm.State>
      {/* The passing submit renders inside the hand summary instead of here
          (built as `passAction` in game-ui.tsx, passed to HandRow's
          renderSummary). On mobile the SDK lifts the hand into a modal drawer,
          so a felt-anchored button would sit behind the drawer scrim and be
          untappable — keeping it in the hand summary puts it inside the drawer
          with the selected cards. */}
      <playingSubmitForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <playingSubmitForm.Submit className={PRIMARY_BUTTON}>
              Continue
            </playingSubmitForm.Submit>
          ) : null
        }
      </playingSubmitForm.State>
      <playingCardForm.State unavailable={null}>
        {() => null}
      </playingCardForm.State>
      <scoreHandForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <scoreHandForm.Submit className={PRIMARY_BUTTON}>
              Continue
            </scoreHandForm.Submit>
          ) : null
        }
      </scoreHandForm.State>
      <gameOverForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <gameOverForm.Submit className={PRIMARY_BUTTON}>
              Finish
            </gameOverForm.Submit>
          ) : null
        }
      </gameOverForm.State>
    </>
  );
}

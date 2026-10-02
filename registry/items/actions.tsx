import { Button } from "@/components/ui/button";
import { useGame } from "@game";
import "./tokens.css";
import type { GameModel as Model } from "@game";
export type BoundInteraction = NonNullable<
  ReturnType<Model["interactions"]["get"]>
>;
export type InteractionKey = Parameters<Model["interactions"]["get"]>[0];
export interface ActionsProps {
  interaction: InteractionKey;
  className?: string;
}
export function Actions({ interaction: key, className }: ActionsProps) {
  const connection = useGame((game) => game.connection);
  const interaction = useGame((game) => game.interactions.find(key));
  if (!interaction) return null;
  const step = interaction.getStep();
  const busy = interaction.getStatus() !== "open" || connection !== "ready";
  return (
    <div
      className={`db-actions flex flex-wrap items-center gap-3 ${className ?? ""}`}
    >
      <Button className="min-h-11" {...interaction.getSubmitProps()}>
        {busy ? "Submitting…" : step ? "Continue" : interaction.label}
      </Button>
      {step?.canCancel && (
        <Button
          variant="outline"
          className="min-h-11"
          type="button"
          data-action="cancel"
          data-interaction={key}
          disabled={busy}
          data-disabled={busy}
          onClick={() => {
            void interaction
              .cancel()
              .then((result) => {
                if (!result.accepted) {
                  interaction.game.getOptions().onError?.(
                    new Error(result.message ?? result.errorCode, {
                      cause: result,
                    }),
                  );
                }
              })
              .catch((error) => interaction.game.getOptions().onError?.(error));
          }}
        >
          Cancel
        </Button>
      )}
      <Button
        variant="outline"
        className="min-h-11"
        type="button"
        data-action="reset"
        data-interaction={key}
        disabled={busy}
        data-disabled={busy}
        onClick={() => interaction.reset()}
      >
        Reset selection
      </Button>
      {interaction.getUnavailableReason() && (
        <p role="status">{interaction.getUnavailableReason()}</p>
      )}
    </div>
  );
}

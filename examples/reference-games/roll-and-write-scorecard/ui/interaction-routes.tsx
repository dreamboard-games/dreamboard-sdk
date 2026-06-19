import {
  Interaction,
  type BoardSurface,
} from "../shared/generated/ui-contract.ts";

export function CloudlineInteractionRoutes({
  surveyGrid,
}: {
  surveyGrid: BoardSurface<"survey-grid">;
}) {
  const markCellForm = Interaction.useForm("markSurvey.markCell");

  return (
    <>
      <Interaction.Routes
        routes={{
          "setup.submit": {
            collect: {},
          },
          "markSurvey.markCell": {
            collect: {
              cell: surveyGrid.slot.playerSpace,
            },
          },
          "markSurvey.submit": {
            collect: {},
          },
          "gameOver.submit": {
            collect: {},
          },
        }}
      />
      <markCellForm.State unavailable={null}>
        {(state) =>
          state.available ? (
            <markCellForm.Submit className="rounded-md border-2 border-slate-900 bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-[2px_2px_0_#0f172a] disabled:cursor-not-allowed disabled:opacity-50">
              Mark cell
            </markCellForm.Submit>
          ) : null
        }
      </markCellForm.State>
    </>
  );
}

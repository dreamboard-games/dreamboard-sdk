import type { CardId } from "../shared/manifest-contract";
import { Interaction } from "@dreamboard-games/sdk/runtime/primitives";

export function DraftInteractionRoutes({ cardId }: { cardId: CardId }) {
  return (
    <section className="draft-action">
      <h2>Draft Action</h2>
      <Interaction.Root interaction="drafting.draftStall">
        <Interaction.Submit params={{ cardId }}>Draft stall</Interaction.Submit>
      </Interaction.Root>
    </section>
  );
}

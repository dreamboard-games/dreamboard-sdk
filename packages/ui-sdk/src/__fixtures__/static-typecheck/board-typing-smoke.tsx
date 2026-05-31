import { BoardView, CardFace, GameLayout } from "@dreamboard-games/ui-sdk";

export function BoardTypingSmoke() {
  return (
    <GameLayout.Root>
      <GameLayout.Board>
        <BoardView.Root>
          <CardFace card={{ id: "card-1", name: "Card One" }} />
        </BoardView.Root>
      </GameLayout.Board>
    </GameLayout.Root>
  );
}

import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { GameLayout } from "./index.js";

test("GameLayout exposes Radix-style layout parts and asChild composition", () => {
  const html = renderToString(
    <GameLayout.Root className="root">
      <GameLayout.Board asChild className="board">
        <main className="custom-board">Board</main>
      </GameLayout.Board>
      <GameLayout.Sidebar>Sidebar</GameLayout.Sidebar>
      <GameLayout.Bottom>Bottom</GameLayout.Bottom>
    </GameLayout.Root>,
  );

  expect(html).toContain('data-dreamboard-game-layout=""');
  expect(html).toContain('data-dreamboard-game-layout-board=""');
  expect(html).toContain('class="board custom-board"');
  expect(html).toContain('data-dreamboard-game-layout-sidebar=""');
  expect(html).toContain('data-dreamboard-game-layout-bottom=""');
});

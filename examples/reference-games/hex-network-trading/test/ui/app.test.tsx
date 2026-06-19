import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function readProjection(path: string) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
}

function readUiSource(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("Frontier Trails initial-turn projection is generated and parseable", () => {
  const projection = readProjection(
    "../generated/bases/initial-turn/player-1.projection.json",
  );

  assert.equal(typeof projection, "object");
  assert.ok(projection !== null, "projection should not be null");
  assert.equal(projection.currentStage, "setup");
  assert.equal(projection.view.spaces.length, 37);
});

test("Frontier Trails UI uses typed interaction forms and semantic surfaces", () => {
  const appSource = readUiSource("../../ui/App.tsx");
  const surfacesSource = readUiSource("../../ui/surfaces.ts");
  const routesSource = readUiSource("../../ui/interaction-routes.tsx");
  const boardSource = readUiSource("../../ui/frontier-trails-board.tsx");
  const shortcutSource = readUiSource(
    "../../app/phases/player-turn/charter-cards.ts",
  );

  assert.match(
    surfacesSource,
    /UI\.defineSurfaces\(\{\s*frontierBoard: Board\.surface\("frontier"\)/,
  );
  assert.match(
    surfacesSource,
    /charterHand: Zone\.hand\("charter-hand",\s*\{\s*role: "auxiliary",\s*label: "Charter cards"/,
  );
  assert.match(
    surfacesSource,
    /tradeWithBankForm: Interaction\.form\("playerTurn\.tradeWithBank"\)/,
  );
  assert.match(
    surfacesSource,
    /respondToTradeForm: Interaction\.form\("playerTurn\.respondToTrade"\)/,
  );
  assert.match(
    surfacesSource,
    /playSurveyGrantForm: Interaction\.form\("playerTurn\.playSurveyGrant"\)/,
  );
  assert.match(routesSource, /satisfies InteractionRoutes/);
  assert.match(routesSource, /cardId: charterHand\.slot\.card/);
  assert.match(routesSource, /edgeIds: frontierBoard\.slot\.edge/);
  assert.match(routesSource, /response: respondToTradeForm\.slot\.response/);
  assert.match(routesSource, /DialogSurface=\{offerTradeForm\.Dialog\}/);
  assert.match(routesSource, /DialogSurface=\{playScoutForm\.Dialog\}/);
  assert.match(routesSource, /contentClassName=/);
  assert.match(shortcutSource, /many\(\s*boardInput\.edge/);
  assert.match(shortcutSource, /commit: \{ mode: "manual" \}/);
  assert.doesNotMatch(appSource, /createSlot/);
  assert.doesNotMatch(appSource, /Interaction as SdkInteraction/);
  assert.doesNotMatch(appSource, /<Zone\.(Root|List|Item|CardAction)/);
  assert.doesNotMatch(appSource, /<Interaction\.Routes/);
  assert.doesNotMatch(routesSource, /edgeId1|edgeId2/);
  assert.doesNotMatch(routesSource, /starRoutes|submitRoute/);
  assert.doesNotMatch(routesSource, /<Dialog open>/);
  assert.doesNotMatch(
    routesSource,
    /DialogSurface=\{playShortcutForm\.Dialog\}/,
  );
  assert.doesNotMatch(routesSource, /<Board\.Root/);
  assert.doesNotMatch(appSource, /defineInteractionRoutes/);

  assert.match(boardSource, /<Board\.HexGrid/);
  assert.match(boardSource, /<board\.Root>/);
  assert.doesNotMatch(boardSource, /Board\.Followup/);
});

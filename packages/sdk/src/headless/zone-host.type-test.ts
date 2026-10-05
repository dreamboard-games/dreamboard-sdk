import type { GameInstance } from "./model.js";

declare const game: GameInstance<unknown>;

game.zones.get("discard", "table");
game.zones.find("hand", "alice");
// A player can be named "table"; the caller supplies the intended host explicitly.
game.zones.get("hand", "table");
// @ts-expect-error A zone ID alone cannot identify one host instance.
game.zones.get("hand");
// @ts-expect-error Optional lookup still requires an explicit host identity.
game.zones.find("hand");

const card = game.cards.get("ace");
const host: string = card.hostId;
void host;

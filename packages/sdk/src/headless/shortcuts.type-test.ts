import { z } from "zod";
import { createGame } from "../reducer.js";
import { compileManifest } from "../reducer/manifest/compiler.js";
import { createGameHook } from "../react/create-game-hook.js";
import {
  shortcutsFeature,
  type ShortcutBinding,
  type ShortcutTarget,
  type ShortcutHint,
} from "./features/shortcuts.js";
import type { CoreInstance } from "./model.js";
const model = createGame({
  manifest: compileManifest({
    players: { minPlayers: 1, maxPlayers: 2 },
    cardSets: [],
    pieceTypes: [{ id: "worker", name: "Worker" }],
    pieceSeeds: [{ id: "pawn", typeId: "worker" }],
    zones: [
      {
        id: "deck",
        name: "Deck",
        attachedTo: { pieceType: "worker" },
        visibility: "public",
      },
    ],
    boards: [
      {
        id: "market",
        name: "Market",
        scope: "shared",
        layout: "generic",
        spaces: [{ id: "supply" }],
      },
    ],
  }),
  phases: { play: z.object({}) },
  state: { public: z.object({}), private: z.object({}), hidden: z.object({}) },
});
const play = model.phase("play");
const game = model.assemble({
  initialPhase: "play",
  phases: {
    play: play.define({
      kind: "player",
      initialState: () => ({}),
      interactions: {
        draw: play.interaction({
          inputs: { count: play.inputs.form.number({ min: 1, max: 9 }) },
          reduce() {},
        }),
        flip: play.interaction({
          inputs: { card: play.inputs.card({ from: ["deck"] }) },
          reduce() {},
        }),
        move: play.interaction({
          inputs: { space: play.inputs.board.space({ boardId: "market" }) },
          reduce() {},
        }),
      },
    }),
  },
  view: model.view(() => ({})),
});
type Binding = ShortcutBinding<typeof game>;
const draw: Binding = {
  kind: "interaction" as const,
  keys: ["1"],
  label: "Draw",
  interaction: "play.draw",
  target: "zone",
  zoneId: "deck",
  inputs: ({ key, target }) => {
    const host: "pawn" = target.hostId;
    void host;
    return { count: Number(key) };
  },
};
const flip: Binding = {
  kind: "interaction" as const,
  keys: ["f"],
  label: "Flip",
  interaction: "play.flip",
  target: "card",
  input: "card",
  inputs: ({ target }) => ({ card: target.value }),
};
const move: Binding = {
  kind: "interaction" as const,
  keys: ["m"],
  label: "Move",
  interaction: "play.move",
  target: "space",
  input: "space",
  inputs: ({ target }) => ({ space: target.value }),
};
// @ts-expect-error The interaction name is derived from reducer phases.
const unknownInteraction: Binding = { ...draw, interaction: "play.missing" };
// @ts-expect-error Zone filters must name an authored zone.
const unknownZone: Binding = { ...draw, target: "zone", zoneId: "missing" };
// @ts-expect-error A numeric form input cannot consume a card target.
const wrongKind: Binding = { ...draw, target: "card", input: "count" };
// @ts-expect-error The draw interaction requires its count payload.
const missingInput: Binding = { ...draw, inputs: () => ({}) };
// @ts-expect-error Payloads remain correlated with their interaction.
const wrongPayload: Binding = { ...draw, inputs: () => ({ count: "three" }) };
// @ts-expect-error A card input key does not belong to the draw interaction.
const wrongInput: Binding = { ...draw, target: "card", input: "card" };
const target: ShortcutTarget<typeof game> = {
  kind: "zone",
  zoneId: "deck",
  hostId: "pawn",
};
const wrongHost: ShortcutTarget<typeof game> = {
  kind: "zone",
  zoneId: "deck",
  // @ts-expect-error A piece-attached zone requires its actual piece host.
  hostId: "alice",
};
declare const core: CoreInstance<typeof game>;
core.interactions.get("play.draw").submit({ count: 3 });
// @ts-expect-error Atomic submit must supply required authored inputs.
core.interactions.get("play.draw").submit({});
// @ts-expect-error Atomic submit preserves input payload types.
core.interactions.get("play.flip").submit({ card: 42 });
const hooks = createGameHook<typeof game>()({
  features: (core, context) => ({ shortcuts: shortcutsFeature(core, context) }),
});
void [
  draw,
  flip,
  move,
  unknownInteraction,
  unknownZone,
  wrongKind,
  missingInput,
  wrongPayload,
  wrongInput,
  target,
  wrongHost,
  hooks,
];

declare const hint: Extract<ShortcutHint<typeof game>, { kind: "interaction" }>;
const interaction: "play.draw" | "play.flip" | "play.move" = hint.interaction;
// @ts-expect-error Hints retain the game's authored interaction identity.
const unknownHint: "play.unknown" = hint.interaction;
hooks.useGameShortcuts({
  bindings: [
    {
      kind: "interaction" as const,
      keys: ["2"],
      label: "Draw",
      target: "zone",
      zoneId: "deck",
      interaction: "play.draw",
      inputs: ({ key, target }) => {
        const host: "pawn" = target.hostId;
        void host;
        return { count: Number(key) };
      },
    },
    {
      kind: "interaction" as const,
      keys: ["f"],
      label: "Flip",
      target: "card",
      input: "card",
      interaction: "play.flip",
      inputs: ({ target }) => ({ card: target.value }),
    },
  ],
});
hooks.useShortcutTarget({ kind: "zone", zoneId: "deck", hostId: "pawn" });
// @ts-expect-error The inferred hook retains the zone's canonical host family.
hooks.useShortcutTarget({ kind: "zone", zoneId: "deck", hostId: "alice" });
void [interaction, unknownHint];

// Bound submit controls preserve the interaction's canonical payload.
core.interactions.get("play.draw").getSubmitProps({ count: 2 });
core.interactions.get("play.draw").getSubmitHandler({ count: 2 });
// @ts-expect-error Payloads remain correlated with the bound interaction.
core.interactions.get("play.draw").getSubmitProps({ card: "pawn" });
// @ts-expect-error Bound input values preserve their authored type.
core.interactions.get("play.draw").getSubmitHandler({ count: "two" });
hooks.useDropArea({ interaction: "play.draw", params: { count: 2 } });
// @ts-expect-error Bound drop inputs are typed by the interaction.
hooks.useDropArea({ interaction: "play.draw", params: { count: "two" } });
// @ts-expect-error The gesture supplies the dropped card; an area cannot override it.
hooks.useDropArea({ interaction: "play.flip", params: { card: "pawn" } });
const local: Binding = {
  kind: "local",
  keys: ["s"],
  label: "Change hand order",
  target: "zone",
  zoneId: "deck",
  getIsAvailable: ({ target }) => {
    const host: "pawn" = target.hostId;
    return host === "pawn";
  },
  run: ({ key, target }) => {
    const zone: "deck" = target.zoneId;
    const host: "pawn" = target.hostId;
    void [key, zone, host];
  },
};
// @ts-expect-error Local bindings retain authored zone identities.
const missingLocalZone: Binding = { ...local, zoneId: "unknown" };
// @ts-expect-error Local bindings accept only focus-scoped zone actions.
const localCard: Binding = { ...local, target: "card" };
const submitResultLocal: Binding = {
  ...local,
  // @ts-expect-error Local callbacks do not impersonate reducer submit results.
  run: () => ({ accepted: true }),
};
hooks.useGameShortcuts({
  bindings: [
    {
      kind: "local",
      keys: ["s"],
      label: "Sort",
      target: "zone",
      zoneId: "deck",
      run: ({ target }) => {
        const host: "pawn" = target.hostId;
        void host;
      },
    },
  ],
});
declare const localHint: Extract<ShortcutHint<typeof game>, { kind: "local" }>;
// @ts-expect-error Local hints have no reducer interaction.
localHint.interaction;
void [local, missingLocalZone, localCard, submitResultLocal];

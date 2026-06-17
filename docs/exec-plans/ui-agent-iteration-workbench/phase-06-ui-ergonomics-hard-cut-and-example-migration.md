# Phase 06: UI Ergonomics Hard Cut And Example Migration

Status: complete for the Hearts foundation.

Closeout artifacts:

- Baseline:
  `artifacts/phase-06-ergonomics-baseline.md`.
- Migration receipt:
  `artifacts/phase-06-migration-receipt.md`.

Closeout note: Hearts intentionally uses the shared lower-level runtime helper
because the portable reference consumer does not own a generated per-game
workspace contract. Phase 06 completed the SDK/generated API hard cut, migrated
the shared reference root to `Game.Viewport`, and added hard-cut guards.
Generated `UI.defineGameUI` and compound hand behavior are covered by SDK
compile/runtime tests. Migrating optional reference examples to richer
generated source is follow-up.

## Objective

Use the Workbench safety net and Hearts to remove recurring UI authoring
boilerplate from the required SDK reference boundary.

The target is not fewer lines by itself. The target is one explicit,
type-checked path for root composition, hand layout, mobile overlay insets,
action panels, and interaction dialogs.

## Evidence from the reference games

The current examples repeatedly expose the same framework gaps:

- every app manually nests `UI.Root`, `Game.Root`, and `Phase.Switch`;
- interaction collector routes and rendered interaction panels are assembled
  separately;
- games call `useMobileHandTrayActive()` to hide duplicate chrome or choose
  hard-coded bottom padding;
- generated hands use `renderSummary` and `renderActions` callbacks instead of
  composable slots;
- several games define local `ActionPanel` components despite an SDK action
  panel;
- several games combine `Interaction.Dialog` lifecycle with the low-level
  visual dialog primitives by hand;
- the simultaneous drafting example bypasses the standard mobile hand path.

Capture exact counts and source locations in
`artifacts/phase-06-ergonomics-baseline.md` before implementation.

## 06A. Add an explicit `UI.defineGameUI` composition helper

The helper should mount:

- `UI.Root`;
- `Game.Root`;
- one exhaustive `Phase.Switch`;
- one `Interaction.Routes`;
- the explicit surface hook;
- optional interaction UI.

It must not inspect JSX, infer routes from rendered children, or invent
bindings.

Target authoring shape:

```tsx
import { UI } from "#dreamboard/ui-contract";

const useSurfaces = UI.defineSurfaces({
  hand: {
    kind: "hand",
    zone: "hand",
    role: "primary",
    label: "Your hand",
  },
  passForm: {
    kind: "form",
    interaction: "passing.submit",
  },
});

export default UI.defineGameUI({
  useSurfaces,
  interactionRoutes: ({ surfaces }) => ({
    "passing.submit": {
      collect: {
        cardIds: surfaces.hand.slot.card,
      },
    },
    "playing.playCard": {
      collect: {
        cardId: surfaces.hand.slot.card,
      },
    },
  }),
  phases: {
    setup: ({ game, surfaces }) => (
      <SetupView game={game} surfaces={surfaces} />
    ),
    passing: ({ game, surfaces }) => (
      <PassingView game={game} surfaces={surfaces} />
    ),
    playing: ({ game, surfaces }) => (
      <PlayingView game={game} surfaces={surfaces} />
    ),
    scoreHand: ({ game, surfaces }) => (
      <ScoreView game={game} surfaces={surfaces} />
    ),
    gameOver: ({ game, surfaces }) => (
      <GameOverView game={game} surfaces={surfaces} />
    ),
  },
  renderInteractions: ({ game, surfaces }) => (
    <HeartsInteractionUI game={game} surfaces={surfaces} />
  ),
});
```

Generated types must enforce:

- every phase has exactly one renderer;
- every collector route is declared;
- unknown phase and interaction keys fail;
- surface hook return type flows into phase and interaction renderers;
- the helper returns a normal React component suitable for the production
  plugin entry point and compiled fixture module.

The helper is a composition API, not a replacement for the generated contract.

## 06B. Replace hand render callbacks with compound slots

Replace `renderSummary` and `renderActions` with an explicit compound
structure:

```tsx
<hand.Hand layout="fan" sort={compareCards} empty={<EmptyHand />}>
  <hand.Cards>
    {(card, state) => (
      <hand.Card card={card}>
        <CardFace
          card={card}
          eligible={state.distinctlyEligible}
          selected={state.selected}
          invalid={state.invalid}
        />
      </hand.Card>
    )}
  </hand.Cards>

  <hand.Summary>
    <hand.Staging label={`Passing to ${recipientName}`}>
      {(card) => <CardFace card={card} size="sm" />}
    </hand.Staging>
  </hand.Summary>

  <hand.Actions>
    <passForm.Submit>Pass cards</passForm.Submit>
  </hand.Actions>
</hand.Hand>
```

Behavior:

- desktop renders cards, summary, and actions inline;
- mobile registers the complete hand compound with the tray;
- the tray owns summary and action placement;
- card, summary, and action content share one hand draft context;
- at most one `hand.Cards`, `hand.Summary`, and `hand.Actions` slot is allowed;
- missing `hand.Cards` fails in development and type tests where possible.

Keep lower-level primitives available under advanced or runtime exports if
needed. Remove the callback props from the generated author-facing contract
after migration.

## 06C. Add `Game.Viewport` and overlay inset ownership

Authors should not read mobile tray state to guess page padding.

Create one overlay inset registry used by the mobile hand tray and future
docked SDK surfaces. `Game.Viewport` applies it:

```tsx
<Game.Viewport className="bg-table text-primary">
  <Header />
  <Board />
  <PlayerArea />
</Game.Viewport>
```

Required CSS contract:

```css
[data-dreamboard-game-viewport] {
  --dreamboard-bottom-overlay-inset: 0px;
  --dreamboard-safe-area-bottom: env(safe-area-inset-bottom, 0px);
  min-height: 100dvh;
  padding-bottom: calc(
    var(--dreamboard-bottom-overlay-inset) + var(--dreamboard-safe-area-bottom)
  );
}
```

The mobile tray registers its actual occupied height, including current snap
state but excluding the safe-area inset added by `Game.Viewport`.
`Game.Viewport` updates without game-specific hooks or breakpoint logic.

After migration:

- remove normal author documentation for `useMobileHandTrayActive`;
- remove it from the public UI export in Phase 08 unless a non-layout use case
  remains;
- reject hard-coded reference-game padding tied to the mobile hand.

## 06D. Add a composable panel primitive

The current high-level `ActionPanel` is too opinionated for the reference
games, which is why they recreate a small bordered panel locally. Add a
theme-aware compound primitive:

```tsx
<Panel.Root tone="card">
  <Panel.Header>
    <Panel.Title>Trade with bank</Panel.Title>
    <Panel.Description>Choose what you give and receive.</Panel.Description>
  </Panel.Header>
  <Panel.Body>
    <TradeFields />
  </Panel.Body>
  <Panel.Actions>
    <tradeForm.Submit>Confirm trade</tradeForm.Submit>
  </Panel.Actions>
</Panel.Root>
```

`Panel` owns semantic structure, spacing tokens, focus styling, and theme
surfaces. It does not own interaction state.

Rebuild `ActionPanel` as a convenience composition over `Panel`, or delete it
if reference migrations show that the compound primitive covers all intended
uses. Do not keep two unrelated style implementations.

## 06E. Integrate form dialogs

Generated form surfaces should compose interaction lifecycle with the SDK
dialog primitive:

```tsx
<tradeForm.Dialog
  title="Trade with bank"
  description="Choose resources, then confirm the trade."
  trigger={<Button>Open trade</Button>}
>
  <Panel.Root>
    <Panel.Body>
      <TradeInputs form={tradeForm} />
    </Panel.Body>
    <Panel.Actions>
      <tradeForm.Submit>Confirm trade</tradeForm.Submit>
    </Panel.Actions>
  </Panel.Root>
</tradeForm.Dialog>
```

The generated dialog must:

- restore when the interaction becomes pending again;
- close or minimize according to the existing interaction lifecycle;
- wire title and description accessibility IDs;
- trap and restore focus through the SDK dialog primitive;
- keep submit and validation state bound to the generated form;
- fit within mobile safe-area and overlay insets;
- allow a styled content wrapper without requiring authors to wire
  `open`, `setOpen`, and `Interaction.Dialog` manually.

Keep the lower-level `Interaction.Dialog` primitive for advanced composition,
but remove local reference-game lifecycle wrappers.

## 06F. Migrate the required Hearts boundary

The required reference is `hearts`. It uses the shared lower-level
`Game.Root`/`Game.Viewport`/`Panel` boundary and documents why
`UI.defineGameUI` is not applicable to this portable consumer. The other four
reference examples are optional follow-up migration pressure, not Phase 06
acceptance blockers.

For each game:

1. Run the existing Workbench scenarios and retain baseline evidence.
2. Migrate only one API family at a time.
3. Run focused desktop/mobile scenarios.
4. Regenerate the fixture render module only if authored UI changed.
5. Run packed-consumer verification.
6. Record deleted wrappers and author code reduction.

## 06G. Add hard-cut guards

After the required Hearts boundary migrates, add checks that reject:

```text
renderSummary=
renderActions=
useMobileHandTrayActive(
function ActionPanel(
function *Dialog( with Interaction.Dialog and visual Dialog in the same wrapper
<UI.Root> followed by a manually nested <Game.Root> in reference app entry files
```

The guard should parse TypeScript/JSX where practical. Text scanning is
acceptable only for narrow deprecated identifiers.

Do not maintain compatibility adapters in generated code. Remove deprecated
generated signatures and regenerate the fixture modules together.

## Expected files

```text
packages/sdk/src/runtime/workspace-contract/**
packages/sdk/src/runtime/primitives/game.tsx
packages/sdk/src/runtime/primitives/hand-surface.tsx
packages/sdk/src/ui/components/Panel.tsx
packages/sdk/src/ui/components/MobileHandTray.tsx
packages/sdk/src/ui/plugin-styles.css
packages/sdk/src/codegen/**
examples/reference-games/*/src/ui/**
scripts/ui/check-reference-ui-ergonomics.mjs
docs/exec-plans/ui-agent-iteration-workbench/artifacts/phase-06-ergonomics-baseline.md
docs/exec-plans/ui-agent-iteration-workbench/artifacts/phase-06-migration-receipt.md
```

## Verification

```bash
pnpm --filter @dreamboard-games/sdk typecheck
pnpm --filter @dreamboard-games/sdk test
pnpm ui:test:stories
pnpm ui:test --component HandView
pnpm ui:test --capability runtime-submit
pnpm reference-games:test:packed
pnpm ui:ergonomics:check
```

Add compile-time negative tests for:

- omitted phase;
- unknown interaction route;
- missing hand cards slot;
- duplicated hand actions slot;
- dialog used outside its generated form;
- unknown panel tone.

## Acceptance criteria

- Hearts uses the documented lower-level portable reference path; generated
  `UI.defineGameUI` behavior is covered by SDK tests.
- Hearts contains no manual mobile hand padding or tray-state layout
  hook.
- Hearts contains no local action-panel or dialog lifecycle wrapper.
- Hearts passes focused Workbench, fixture, and packed-consumer checks.
- Compound hand summary/action slots remain an SDK authoring contract covered
  by compile/runtime tests; a richer authored reference is follow-up.
- Deprecated authoring APIs are ready for deletion in Phase 08.

## Risks and controls

| Risk                                           | Control                                                           |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| Convenience helper hides generated bindings    | Require explicit surfaces, routes, and exhaustive phases          |
| Compound hand becomes less flexible            | Keep explicit slots and advanced lower-level primitives           |
| Overlay inset causes desktop layout changes    | Register zero inset by default and cover all viewport projects    |
| Panel primitive recreates a full design system | Limit it to semantic structure, tokens, and layout                |
| Migration changes game behavior                | Compare fixture transcripts and projection digests before visuals |

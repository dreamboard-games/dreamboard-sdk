# @dreamboard-games/ui-sdk

Public React gameplay component system for Dreamboard-authored games.

This package is part of the fixed-version `@dreamboard-games/*` SDK release
train. It owns controlled, reusable React presentation components for authored
gameplay UI.

## Responsibility

`@dreamboard-games/ui-sdk` is React-aware and Dreamboard-interaction unaware.

It owns:

- `ThemeProvider`, shipped themes, tokens and theme-aware component recipes
- reusable gameplay presentation such as `CardFace`, buttons, panels, resource
  chips, player/status rows and board-target visuals
- controlled hand presentation, fan/tray layout, safe-area handling and motion
- hover, press, preview, tap-to-inspect and drag-to-target gesture recognition
- the `CardDragSurface` / `CardDropTargetView` controlled drag-to-target
  surface, including lifted-card overlay, settle/snap-back animation, and
  keyboard target traversal
- accessible DOM/state attributes and reduced-motion support
- Storybook stories, UI-intent tests, accessibility checks and visual baselines

It receives controlled state and emits generic UI intent. It does not own:

- plugin runtime or session providers
- interaction descriptors or input domains
- draft/readiness/commit handling
- validation, submission or pending-input routing
- generated workspace binding construction

Those Dreamboard-aware responsibilities move to `@dreamboard-games/ui-runtime` and
are exposed to authors through generated `#dreamboard/ui-contract`.

## Public Package Boundary

| Package                        | Author-visible purpose                                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| `@dreamboard-games/ui-sdk`     | Presentational components, themes, responsive layout and generic UI intent.                  |
| `#dreamboard/ui-contract`      | Generated typed gameplay surfaces and hooks for the concrete game.                           |
| `@dreamboard-games/ui-runtime` | Framework adapter dependency behind generated surfaces; not the normal authored import lane. |
| Product host runtime           | Host session chrome and host-only feedback; not plugin UI.                                   |

The dependency direction is:

```text
@dreamboard-games/ui-sdk <- @dreamboard-games/ui-runtime <- generated #dreamboard/ui-contract
```

## Controlled Components

A public SDK component must be independently renderable without a runtime or
generated contract:

```tsx
import { CardFace, HandView, ThemeProvider } from "@dreamboard-games/ui-sdk";

export function HandPreview() {
  return (
    <ThemeProvider theme="tabletop">
      <HandView
        cards={cards}
        layout={{ desktop: "fan", mobile: "tray" }}
        stateForCard={(card) => visualState[card.id]}
        onCardIntent={(intent) => recordIntent(intent)}
        renderCard={(card, state) => (
          <CardFace card={card} {...state} renderContent={renderCardContent} />
        )}
      />
    </ThemeProvider>
  );
}
```

The intended generic intent contract is:

```ts
type CardIntent<
  CardId extends string = string,
  TargetId extends string = string,
> =
  | { type: "activate"; cardId: CardId; source: "tap" | "keyboard" }
  | { type: "previewStart"; cardId: CardId }
  | { type: "previewEnd"; cardId: CardId }
  | {
      type: "drop";
      cardId: CardId;
      targetId: TargetId;
      source: "pointer" | "keyboard";
    };
```

The SDK recognizes that the user intended to activate or drop a rendered
card on a target. It does not determine what activation or drop means in a
Dreamboard game.

For mobile drag-to-target hands, wrap the hand and any drop targets in a
`CardDragSurface` and switch the hand into drag mode. The surface is the
single canonical owner of `CardIntent` emission — wire `onCardIntent` on the
surface only:

```tsx
<ThemeProvider theme="tabletop">
  <CardDragSurface onCardIntent={recordIntent}>
    <CardDropTargetView
      targetId="selected-cards"
      label="Selected cards"
      state={{ eligible: true }}
      renderTarget={(state) => <SelectionTray over={state.over} />}
    />
    <HandView
      cards={cards}
      mobileInteraction="drag-to-target"
      stateForCard={(card) => visualState[card.id]}
      renderCard={(card, state) => <CardFace card={card} {...state} />}
    />
  </CardDragSurface>
</ThemeProvider>
```

`CardDragSurface` owns the entire drag lifecycle: it registers targets, holds
the lifted-card overlay, animates settle/snap-back, supports keyboard pickup
and arrow traversal, and emits the committed `drop` intent exactly once. It
also forwards `previewStart`/`previewEnd`, `activate`, and `drop` through the
same `onCardIntent` so consumers and the Phase 5 runtime adapter subscribe in
one place. `HandView`'s own `onCardIntent` is only consulted in the legacy
`direct-activate` mode without a surrounding surface.

## Authored Gameplay Composition

Authored games use SDK presentation under generated typed behavior:

```tsx
import { CardFace } from "@dreamboard-games/ui-sdk";
import { UI, Zone } from "#dreamboard/ui-contract";

const surfaces = UI.defineSurfaces({
  hand: Zone.hand("hand", { role: "primary", label: "Your hand" }),
});

export function Game() {
  const { hand } = surfaces();

  return (
    <UI.Root theme="tabletop">
      <hand.Hand layout={{ desktop: "fan", mobile: "tray" }}>
        {(card) => (
          <hand.Card card={card}>
            {(state) => (
              <CardFace
                card={card}
                eligible={state.eligible}
                selected={state.selected}
                disabled={state.disabled}
                renderContent={renderCardContent}
              />
            )}
          </hand.Card>
        )}
      </hand.Hand>
    </UI.Root>
  );
}
```

Generated `hand.Card` delegates to `ui-runtime`, which maps reducer-projected
descriptors to controlled SDK state and interprets SDK `activate` intent
through the canonical collector/submit path.

## Naming Rules

- `CardFace` is the visual card component. Do not add parallel `CardFrame`.
- A controlled `HandView`/`HandFan`/`HandTray` may be public SDK presentation.
- Playable `hand.Hand` and `hand.Card` are generated `ui-contract` surfaces,
  not root SDK components.
- Do not add `@dreamboard-games/ui-sdk/card-game`; the root is the public visual
  gameplay component lane.
- Do not keep runtime provider, descriptor or workspace-contract exports in the
  public root once the hard cut lands.

## Theme And Style

`ThemeProvider` is implemented here and supplies semantic `--db-*` tokens for
component recipes. The recommended default gameplay theme is `tabletop`:
modern, warm and playful through interaction and selective accents rather than
globally wobbly repeated chrome.

Generated `UI.Root theme="tabletop"` may mount the SDK provider for ordinary
gameplay; Storybook renders SDK components directly under `ThemeProvider`.

## Storybook Requirement

Storybook is the canonical workbench for this package; React Cosmos has been
removed. Scripts:

- `pnpm dev` / `pnpm storybook` — interactive Storybook on `:6006`
- `pnpm storybook:build` — static build into `storybook-static/`
- `pnpm storybook:test` — runs interaction + a11y test runner against the
  built (or running) Storybook
- `pnpm storybook:test:visual` — Playwright visual baselines comparing
  stories listed in `.storybook/visual-baselines.ts`. Use
  `storybook:test:visual:update` to refresh approved baselines.

Every public component must have deterministic stories for meaningful variants
and responsive states. Mobile hand components require:

- phone/tablet/desktop layout stories
- fan, compressed fan and tray stories
- long-press preview and tap-to-inspect interaction tests
- horizontal browse versus vertical lift-to-drag tests
- pointer drag/drop, single-emission, ineligible target rejection,
  keyboard pickup/drop and Escape cancellation
- reduced-motion stories that prove the drag overlay still renders without
  travel animation
- accessibility checks and visual baselines

Dreamboard behavior tests do not belong in SDK stories. Descriptor, draft,
commit and submission behavior is tested in `@dreamboard-games/ui-runtime`; generated
contract composition and real mobile gameplay are tested in their respective
layers.

## References

- [UI package boundaries and Storybook testing](../../docs/references/ui-package-boundaries-and-storybook-testing.md)
- [UI scaffolding policy](../../docs/references/ui-scaffolding-policy.md)
- [SDK design principles](../../docs/references/sdk-design-principles.md)
- [Theme and Tailwind recipes](../../docs/references/ui-sdk-theme-and-tailwind-recipes.md)
- [Mobile hand and card interactions](../../docs/references/ui-sdk-mobile-hand-and-card-interactions.md)

# Dreamboard source registry

Pure React building blocks, copied into the game that owns them. There are no SDK imports, gameplay rules, providers, geometry engines, network calls or animation dependencies. Each component takes display data, accepts ordinary DOM props and composes with children. Selection and other behavior belongs to the caller; the keyboard selection story shows a native button wrapping a card.

## Local proof

Use Node 24 and the root pnpm workspace:

```sh
pnpm --dir registry check
pnpm --dir registry smoke
pnpm --dir registry storybook:build
pnpm --dir registry browser:smoke
```

`check` validates the source registry using the installed official shadcn schemas, checks pure imports, typechecks components and stories, and runs `shadcn build`. Built installable items are written to `registry/build/r/`. `smoke` serves that output on an ephemeral loopback port, installs every item with the real shadcn CLI into a disposable independent React project, and typechecks the installed source. It requires npm access and deletes the temporary project afterward.

`storybook` starts the presentation catalog on port 6007. `browser:smoke` serves a previously built Storybook on port 6008, renders every story at 390px and 1280px, checks overflow and runtime errors, and verifies native keyboard selection. It uses installed Chrome locally and Playwright Chromium in CI. Screenshots are retained in ignored `registry/build/screenshots/`.

## Install into a game

Serve `build/r` from the chosen docs host. Configure the consumer's `components.json` namespace to that actual URL:

```json
{
  "registries": {
    "@dreamboard": "https://registry.dreamboard.games/r/{name}.json"
  }
}
```

The hostname is the design's intended deployment target, not a claim that this branch publishes it. Then run:

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/playing-card @dreamboard/pile
```

Sources install below the consumer's `components` alias in `dreamboard/`. Each component imports the copied `tokens.css`; shadcn resolves the `@dreamboard/tokens` dependency and the playing-card's `@dreamboard/card` dependency. The CSS supplies shadcn base tokens, game tokens, seat colors and component styles. Component defaults live in the `components` CSS layer, so Tailwind v4 layered utilities and unlayered application CSS can override them. Grid cell and label styles target only generated elements, leaving overlay children untouched. It works without Tailwind or a theme provider. Edit the copied source and override variables after its import; `.dark` supplies a dark base palette while playing-card faces stay readable.

```tsx
import { PlayingCard } from "@/components/dreamboard/playing-card";
import { Pile } from "@/components/dreamboard/pile";

<Pile label="Discard" count={3}>
  <PlayingCard rank="Q" suit="hearts" />
</Pile>;
```

## Component boundaries

| Item           | Supplied data / composition                                                              |
| -------------- | ---------------------------------------------------------------------------------------- |
| `tokens`       | CSS variables and styles, including six `data-seat` colors                               |
| `card`         | Children and `idle`, `eligible`, `selected`, `invalid` visual state; separate `CardBack` |
| `playing-card` | Rank and suit, composed from `Card`                                                      |
| `pile`         | Count, label and top-card children; explicit empty presentation                          |
| `hex-grid`     | Precomputed polygon points, centers and labels; SVG overlay children                     |
| `square-grid`  | Precomputed cell positions and size; SVG overlay children                                |
| `players`      | Names, seats, status and optional detail                                                 |
| `resources`    | Label, count and optional icon per resource                                              |
| `dice`         | Supplied result values; never rolls or infers randomness                                 |
| `event-log`    | Supplied event summaries/details; no automatic live announcements                        |
| `standings`    | Supplied ordered ranks, names and scores; preserves ties                                 |

Board grids default to labelled static images. A later interactive board wrapper must deliberately own focus, roles and keyboard navigation; these grids do not claim to implement those behaviors. Seat color always supplements labels. Card visual state is exposed through `data-card-state`; when actionable, the owning button exposes `aria-pressed`, disabled state and its accessible name.

## Layer006 integration

This independent foundation adds only the `registry` workspace and its development dependencies. Root `pnpm check` does not yet invoke its gate. At integration, add `pnpm --dir registry check` to the maintained repository check implementation and the browser/storybook proofs to the replacement UI lane. Keep existing UI gates until their callers migrate. Add bound registry items only after the headless instance/React contract lands, migrate both reference UIs, then remove the old styled SDK and workbench. No registry hosting or publishing is performed here.

Registry metadata follows the official [registry.json](https://ui.shadcn.com/docs/registry/registry-json) and [registry-item.json](https://ui.shadcn.com/docs/registry/registry-item-json) specifications. `registry.json` is the single source of item metadata; `shadcn build` emits each `registry-item.json` payload with embedded file content.

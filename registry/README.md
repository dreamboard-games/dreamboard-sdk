# Dreamboard source registry

React building blocks copied into the game that owns them. Pure display items have no SDK imports and accept ordinary DOM props and children. Bound items read the workspace’s `@game` hook and delegate interactions to the headless SDK. Local scenario controls and a browser-test helper support development without adding hosted gameplay authority. Animation remains optional and app-owned.

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

Root `pnpm check` validates registry metadata, typechecks source and builds shadcn payloads. `pnpm ui test` builds the SDK, runs both installation modes, renders pure and real-scenario Storybook stories, and runs both reference games' desktop/touch Playwright suites. `pnpm ui test --game hearts` focuses one actual game. `pnpm ui dev --game hearts` starts its local scenario entry. The former tape compiler and Workbench are removed; tests now drive real reducers through local/scenario sources. Registry hosting remains a separate deployment item.

Registry metadata follows the official [registry.json](https://ui.shadcn.com/docs/registry/registry-json) and [registry-item.json](https://ui.shadcn.com/docs/registry/registry-item-json) specifications. `registry.json` is the single source of item metadata; `shadcn build` emits each `registry-item.json` payload with embedded file content.

## Workspace-bound items

`hand`, `hand-drawer`, `board-targets`, `interaction-form`, `actions` and
`inspector` import the consuming game's `useGame` from `@game`. Map `@game` directly to `ui/game.ts` in TypeScript and Vite, retain `@/*` for other UI imports, and export the hook there. The dedicated binding alias survives shadcn import rewriting without modifying installed source. These items are copied source,
not a styled SDK package. `board-targets` requires the board and pan/zoom features;
install only the items supported by the game's binding. It installs a native
non-passive wheel listener with cleanup, and uses canonical board geometry and
handlers. App slots own terrain, pieces and optional animation.

`InteractionForm` renders only current-step inputs and shows server-saved choices
separately. Its `renderInput` slot lets a game replace board fields with a board
hint. Cancel clears the authoritative server prefix; reset clears local choices.
`Hand` accepts a card renderer, accessible label callback and optional comparator.
`Inspector` displays only selected-seat data. `scenario-controls` belongs only in
the local development entry, with roster and checkpoint/restore callbacks from a
testing source. Hosted entry points never import executable games or scenarios.

After building the SDK and registry, `pnpm --dir registry smoke:bound` installs
all items against a packed SDK in a disposable all-features consumer. The pure
`smoke` remains SDK-free. `install:games` serves an ephemeral registry and invokes
the actual pinned shadcn CLI for each reference game's selected items, then writes
the intended registry URL back to their `components.json`. This proves local
installation, not deployment of the registry hostname.

`browser-game` installs test-only Playwright locators under `test/helpers/`, using the public gameplay DOM attributes without a command tape or executable authority.

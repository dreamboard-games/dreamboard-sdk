> Historical design record. This document includes superseded proposals.
> Use [the supported documentation](index.md) and shipped declarations for current APIs.

# Headless SDK hard cut: design and stacked delivery plan

Status: locked design (2026-09-18), ready for implementation as stacked PRs.
Audience: an implementer, human or agent, picking up **one layer** with no
prior context. Read §1 to §3, then only your layer in §5. Every contract a
layer needs is stated here or is a file path in this repository.

---

## 1. Purpose and principles

Make `@dreamboard-games/sdk` the headless UI framework for board games, in the
mould of TanStack Table v9 (one typed instance, opt-in features, handler and
prop getters, controllable state), Base UI (unstyled accessible parts,
`data-*` state attributes), and shadcn (a registry of owned, styled source
components installed with `npx shadcn add`).

Principles, in priority order:

1. **Simplicity over generality.** Fewer packages, fewer layers, fewer
   concepts. A feature used by one game is not a feature of the SDK.
2. **Hard cut.** No compatibility shims, deprecated aliases, or dual paths.
   When a layer replaces a thing, it deletes the thing.
3. **One vocabulary.** Domain nouns only: game, phase, turn, player,
   interaction, input, step, zone, card, board, space, edge, vertex, event,
   source, feature. Gone from author-facing names: surface, slot, route,
   collect, arm, descriptor, handle, actuator, contract, authoring, prompt,
   effect, continuation, derived, profile, bootstrap.
4. **The server is the authority.** Eligibility, availability, ordering, and
   dedupe are computed by the reducer and the gameplay service. The client
   never recomputes a rule and carries no concurrency metadata.

Already done (do not redo): the first reducer authoring cut in
`docs/authoring-api-spike.md`. `createGame(model)` is the reducer entry point,
mutation callbacks receive `tx`, Hearts and hex-network-trading are on it.

Related plan in the internal repository: `internal/plans/013-one-deno-gameplay-service.md`.
§3.3 states what this repository must publish for it.

---

## 2. Repository facts every implementer must know

- **Toolchain.** `pnpm` 10.4.1, Node ≥ 24. Prettier and ESLint enforced.
  `pnpm check` is the authoritative gate and must pass at the tip of every
  layer without changing tracked files. Narrow loops: `pnpm --filter @dreamboard-games/sdk exec tsc --noEmit`,
  `pnpm --filter @dreamboard-games/sdk exec vitest run src`.
- **Git.** The tree is not a git repository at the time of writing. Before any
  stack work: `git init`, commit the baseline, create the GitHub repository,
  then follow §4. Everything in this document assumes a revert point exists.
- **Export surface is snapshotted.** `packages/sdk/src/export-surface.test.ts`
  records every facade's value exports. A deliberate change runs
  `vitest run -u src/export-surface.test.ts` and names the change in the PR.
- **Type proofs live in `packages/sdk/type-tests/*.ts`**, checked by
  `tsc -p packages/sdk/tsconfig.testing-contract.json`. `*.test.ts` is excluded
  from every tsconfig, so type assertions inside vitest files prove nothing.
- **Legacy still in the tree at the start of Stack 1:** seven reference games
  on the removed API (listed in `LEGACY_REFERENCE_GAMES`,
  `scripts/reference/games.ts`); `packages/sdk/src/reducer/internal.ts`, a
  barrel of removed authoring helpers used only by SDK tests; untyped legacy
  keys (`accept`, `edit`, `fx`, …) spread onto runtime args for those tests.
  Layers 1a and 1e delete them. Do not import from `internal.ts` in new code.
- **Reference games today** live in `examples/reference-games/<id>/`, pin an
  exact npm SDK version, carry their own lockfile, and need `pnpm generate`
  (codegen) for `shared/`. Layer 2c turns them into ordinary workspace
  packages with no generated files.
- **Method naming (TanStack).** Data as properties (`card.id`, `card.view`);
  derived booleans `getIsX()`; capabilities `getCanX()`; DOM handlers
  `getXHandler()`; spreadable attributes `getXProps()`; mutations as verbs
  (`select()`, `submit()`, `cancel()`).

---

## 3. Locked contracts

Implement these exactly. If one proves impossible as written, stop and raise
it in the PR instead of inventing an alternative.

### 3.1 One package, three subpaths, one dependency

| Subpath                         | Contents                                                                                                                                                                                                                                                              | Runtime deps                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `@dreamboard-games/sdk`         | manifest (`defineManifest`, in-memory compiler), reducer authoring (`createGame`, phases, interactions, steps, `tx`, `view`), bundle (`createReducerBundle`), protocol (`SeatFrame`, zod schemas), instance (`createGameInstance`, sources, features, DOM attributes) | `honeycomb-grid`, `@tanstack/store`; `zod` peer |
| `@dreamboard-games/sdk/react`   | `createGameHook`, `GameProvider`, `useGame`, `Subscribe`                                                                                                                                                                                                              | `react` peer                                    |
| `@dreamboard-games/sdk/testing` | scenarios, `scenarioSource`, `localSource`, `createTestSource`, `inspect`, `explore`, `fuzz`, `assertCoverage`, matchers                                                                                                                                              | none                                            |

Deleted packages: `sdk-types`, `plugin-runtime-contract`, `reducer-contract`
(including its 1,649-line generator), `workspace-codegen`, `ui-workbench`.
Deleted subpaths: everything else in today's 25. Deleted dependencies:
`zustand`, all `@radix-ui/*`, `vaul`, `lucide-react`, `@use-gesture/react`,
`clsx`, `esbuild`, `@noble/hashes`. `turbo` is removed; `pnpm -r` scripts run
the workspace. Storybook exists only under `registry/`.

### 3.2 Reducer authoring, final shape

```ts
// app/game-model.ts
export const hearts = createGame({
  manifest,                                  // defineManifest(...) value; compiled in memory (§3.7)
  state: { public, private, hidden },        // zod
  phases: { setup: z.object({}), playing: z.object({ leadSuit: … }) },
  errors: { MUST_FOLLOW_SUIT: "You must follow the lead suit." },
});
export type GameState = typeof hearts.types.State;      // phantom carriers: State, ErrorCode, PlayerId, Queries, Tx

// app/phases/playing.ts
const playing = hearts.phase("playing");
export default playing.define({
  kind: "player" | "auto" | "simultaneous",
  initialState, actor?, actors?, enter?, resolve?,     // enter/resolve/reduce receive { tx, state, q, random, input?, ...ctx }
  interactions: {
    playCard: playing.interaction({
      inputs: { cardId: playing.inputs.card({ from: ["hand"], where }) },     // independent inputs, submitted together
      rules?: [{ id, errorCode, validate }],
      reduce({ tx, input, q }) { … return tx.transition("scoreHand"); },
    }),
    moveBandits: playing.interaction({
      steps: [                                                                // sequential inputs, one dispatch each (§3.2.1)
        { hexId: playing.inputs.board.space({ boardId: "frontier", where: differentHex }) },
        { targetPlayerId: playing.inputs.form.choice({ choices: ({ state, q }) => victims(state.pending.hexId, q) }) },
      ],
      reduce({ tx, input }) { /* input.params has every step */ },
    }),
  },
});

// app/game.ts
export default hearts.assemble({
  initial: { public, private, hidden },
  initialPhase: "setup",
  phases: { setup, passing, playing, scoreHand, gameOver },      // missing or extra key: type error
  view: ({ state, playerId, q }) => ({ … }),                     // one function, called per seat
});
```

Kept: three phase kinds; `tx` with `transition`, `endGame`, `reject`, `emit`,
`shuffle(zone)`, `roll(die)`, `deal(...)` and the table mutations; `rules`;
`inputs.card / board.* / form.* / rng.*`; `many()`; `where` predicates typed
against `model.errors`; `random` (seeded); `memoize(fn)` (WeakMap on first
argument; replaces `defineDerived`).

Deleted: effects and continuations (`defineEffect`, `fx`, `tx.effect`,
`schedule`, the instruction engine), `stepPhase`, `stages`, `cardActions`,
`cost`, `zones:` on phases, prompts as a kind (an interaction with `actor`
returning another seat is the prompt; `to`, `visibility`, `context`, `options`
go), setup profiles and the bootstrap DSL (a `setup` auto phase does it; lobby
options arrive as `initial({ options })`), `shared` and `staticView`
(`view` per seat; board static is manifest-derived), `guidance`,
`defineDerived`, `PerPlayer<T>` (plain `Record<PlayerId, T>`), `dependsOn`,
`defineInputs`, eager and lazy dependency modes, `ops`/`pipe`/immutable table
twins, `errorCodes:` on interactions.

#### 3.2.1 Steps

A dependent input is a **step**: a real dispatch. The engine validates step
_n_, stores `{ interactionKey, step: n, values }` as the acting seat's pending
selection in engine state, and re-projects. The frame then carries the
interaction at step _n+1_ with exactly one resolved domain, computed from
committed state plus stored values (`state.pending` in `choices`/`where`).
The last step runs `reduce` with all params. `interaction.cancel` is an
engine command that clears the pending selection. Consequences accepted:
steps are commits and appear in history; a seat mid-step blocks its own next
action until it finishes or cancels; there is no atomic multi-input submit.
Independent inputs (`inputs: {…}`) are unchanged and always fully resolved.

### 3.3 Bundle, protocol, and plan 013

`createReducerBundle(game)` implements plan 013's five-member contract in one
file: `reducerContractVersion`, `boardStatic()`, `initialize()`, `dispatch()`,
`project()`. Input is zod-parsed at the boundary; `dispatch` returns
`{ kind: "accept", state, terminal?, description, logs }` or
`{ kind: "reject", errorCode, message? }`. No trusted/ingress split, no
fingerprints, no definition index, no client-param schemas, no diagnostics
sink.

`SeatFrame<Game>` is defined **once**, here, and is what `project()` returns
per seat, what the Deno service stores and sends, and what the instance
consumes: `{ view, flow: { currentPhase, activePlayers, simultaneous }, interactions: InteractionDescriptor[], pending?: PendingStep, zones, events }`.
No `basis`. The wire protocol (`auth.connect`, `session.snapshot`,
`session.update`, `session.resume`, `interaction.submit { clientActionId, interactionId, params }`,
`interaction.cancel`, `interaction.result`, `history.restore`) is handwritten
zod in the root subpath; `internal` imports it and deletes its own protocol
package. `interaction.submit` carries **no** `basis`: plan 013's queue,
guarded write, and `UNIQUE (session_id, client_action_id)` own ordering and
dedupe, and the reducer re-validates every rule. This is a requested change to
plan 013's protocol section and belongs in its prerequisite SDK PR.

### 3.4 `FrameSource`

```ts
export interface FrameSource<Game> {
  subscribe(onChange: () => void): () => void; // notify-only; never fires synchronously inside subscribe
  getSnapshot(): Snapshot<Game> | null; // same reference until a change; null = not ready
  submit(interactionId: string, params: RuntimeJson): Promise<SubmitResult>;
  cancel(interactionId: string): Promise<SubmitResult>; // clears a pending step
}
export interface Snapshot<Game> {
  me: PlayerId;
  players: readonly Player[];
  frame: SeatFrame<Game>;
  version: number;
  boardStatic: BoardStatic | null;
}
export type SubmitResult =
  | { accepted: true }
  | { accepted: false; errorCode: string; message?: string };
```

`submit` resolves on acknowledgement and does not carry the next frame;
transport failure rejects, rule rejection resolves. `clientActionId`
generation and reconnect retry live inside `hostSource`. Providers:
`hostSource({ url, credentials })` (WebSocket; default), `iframeSource()`
(postMessage relay for an embedded plugin), `staticSource(snapshot)`, and in
`/testing`: `createTestSource(snapshot)` (adds `emit(next)`, `submissions`),
`scenarioSource(game, scenario, { at, as })`, `localSource(game, { players, seed, as? })`
(both add `switchSeat(playerId)`). No tapes.

### 3.5 The instance

```ts
createGameInstance(game, { source, features, initialState?, state?, onDraftsChange?, onPendingChange?, coverage?, debug? })
game.store / game.atoms / game.subscribe(selector, listener)
game.snapshot  game.view  game.version
game.phase.current .is(name) .switch(routes)                  // exhaustive over PhaseNameOf<Game>
game.turn.isMine .activePlayerIds .currentPlayerId .order
game.me.id .player .getCanAct()
game.players.get(id) .getAll() .next(id) .order
game.interactions.get(key) .list() .listAvailable()
  interaction.key .phase .id .label .help .kind ("inputs" | "steps")
  interaction.getIsAvailable() .getUnavailableReason() .getAvailability()
  interaction.getInput(key) .getInputs() .getStep() .getStepIndex()          // steps: only the current step's input
  interaction.getIsReady() .getMissingInputs() .getStatus()                  // "open" | "submitting" | "submitted"
  interaction.submit() .cancel() .getSubmitHandler() .getSubmitProps() .reset()
    input.key .kind .getDomain() .getValue() .setValue(v) .clear() .getIsReady()
    input.getEligibleTargets() .getIsEligible(t) .getIsSelected(t) .getTargetProps(t) .getSelectHandler(t)
    input.getFieldProps()
game.zones.get(zoneId) .getCards({ sort? }) .getCard(id) .count .getIsEmpty()
  card.id .zone .index .view .hidden
  card.getIsEligible() .getIsSelected() .getCanSelect() .getInteractions()
  card.select({ interaction? }) .getSelectHandler({ interaction? }) .getProps({ interaction? })
game.boards.get(boardId).getLayout({ hexSize, origin? })                     // boardFeature, §3.8
game.events.recent
game.inspect()  game.explore()  game.apply(command)                          // §3.12; apply is in-process sources only
```

Client-owned UI state: `drafts` (independent inputs of one interaction),
`pending: InteractionKey | null`, `submitting`. Objects are recreated per
snapshot, methods live on prototypes (do not destructure), every object has a
`game` back-reference. Routing a card or target to an interaction reuses
`runtime/utils/interaction-router.ts`; ambiguity throws `AmbiguousTargetError`
unless `{ interaction }` is passed. `getProps()` emits the §3.11 attributes.

### 3.6 Features

`gameFeatures({ handFeature, boardFeature, dragFeature })`; a `GameFeature`
has `getInitialState`, `getDefaultOptions`, and `construct{Game,Interaction,Input,Zone,Card,Board}APIs`;
types register through declaration merging on `GameState_FeatureMap`,
`GameOptions_FeatureMap`, and per-object `*_FeatureMap` interfaces (TanStack
v9 style). The core mounts nothing unconditionally.

### 3.7 Manifest and boards

`defineManifest({ players, cards, zones, boards, pieces, dice, resources, options })`
is compiled in memory by `createGame`; nothing is generated to disk. Hex
boards: `{ id, layout: "hex", scope, orientation: "pointy" | "flat", shape: hexagon({ radius }) | rectangle({ width, height }) | ring | spiral | fromCoordinates([...]), exclude?, spaces?: Record<"q,r", { id?, type?, ...data }>, edges?, vertices? }`
plus `spaceTypes`. honeycomb-grid builds one `Grid` per board. Ids: space =
override or axial key (literal types); edge = `${board}:edge:${a}|${b}` or
`${board}:edge:${space}:${dir}`; vertex = `${board}:vertex:${sorted spaces}+…`;
edge and vertex ids are branded templates produced only by queries:
`q.board(id).edge(a,b) .vertex(...) .neighbors(s) .distance(a,b) .ring(s,n) .line(a,b) .edgesOf(v) .verticesOf(e) .spacesAt(v) .spacesAlong(e) .space(id).type`.
`boardStatic()` is derived from the manifest with no author code.
`board.getLayout({ hexSize })` returns `{ viewBox, getSpaces(), getEdges(), getVertices(), pointToSpace(x,y) }`,
each element with `id`, `center`, `points()`/`line`, `transform`,
`getIsSelectable()`, `getIsSelected()`, `getTargetProps()`, `getSelectHandler()`.
Delete `boardTemplates` and the type-level hex arithmetic in `sdk-types`.

### 3.8 Registry

shadcn-compatible `registry/` in this repository, built with `shadcn build`,
served from the docs host, installed with `npx shadcn add @dreamboard/<item>`.
Items are owned source; **pure** items take data and visual state and import
nothing from the SDK; **bound** items import `useGame` from the workspace's
`ui/game.ts`. Accessibility comes from shadcn's Base UI parts via
`registryDependencies`; the SDK ships no primitive components. Admission test:
a building block many games compose differently, never a screen. **No blocks.**

| Item                      | Kind                    | Item                     | Kind  |
| ------------------------- | ----------------------- | ------------------------ | ----- |
| `tokens`                  | css                     | `board-targets`          | bound |
| `card`                    | pure                    | `interaction-form`       | bound |
| `playing-card`            | pure                    | `actions`                | bound |
| `hand`                    | bound                   | `players`                | pure  |
| `pile`                    | pure                    | `resources`              | pure  |
| `hand-drawer`             | bound                   | `dice`                   | pure  |
| `hex-grid`, `square-grid` | pure                    | `event-log`, `standings` | pure  |
| `inspector`               | bound, dev-only (§3.12) |                          |       |

### 3.9 Tokens

shadcn's base tokens plus `--table`, `--table-foreground`, `--card-w`,
`--card-aspect`, `--card-radius`, `--card-face`, `--card-back`, `--card-lift`,
`--eligible`, `--selected`, `--invalid`, `--seat-1` … `--seat-6`. No theme
provider or theme API. Seat color styles from `data-seat`.

### 3.10 Motion

No animation library in the SDK. `card.getProps()` emits
`style={{ viewTransitionName: card.id }}`; `useGame` applies snapshots inside
`startTransition` so React `<ViewTransition>` animates zone changes; durations
and staggers are CSS on `::view-transition-group(card-*)`. Drag is pointer
events and CSS transforms inside `dragFeature`. A registry `hand` variant may
depend on `motion` in its own file.

### 3.11 DOM attributes (replaces `browser-interaction`)

`getProps()` and `getTargetProps()` emit: `data-interaction`, `data-input`,
`data-value`, `data-action` (`select | submit | cancel | option`), and state
`data-eligible`, `data-selected`, `data-disabled`, `data-ready`, `data-hidden`,
`data-seat`. That is the whole protocol. `/testing` ships a Playwright helper:
`game(page).interaction(key).value(v).click()`, `.submit()`, `.expectReady()`.
No digests, effects encoding, preparation patterns, registry, or diagnostics.
Agents drive `localSource` through the instance, not the DOM.

### 3.12 Testing model

The reducer scenario (`createScenarioAuthoring(game)` → `defineScenario`) is
the single authority. Everything else is a view of it through `scenarioSource`.

| Capability                           | Shape                                                                                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| UI scenario                          | `defineUIScenario({ scenario: completeGame, at: "mid-hand", as: "player-2", steps })`; typed checkpoint and seat  |
| Headless UI test                     | instance on `scenarioSource`; assert getters; no DOM                                                              |
| Browser test                         | Playwright opens the game's `ui/dev.tsx?scenario=&at=&as=`; §3.11 helper; keyboard, touch, layout, Axe only       |
| `inspect()`                          | plain-data summary: phase, turn, me, interactions with availability, reason, per-input eligible targets or counts |
| `explore()`                          | legal commands from the collector solver, typed `ScenarioCommand[]`, with an evaluation budget                    |
| `apply(command)`                     | step an in-process source forward; the inspect → explore → apply loop in a test or `tsx` REPL                     |
| `fuzz(game, { seed, steps })`        | random `explore` pick per step on `localSource`; reports the first throw with a replayable command list           |
| `assertCoverage(instance, scenario)` | fails if an interaction was ever available and never read                                                         |
| `switchSeat` privacy                 | another seat's view never contains this seat's private state                                                      |
| `inspector` registry item            | the same data as `inspect()` rendered inside `dev.tsx` on `localSource`, with "copy as scenario command"          |
| Matchers                             | `toBeInPhase`, `toHaveAvailable`, `toHaveEligible`                                                                |

Deleted: tapes, fixtures, protocol tape compilation, digests, `explore`/`inspect`
CLI, the workbench, source-regex UI tests.

### 3.13 Coverage

`coverage: { "passing.submit": PassPanel, "playing.playCard": Hand } satisfies Coverage<typeof hearts>`
(mapped type over every interaction key; values are component references).
Dev runtime warns once per interaction that was available in a frame but never
read via `interactions.get`. `assertCoverage` is the test form.

---

## 4. Stacks, layers, and order

Five stacks, fourteen layers. Stacks 1 and 2 may proceed in parallel; merge
order 1 → 2 → 3 → 4 → 5. Every layer passes `pnpm check` alone.

```
(main) <- reducer/delete-legacy <- reducer/one-table <- reducer/prune <- reducer/steps <- reducer/bundle-and-protocol
(main) <- manifest/compiler <- manifest/hex <- manifest/remove-codegen
(main) <- client/instance <- client/react <- client/games-and-tests
(main) <- registry/scaffold <- registry/items-and-cutover
(main) <- docs/site
```

```bash
gh extension install github/gh-stack
git config rerere.enabled true && git config remote.pushDefault origin
gh stack init reducer/delete-legacy        # commit this layer only
gh stack add reducer/one-table             # next layer, from the current one
gh stack submit --auto                     # draft PRs
gh stack view --json
```

Never run bare `gh stack view`, `submit`, `add`, or `checkout`. Commit to the
layer that owns a change (`gh stack checkout <layer>`, commit,
`gh stack rebase --upstack`, `gh stack top`). Set PR titles with `gh pr edit`
to the layer's goal sentence.

---

## 5. Layer briefs

Format: **Goal** · **Read first** · **Do** · **Gate** · **Owned elsewhere**
(work a later layer does; a fence, not a suggestion). Deferred ideas are in §8.

### Stack 1: `reducer/*`

#### 1a `reducer/delete-legacy`

**Goal.** Remove the seven legacy games and everything that only they used, so
later reducer cuts never have to keep them compiling.

**Read first.** `scripts/reference/games.ts` (`LEGACY_REFERENCE_GAMES`),
`scripts/ui/{config,support}.ts`, `docs/reference/canonical-examples.md`,
`packages/sdk/src/reference-games/**`, `AGENTS.md`.

**Do.** Delete `examples/reference-games/{automa-river-rival,deck-building-market,multiplayer-ranking-and-ties,roll-and-write-scorecard,simultaneous-card-drafting,solo-countdown-puzzle,worker-placement-tableau}`.
Delete `LEGACY_REFERENCE_GAMES` and its filters. Update every document that
lists nine games. Do not touch SDK source in this layer.

**Gate.** `pnpm check`; `pnpm reference` (all remaining games) passes.

**Owned elsewhere.** `internal.ts` and unbound helpers (1e).

#### 1b `reducer/one-table`

**Goal.** One table mutation implementation behind `tx`, plain records for
per-player data, and `memoize` in place of `defineDerived`.

**Read first.** `packages/sdk/src/reducer/{ops.ts,compose.ts,transaction.ts,per-player.ts,derived.ts}`,
`packages/sdk/src/reducer/table/*.ts` (note the `*InPlace` twins),
`examples/reference-games/hex-network-trading/app/reducer-support.ts`
(`occupancyCache`, the memoization pattern to standardize).

**Do.** Delete `ops.ts`, `compose.ts`, the immutable mutation twins in
`reducer/table/*`, `derived.ts`, `per-player.ts`. `tx` clones the table once
and calls the in-place functions. Replace `PerPlayer<T>` in table types and
zod schemas with `Record<PlayerId, T>`. Add `memoize<A extends object, R>(fn): (a: A) => R`
(WeakMap on the first argument) to the root facade; use it in hex's
`reducer-support.ts`. Update `type-tests/`.

**Gate.** `pnpm check`; both games pass; `grep -rn "InPlace\|PerPlayer\|defineDerived" packages/sdk/src` empty.

**Owned elsewhere.** Effects, instructions (1c).

#### 1c `reducer/prune`

**Goal.** Delete every reducer feature no remaining game needs and merge
prompts into interactions.

**Read first.** `packages/sdk/src/reducer/{effects.ts,setup-bootstrap.ts,setup-bootstrap-helpers.ts}`,
`reducer/model/spec/{effects,phases,interactions,views}.ts`,
`reducer/core/runtime-instruction.ts`, `reducer/engine/**`,
`reducer/bundle/trusted/{instruction-runner,lifecycle-runner,stage-resolver,interaction-decision}.ts`,
`reducer/authoring/{phase,contract-authoring}.ts` (`stepPhase`, `cardAction`),
`examples/reference-games/hearts/app/setup-profiles.ts`,
`examples/reference-games/hex-network-trading/app/phases/pending-trade.ts`
(the prompt to convert), `docs/authoring-api-spike.md`.

**Do.** Delete effects and continuations, the runtime instruction engine
(`tx.transition` sets the phase directly; the lifecycle runner calls `enter`),
`stepPhase`, `stages`, `cardActions`, `cost`, `zones:` on phases, `guidance`,
prompt kind (`to`, `visibility`, `context`, `options`; hex's trade
accept/reject becomes interactions with `actor: () => targetPlayerId` and a
choice input), setup profiles and bootstrap (Hearts' shuffle moves into its
`setup` phase as `tx.shuffle("draw-pile")`; lobby options become
`initial({ options })`), `shared` and `staticView` (one `view` per seat;
board static derives from the manifest). Add `tx.shuffle`, `tx.roll`, `tx.deal`
as plain seeded ops. Delete the corresponding tests (`runtime-effects`,
`setup-profile-runtime`, `prompt-addressee-availability`, stage tests).

**Gate.** `pnpm check`; both games pass; `type-tests/` updated; the facade
snapshot shrinks and the PR lists every removed name.

**Owned elsewhere.** Steps (1d), bundle (1e).

#### 1d `reducer/steps`

**Goal.** Replace dependent inputs with sequential steps as real dispatches.

**Read first.** §3.2.1; `reducer/model/spec/inputs.ts` (eager and lazy
dependency shapes), `reducer/inputs/defineInputs.ts`, `reducer/inputs/many.ts`,
`reducer/bundle/trusted/{collector-domains,collector-input-solver,interaction-decision}.ts`,
`runtime/utils/interaction-router.ts` (the client cascade to delete later),
`examples/reference-games/hex-network-trading/app/phases/{move-bandits,main}.ts`.

**Do.** Add `steps: [{ key: collector }, …]` to `interaction`; engine stores the
pending selection per seat in engine state and exposes `state.pending` to
`choices`/`where` of later steps; add the `interaction.cancel` engine command;
`project()` emits the current step's resolved domain only. Delete `dependsOn`,
`defineInputs`, eager `dependentCases`, lazy projection and its resolver.
Convert hex: `moveBandits` to two steps; `tradeWithSupplyDepot` keeps
independent inputs (its `different-resources` rule already rejects equal
values). The collector solver enumerates steps by walking them.

**Gate.** `pnpm check`; hex scenarios pass with steps (scenario commands gain
a `step` form); `type-tests/steps.ts` proves `input.params` has every step
key in `reduce` and only the current step is exposed on the frame.

**Owned elsewhere.** Client-side step UI (3a).

#### 1e `reducer/bundle-and-protocol`

**Goal.** One bundle file on plan 013's contract, protocol and `SeatFrame`
defined once in the SDK, the three type packages merged in, and the SDK's own
tests migrated off legacy helpers.

**Read first.** §3.3; `internal/plans/013-one-deno-gameplay-service.md`
("Bundle contract", "Wire protocol", "Prerequisite PR");
`packages/sdk/src/reducer/bundle/**`, `packages/reducer-contract/**`,
`packages/plugin-runtime-contract/src/**`, `packages/sdk-types/src/**`,
`reducer/{contract-fingerprint,stale-contract-artifact-error,definition-index,client-param-schemas,diagnostics}.ts`,
`reducer/ingress/**`, `reducer/internal.ts` and every test importing it,
`bundle/trusted/trusted-runtime-args.ts` (legacy keys).

**Do.** Write `reducer/bundle.ts` implementing the five members; handwritten
zod for `SeatFrame` and the wire messages in `protocol/`; move `sdk-types`
and `plugin-runtime-contract` sources into the package and delete the three
packages and the `reducer-contract` generator; delete fingerprints, definition
index, client-param schemas, diagnostics sink, the ingress layer. Migrate every
SDK test off `internal.ts` to `createGame` + `tx`, then delete `internal.ts`,
the unbound `define*` helpers, free input builders, and the legacy keys on
runtime args. Bump `REDUCER_CONTRACT_VERSION` to `0.5.0`. Publish the alpha
plan 013 waits for.

**Gate.** `pnpm check`; export snapshot shows the root facade only;
`grep -rln "generation\|basis" packages/sdk/src` empty; both games pass;
`npm view @dreamboard-games/sdk@<alpha>` resolves.

**Owned elsewhere.** Instance and sources (3a), in-memory manifest (2a).

### Stack 2: `manifest/*`

#### 2a `manifest/compiler`

**Goal.** `createGame` accepts the `defineManifest` value and compiles it in
memory; no generated types or runtime.

**Read first.** `packages/workspace-codegen/src/{manifest-contract,manifest-static,manifest-validation}.ts`,
`examples/reference-games/hearts/shared/manifest-runtime.ts` (target value
shape), `reducer/authoring/contract.ts`, `reducer/model/manifest.ts`.

**Do.** `compileManifest(manifest)` returns the value the generated file
exported (`literals`, `ids`, `schemas`, `tableSchema`, `defaults`,
`staticBoards`, `records`, `createGameStateSchema`) typed from
`typeof manifest`; validation from `manifest-validation.ts` runs inside it.
`createGame({ manifest })` calls it. Benchmark `tsc --extendedDiagnostics` for
both games against the generated baseline; record in `docs/benchmarks/manifest-types.md`.

**Gate.** `pnpm check`; games still pass with generated files present;
check time ≤ 1.5× and instantiations ≤ 2× baseline, else stop and report.

**Owned elsewhere.** honeycomb (2b), deleting codegen (2c).

#### 2b `manifest/hex`

**Goal.** honeycomb-grid geometry, shape-based hex manifest, derived edge and
vertex ids, adjacency queries.

**Read first.** §3.7; honeycomb docs (`https://abbekeultjes.nl/honeycomb/`);
`packages/sdk-types` hex id types (now inside `packages/sdk` after 1e);
`reducer/table-queries.ts`; hex's `manifest/board.ts`, `app/model.ts`,
`app/eligibility.ts`.

**Do.** Add `honeycomb-grid` (exact pin). Implement the board schema, grid
build, id derivation, `q.board(id)` helpers, `boardStatic()` from the manifest,
and `board.getLayout`. Convert hex: `hexagon({ radius: 1 })` + overrides,
delete `model.ts` adjacency tables, predicates use `q.board(...)`, scenario
tests use `frontier.edge(a, b)`. Delete the type-level hex arithmetic and
`hex-geometry.ts`.

**Gate.** `pnpm check`; hex passes; `type-tests/hex-board.ts`.

**Owned elsewhere.** `hex-grid` registry item (4b).

#### 2c `manifest/remove-codegen`

**Goal.** No generated files, no CLI, examples as workspace packages, scripts
reduced to what remains.

**Read first.** `packages/workspace-codegen/src/ownership.ts`, `scripts/**`,
games' `package.json`, `tsconfig*.json`, `pnpm-workspace.yaml`, `turbo.json`,
`AGENTS.md`, `packages/sdk/README.md`.

**Do.** Delete `packages/workspace-codegen`, `src/authoring*`, `src/codegen.ts`,
the `dreamboard-sdk-generate` bin, games' `shared/`, framework tsconfigs,
generated `app/index.ts`, `generate` scripts, `#dreamboard/*` aliases.
Games depend on `"@dreamboard-games/sdk": "workspace:*"`, one root lockfile;
delete per-game lockfiles, `reference-game.json`, `packages/sdk/src/reference-games`,
`scripts/reference/{pin,verify,games}.ts`. `pnpm check` becomes root
`package.json` scripts over `pnpm -r`; delete `turbo`, `scripts/cli.ts`,
`scripts/ui-fixtures/**`, `scripts/ui/**`. Keep one tarball smoke in
`release:verify` against Hearts. Add `templates/game/` (the new-workspace seed)
with a test that typechecks it.

**Gate.** `pnpm check` with zero generated files; both games and the template
typecheck and test.

**Owned elsewhere.** Registry (Stack 4), docs (Stack 5).

### Stack 3: `client/*`

#### 3a `client/instance`

**Goal.** `createGameInstance`, `FrameSource` with all providers, built-in
features, `inspect`/`explore`/`apply`, and the §3.11 attributes.

**Read first.** §3.4, §3.5, §3.6, §3.11, §3.12; `runtime/utils/{interaction-router,interaction-inputs,interaction-status,browser-interaction-effects}.ts`,
`runtime/context/InteractionDraftContext.tsx`, `runtime/hooks/**`,
`runtime/core/**`, `runtime/browser/post-message-transport.ts`,
`testing/{definitions,scenario-replay}.ts`, `testing/exploration/**`,
`testing/inspection/**`, `reducer/bundle.ts` (1e), collector solver.

**Do.** Framework-free `src/instance/**` and `src/source/**` in the root
facade; `@tanstack/store` for state; features registry; `hostSource`,
`iframeSource`, `staticSource`; in `/testing`: `createTestSource`,
`scenarioSource`, `localSource` (in-process bundle), `inspect`, `explore`,
`apply`, `fuzz`, `assertCoverage`, matchers, Playwright helper. Delete
`testing/exploration`, `testing/inspection`, `testing/ui-fixture`,
`browser-interaction/**` (keep a 60-line `attributes.ts`). `type-tests/game-instance.ts`.

**Gate.** `pnpm check`; Hearts' complete-game scenario driven headlessly
through the instance on `scenarioSource`; `fuzz(hearts, { seed: 1, steps: 200 })`
completes; `explore()` at a checkpoint equals the solver's enumeration.

**Owned elsewhere.** React (3b), deleting `runtime/**` and `ui/**` (4b).

#### 3b `client/react`

**Goal.** `createGameHook`, `GameProvider`, `useGame`, `Subscribe`, coverage
warning, `startTransition` frame application.

**Read first.** 3a; TanStack v9 `createTableHook` and `table.Subscribe`
semantics; `runtime/hooks/useRuntimeSnapshotSelector.ts`.

**Do.** `src/react/**` and the `/react` subpath; selector re-rendering via
`useSyncExternalStore`; `type-tests/react-adapter.ts`.

**Gate.** `pnpm check`; selector re-render count tests; controlled `drafts`
round trip; coverage warning fires once.

**Owned elsewhere.** Game UIs (3c).

#### 3c `client/games-and-tests`

**Goal.** Both games' UIs on `useGame` with plain elements; the whole browser
test pipeline replaced by `dev.tsx` + Playwright; the workbench deleted.

**Read first.** `examples/reference-games/{hearts,hex-network-trading}/ui/**`
and `test/**`, `packages/ui-workbench/**`, `testing/ui-scenario/**`.

**Do.** Per game: `ui/game.ts` (`createGameHook` with `coverage`), `ui/app.tsx`,
plain-element components, `ui/dev.tsx` (`localSource`, reads `?scenario=&at=&as=`),
headless `test/ui/*.test.ts`, Playwright specs using the §3.11 helper for
keyboard, touch, and Axe. Convert UI scenarios to `defineUIScenario`. Delete
`ui-workbench`, `runtime/workspace-contract`, `runtime/primitives`,
`runtime/components`, `runtime.ts`, `Interaction.Routes`, the
`DreamboardUIRegister` augmentation, source-regex tests.

**Gate.** `pnpm check`; `pnpm -r test`; Playwright specs pass for both games.

**Owned elsewhere.** Registry components (4b).

### Stack 4: `registry/*`

#### 4a `registry/scaffold`

**Goal.** The shadcn registry with `tokens` and every **pure** item, built and
validated in `pnpm check`, with a Storybook under `registry/`.

**Read first.** shadcn registry docs (`registry.json`, `registry-item.json`,
`shadcn build`/`validate`, namespaced registries); §3.8, §3.9;
`ui/components/{Card,HandView,ResourceCounter,DiceRoller,StandingsTable}.tsx`
and `ui/components/board/{HexGrid,SquareGrid}.tsx` for visuals to port.

**Do.** `registry/registry.json`, items `tokens`, `card`, `playing-card`,
`pile`, `hex-grid`, `square-grid`, `players`, `resources`, `dice`,
`event-log`, `standings` with `registry-item.json` each; `scripts/registry/{build,validate}.ts`
wired into `pnpm check`; `components.json` in games with a local
`@dreamboard` namespace; one story per item.

**Gate.** `pnpm check` builds and validates; `npx shadcn add @dreamboard/card`
installs into Hearts and typechecks.

**Owned elsewhere.** Bound items and deleting `ui/` (4b).

#### 4b `registry/items-and-cutover`

**Goal.** Bound items, both games on the registry, and the styled kit deleted.

**Read first.** 4a; §3.5; `runtime/components/interaction-form/fields.tsx`
(default widgets → `interaction-form`), `runtime/primitives/prompt.tsx`.

**Do.** Items `hand` (shadcn `toggle-group`), `hand-drawer` (`drawer`),
`board-targets` (`toggle` over `getLayout`), `interaction-form`, `actions`,
`inspector` (dev-only). Install into both games; hex board on `hex-grid` +
`board-targets`; Hearts hand on `hand` + `card` + `playing-card`. Delete
`src/ui/**`, `src/runtime/**` remnants, theme system, `plugin-styles.css`,
UI dependencies; export snapshot final.

**Gate.** `pnpm check`; both games and their Playwright specs pass;
`packages/sdk/package.json` dependencies are exactly §3.1.

**Owned elsewhere.** Docs (Stack 5).

### Stack 5: `docs/*`

#### 5a `docs/site`

**Goal.** Documentation in the structure below, one story per scenario
checkpoint, README reduced to a pointer, `templates/game` documented.

```
docs/getting-started/{overview,installation,quick-start,concepts}.md
docs/reducer/{model,manifest-and-boards,phases,interactions-and-steps,view,testing}.md
docs/ui/{game-instance,phases-and-turns,interactions-and-inputs,hands-and-zones,boards,ui-state,sources,coverage,styling,custom-features,testing}.md
docs/api/{createGame,phase,tx,inputs,createReducerBundle,protocol,createGameHook,useGame,GameProvider,Game,Phase,Turn,Player,Interaction,Input,Zone,Card,Board,sources,features}.md
docs/registry/<item>.md
docs/examples/{hearts,hex-network-trading}.md
```

Guides open with the smallest complete example and link to API pages; API
pages list data, then getters, then handlers.

**Gate.** `pnpm check` (a scripts test asserts every `docs/api/*.md` name is
exported); `storiesFromScenario` stories build.

---

## 6. Cross-cutting rules

1. Green at the tip: `pnpm check` on each layer alone.
2. Delete, don't deprecate.
3. Snapshot changes are named in the PR.
4. Public type changes get a `type-tests/` file with `Expect<Equal<…>>` and
   `@ts-expect-error` negatives.
5. No new vocabulary beyond §1.
6. PR description: Goal · Changed · Deleted · Contracts touched (§3 refs) ·
   Gate output · Deferred to a named layer.

---

## 7. Decisions owned by the user (defaults apply if unanswered)

| Decision                                           | Layer   | Default                                                    |
| -------------------------------------------------- | ------- | ---------------------------------------------------------- |
| Type-performance budget for the in-memory manifest | 2a      | ≤ 1.5× check time, ≤ 2× instantiations                     |
| Registry hostname                                  | 4a      | `registry.dreamboard.games`                                |
| Template distribution                              | 2c / 5a | `templates/game` copied by hand; `npm create` later        |
| Plan 013 protocol drops `basis`                    | 1e      | yes; raise in the internal repo before either stack starts |

---

## 8. Deferred opportunities (no layer owns these)

| Opportunity                               | Shape when scheduled                                                                         |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| Undo and preview                          | `previewFeature` + a dry-run message in the protocol                                         |
| Spectator and replay UI                   | `replaySource(history)` with a timeline over `scenarioSource`'s rewind                       |
| Other framework adapters                  | `/vue`, `/solid` mirroring `/react` over the framework-free instance                         |
| Localization                              | message catalog keyed by interaction key and error code                                      |
| `dragFeature`, `panZoomFeature` contracts | pointer capture, drop targets from `getEligibleTargets()`, viewport transform on `getLayout` |
| Registry blocks                           | only if users ask; the reference games serve this role                                       |
| Agent play                                | MCP server over `localSource` exposing `listAvailable()`, `explore()`, `submit()`            |
| `npm create dreamboard-game`              | initializer copying `templates/game`                                                         |

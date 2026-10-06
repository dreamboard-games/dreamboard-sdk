# @dreamboard-games/sdk

[Guides and API reference](../../docs/index.md) · [Registry](../../registry/README.md) · [Examples](../../examples/reference-games/README.md)

The public TypeScript SDK for authoring, testing, and rendering Dreamboard
games. Install this package rather than any of the repository's unpublished
workspace inputs.

```sh
pnpm add @dreamboard-games/sdk
```

The package declarations and export map are the API authority. There are four entry points:

- `@dreamboard-games/sdk`: framework-free instances, sources, features and canonical host protocol schemas.
- `@dreamboard-games/sdk/react`: typed React provider, selectors, subscriptions, and card gesture and drop-area hooks.
- `@dreamboard-games/sdk/reducer`: game authoring, manifest compilation, execution and trusted worker admission.
- `@dreamboard-games/sdk/testing`: browser-safe local/scenario sources, replay, inspection and bounded exploration.

UI components are source-owned registry items installed into your application.
The SDK contains no styled components or stylesheet.

## Game authoring

`createGame(model)` is the single authoring entry point. The **model** is a
plain object: manifest ids, state schemas, one Zod schema per phase, and error
codes. The returned value is three things at once:

- the **type leaf**: `typeof game.types.State`, `.ErrorCode`, `.PlayerId`,
  `.Queries`, `.Tx` (phantom carriers; reading them at runtime throws),
- the **factory namespace**: `game.phase(name)`, `phase.define`,
  `phase.interaction`, `phase.inputs.*`, `game.view`,
- the **assembler**: `game.assemble({ initial, initialPhase, phases, view })`.

Mutation callbacks (`enter`, `reduce`, `resolve`) receive an open transaction
`tx`. Mutate through it and finish with a bare `return` (accept), or with
`tx.transition(name)`, `tx.endGame(outcome)`, or `tx.reject(code)`. Events go
through `tx.emit(...)`. `state` is the read-only snapshot the callback started
from; `tx.state` is the current draft. The transaction clones its table once;
all card, component, resource, and state-slice updates use that draft. Use
`tx.q` when a query must observe an earlier mutation in the same callback.
State patch callbacks return a replacement slice without mutating their input.
The former `ops`, `pipe`, flat `setActivePlayers`, and `tx.apply` APIs are removed;
call the named transaction methods directly.

```ts
// app/game-model.ts — the model, bound once
import { z } from "zod";
import { compileManifest, createGame } from "@dreamboard-games/sdk/reducer";
import manifest from "../manifest";
const manifestContract = compileManifest(manifest);
const { ids } = manifestContract;

export const game = createGame({
  manifest: manifestContract,
  state: {
    public: z.object({ currentPlayerId: ids.playerId.nullable() }),
    private: z.object({}),
    hidden: z.object({}),
  },
  phases: {
    setup: z.object({}),
    play: z.object({ leadCardId: ids.cardId.nullable() }),
  },
  errors: { NOT_YOUR_CARD: "Play a card from your own hand." },
});

export type GameState = typeof game.types.State;
```

```ts
// app/phases/play.ts — one phase, one file
import { game } from "../game-model";

const play = game.phase("play");

// Inputs name their candidate domain and eligibility predicates directly.
// `where.errorCode` is checked against `model.errors`.
const ownCard = play.inputs.card({
  from: ["hand"],
  where: {
    id: "own-card",
    errorCode: "NOT_YOUR_CARD",
    test: ({ q, playerId, targetId }) =>
      q.zone("hand", playerId).includes(targetId),
  },
});

export default play.define({
  kind: "player",
  initialState: () => ({ leadCardId: null }),
  actor: ({ state }) => state.publicState.currentPlayerId,
  interactions: {
    playCard: play.interaction({
      inputs: { cardId: ownCard },
      reduce({ tx, input, q }) {
        // tx.state.phase.leadCardId and input.params.cardId are inferred.
        tx.moveComponentToZone({
          componentId: input.params.cardId,
          to: { zoneId: "trick" },
          playedBy: input.playerId,
        });
        tx.patchPhaseState({ leadCardId: input.params.cardId });
        const next = q.player.nextInOrder(input.playerId);
        if (next) {
          tx.patchPublicState({ currentPlayerId: next });
          tx.setActivePlayers([next]);
        }
        if (tx.q.zone("hand", input.playerId).length === 0) {
          return tx.transition("setup");
        }
      },
    }),
  },
});
```

Dependent choices use `phase.steps()` instead of `inputs`. Each accepted command
commits exactly one current value. Factories receive only earlier parsed
`selected` values; descriptors expose only the current input. The final commit
runs complete-parameter validation and the reducer once. Use explicit `null`
for a no-target choice, and `many(...)` for one atomic multi-selection.

```ts
const choose = play.interaction({
  steps: play
    .steps()
    .input(
      "kind",
      play.inputs.form.choice({
        choices: [{ value: "single", label: "Single" }],
        defaultValue: () => undefined,
      }),
    )
    .input("count", ({ selected }) =>
      play.inputs.form.number({
        min: 1,
        max: selected.kind === "single" ? 1 : 3,
        defaultValue: 1,
      }),
    ),
  reduce({ input }) {
    // input.params contains both kind and count here.
  },
});
```

`rules.available` controls action eligibility; `rules.validate` checks a final
submission. Accepted state changes reconcile pending prefixes, while phase
entry clears them. A rejected final submission keeps the prior prefix. The
actor can cancel an unsealed prefix with `interaction.cancel`, using the same
transport basis and action identity as submission.

```ts
// app/game.ts — assembly
import { game } from "./game-model";
import play from "./phases/play";
import setup from "./phases/setup";

export default game.assemble({
  initial: {
    public: ({ playerIds }) => ({ currentPlayerId: playerIds[0] ?? null }),
    private: () => ({}),
    hidden: () => ({}),
  },
  initialPhase: "setup",
  phases: { setup, play },
  view: game.view(({ state, playerId, q }) => ({
    me: playerId,
    hand: q.zone("hand", playerId),
    current: state.publicState.currentPlayerId,
  })),
});
```

A missing, extra, or misspelled phase key fails to typecheck at `assemble`
or at `game.phase(name)`. Rules, views, and tests import `GameState` and
`typeof game.types.Tx` from the model module; nothing but the test harness
imports the assembled game, so there is no import cycle.

New workspaces keep authored starter code in `app/game.ts` and `ui/App.tsx`.
Import the manifest directly. `compileManifest(manifest)` provides inferred ID schemas,
table schemas, fresh initial tables, and board metadata in memory. `createGame`
also accepts the authored manifest directly. Bind a typed React hook with
`createGameHook<Game>()({ features, coverage })` from `@dreamboard-games/sdk/react`,
and pass a source to its `GameProvider`. The hosted UI imports `Game` only as a type;
`iframeSource()` supplies authoritative frames and handles commands.
No authoring generation step or shared workspace files are needed.

`createInitialTable({ playerIds })` takes the actual roster explicitly. Cards,
piece, die and tile seeds can use `scope: "perPlayer"` to replicate for those
seats, with initial ownership derived from the replication origin. Ownership
changes do not change instance IDs. Use `perPlayerInstanceId` when constructing
a reference from a known family, expanded base and seat; decoding validates
syntax only, while table admission checks live membership. UI consumers should
use the canonical IDs supplied by projected boards and eligible targets.
Instance record factories likewise require `{ playerIds }`, for example
`manifest.records.pieceIds(0, { playerIds })`. Player IDs are nonempty and unique;
`__proto__` is reserved to preserve roster keys through record parsing.

Zones declare either `scope` or `attachedTo` a board, generic board space, tile
cell, piece type, or die type. Query and move through the same zone API with the concrete host ID;
use `boardSpaceHostId(boardId, spaceId)` for a space attachment. Component-hosted
access follows the host's current owner, independently of contained ownership
and card face state. Initialization, movement and restore reject containment
cycles. Containers, slots and their location variants are removed.

`tileTypes` own immutable hex/square cells, annotations and rule fields;
`tileSeeds` create game-owned instances with independent ownership and mutable
properties. `q.tile(id)` addresses that inventory, including detached tiles.
Canonical `OnBoard` locations own placement. Hex/square topology is derived from
those locations and immutable definitions; runtime boards store only `baseId`
and explicit session relations. Cell identity follows the tile instance and
local cell, while world edges and vertices belong to the exact board instance.
The flat seat `boards` projection is the sole client topology source.

Private tile destinations remain rejected in this layer. Generic component
moves cannot remove a placed tile or place tiles on component spaces, edges or
vertices. Tile-cell zone hosts must remain empty while their tile is unplaced.
The existing UI zone facade still presents cards.

Manifest card counts and explicit piece/die/tile seed counts must be positive safe
integers. Omitted seed counts mean one copy. Zero, negative, fractional, non-finite,
and unsafe counts fail before ID expansion; negative, zero, and fractional literals
also fail typechecking. Widened `number` values still require runtime validation.
Player bounds must be positive safe integers with `minPlayers <= maxPlayers`.

`defineTopologyManifest` returns `ValidatedManifest<M>` after semantic validation.
`compileManifest` returns a branded `CompiledManifest<M>` after validation and table
materialization. Both snapshot the authored input so later source edits do not
change the validated value or future initial tables. Literal IDs remain inferred.

`ReducerGameDefinitionInput` describes the authored assembly fields. The assembled
`ReducerGameDefinition` adds the bound contract and validation brand; authors never
supply those output-only fields.

`game.assemble` checks phase names, the initial phase, interaction declarations,
and simultaneous-phase requirements, then returns a branded `ReducerGameDefinition`.
Runtime consumers such as `createReducerBundle` require that assembled type;
handwritten structural lookalikes do not satisfy it. These brands record SDK
construction checks, not correctness of arbitrary reducer callbacks, and do not
replace validation of runtime commands or state. As with other TypeScript types,
explicit assertions can bypass them; treat constructed definitions as immutable.
Each card in a manual card set requires `id` for its definition and `cardType`
for its category:

```ts
cards: [
  { id: "ace", cardType: "ranked", name: "Ace", count: 2, properties: {} },
  { id: "king", cardType: "ranked", name: "King", count: 1, properties: {} },
];
```

These definitions create runtime IDs `ace-1`, `ace-2`, and `king`, all in the
`ranked` category. Component IDs cannot start with `card-ref:`; that prefix is reserved
for opaque concealed-card references. These references belong to one seat and
authority version and expire after commits or restores. When the card schema has `byCardType`, every `cardType` must
name one of its schemas; `compileManifest` and `createGame` reject unknown categories.
The inferred table narrows a card lookup by its runtime ID to that definition's
card set, category, and properties. Author field schemas with `z.object`. For card categories, use
`cardSchema: { byCardType: { ranked: base.extend({ points: z.number().int() }) } }`
to reuse shared properties. Zod `.extend` defines property overrides in both
the runtime schema and inferred type. Fields are required unless authored with
`.optional()` or an explicit `.default(...)`; primitive defaults are not inferred.
Use `ref.cardId()`, `ref.pieceId()`, and the other `ref` markers for manifest
references. `defineTopologyManifest` exports portable JSON Schema while
retaining the authored types; refinements, transforms, and unsupported Zod
constructs fail at definition time.
For external JSON documents, call `parseTopologyManifestJson(value)` before
`compileManifest`. The parser checks structural keys, field schemas and manifest
references; transport services can preserve the document without duplicating
the SDK's model.
To migrate an older manifest, replace each card's `type` with `id` and set
`cardType` explicitly (often to the former `type` value).

## Reducer runner contract

`createReducerBundle(game)` returns exactly the contract version and three
operations: `initialize(input)`, `dispatch({ state, input, referenceBasis })`,
and `project({ state, playerIds, referenceBasis })`. The runner contract is `0.11.0`; hosts must
require that exact version. The host supplies `referenceBasis: { sessionId, version }`:
use a fresh session ID for each authority lifetime, increment version exactly once
for every accepted input, and advance it on restore without restoring an old
version from checkpoint data. Never change authoritative state under the same
basis. Submitted inputs carry the complete issuing frame basis; the host checks
its action-set version before dispatch. Dispatch includes validation, direct
transaction mutations, and phase entry.
Initialization returns
`{ state, terminal?, events? }`, preserving outcomes and events from initial
phase entry and returned transitions.

Mutation callbacks use `tx.roll(dieId)`, `tx.shuffle({ zone: { zoneId, hostId } })`,
`tx.deal({ from, to, count })` and
`tx.flipCard({ cardId, faceUp })` directly. Return
`tx.transition(phaseName)` to enter a phase, including reentering the current
phase. An unreturned outcome schedules no work. Entry chains are bounded to
1,000 entries per dispatch. `tx.endGame(outcome, { transition })` enters the
final phase once; that entry must not return another transition.

The authoritative state is explicit on every dispatch and projection. A host
may retain a warm worker and SDK caches, but replaying the same state and input
must produce the same gameplay result as a fresh worker. Projection timing is
diagnostic and is excluded from this equivalence.

Seat projections are independent of session versions. The gameplay service
owns the monotonically increasing version, perspective, and action-set identity.
The plugin frame basis contains `version`, `actionSetVersion`, and
`perspectivePlayerId`; it has no generation counter. Hosts merge the separately
cached board static projection when materializing plugin gameplay frames.

### Initialization options and actors

Declare lobby options once on `createGame({ options: z.strictObject({ ... }), ... })`.
The bundle accepts JSON-safe `options` at initialization, validates them with that
schema, persists the parsed values, and supplies them to initial state and phase
initializers. Without a schema, only `{}` is accepted. Options schemas must be
JSON-native: transforms, preprocessing, and coercion are rejected. Restored
sessions validate their stored options with the same schema.

Perform shuffle, deal, and other initialization mutations in an ordinary phase
entry callback. Setup profiles and bootstrap instructions are removed.
Interactions use `actor` to override their phase actor; only authorized seats
receive their input domains. Use ordinary form choices for responses and explicit
rules plus transaction resource mutations for affordability. Prompt collectors,
implicit costs, guidance metadata, and phase zone declarations are removed.

A game authors one `view` for each requested seat. Public and private fields
compose in that function; the transport never uses a seat view as a spectator
payload. Shared static boards come from compiled definitions; per-player boards
are instantiated for the actual roster.

Use `memoize((input: SomeImmutableObject) => result)` for shared pure calculations.
It caches by object identity with a WeakMap, including `undefined` results. Pass
immutable snapshots (or stable immutable branches), not an open mutable transaction.
There is no injected derived-value resolver.

## React adapter dependency

Framework-free consumers can import the package root without React. Applications
using `@dreamboard-games/sdk/react` must install the maintained React store adapter
alongside React:

```sh
pnpm add @dreamboard-games/sdk react@^19 react-dom@^19 @tanstack/react-store@0.11.1
```

`@tanstack/react-store` is an optional peer of the SDK so headless consumers do not
install the React adapter. The `/react` entry delegates selectors to that package;
the application bundler resolves its supported React subscription dependencies.

`/react` classifies each card press as a tap, hold, drag or browse. Enable
`dragFeature`, export `useCardGesture`, `useDropArea` and `useDragOverlay` from the
binding, and use the copied Hand and BoardTargets components or your own renderer.
The SDK prescribes no layout. Headless `game.drag` remains browser-free and handles
atomic domain routing. `fanLayout` computes arc positions for a hand, and
`originsFeature` adds `card.getOrigin()` so a newly shown card can animate from
the zone or player it came from.

## Local development and tests

`localSource(game, { players, seed, as, options })` executes the production reducer
and materializes the selected seat. `scenarioSource` starts from authored scenario
checkpoints. Keep these executable game imports in your local development entry;
the hosted entry uses only `iframeSource()` and type imports.

Local sources expose `inspect`, bounded `explore`, typed explicit-actor `apply`,
`switchSeat`, `checkpoint`, and validated `restore`. A JSON checkpoint preserves
visible pending selections and terminal state; restoring does not replay commands.
Concealed selections expire after any other accepted input or restore. Each
accepted extension of that same unfinished selection issues a new validity stamp
for the immediately following frame. This prevents drafts from tracking hidden
tiles or cards through a shuffle, including a shuffle that leaves their position
unchanged.
`createTestSource(snapshot)` supplies controlled frames and acknowledgements for
instance and React tests. Static and hosted sources do not expose `apply`.

Hosts import `assertReducerBundleContract`, `REDUCER_CONTRACT_VERSION`,
`ReducerWire` types and `ReducerWireZod` schemas from `/reducer`. Canonical iframe
and gameplay websocket schemas plus `materializePluginGameplayFrame` live at the
root. Materialize the requested seat directly from its projection before publishing it;
sources publish the canonical seat view and submit the exact frame basis.

Visible cards share one complete `ViewCard` shape: `id`, `cardType`, and JSON
`properties`, plus optional `name`, `text`, `frontImage`, and `backImage`.
`ViewCardSchema` validates this shape. Reducer and gameplay `cardViewsById` maps
contain these objects directly. Headless `card.view` preserves the manifest's
card identity, category, and property inference and is deeply readonly; table-only
`cardSetId` and `componentType` are absent. Concealed cards have a positional
opaque seat identity, no view, and an optional separate `cardBacksById` entry.
This wire format requires plugin protocol version 10 and reducer contract `0.11.0`.

Tiles use opaque `SeatTileRef` values even when visible. A projected tile is either
`{ disclosure: "visible", ref, tileTypeId, name, ownerId, fields, properties, frontImage? }` or
`{ disclosure: "concealed", ref, appearance }`; an omitted tile contributes no
entry or count. Public appearances are authored independently of secret faces.
Boards and zones each carry their own projected tiles. Only visible tiles
contribute cells, edges, vertices, and relations to the seat's board topology.
Use `phase.inputs.tile({ from: [zoneId] })` or
`phase.inputs.tile({ boards: [boardId] })` to select a tile. Reducers receive
its authoritative identity after the SDK validates and resolves the reference.
`tx.setTileDisclosure` controls face audiences and public appearance;
`tx.setBoardVisibility` controls the board's audience. Location visibility always
caps tile disclosure. Authored defaults cannot identify concealed tiles or cards.
Game-owned view fields can publish visible references through `references.tile`
and `references.space`; arbitrary authored text and JSON remain explicit publication.

Every `tx.emit` event declares `audience: { kind: "public" }` or
`{ kind: "seats", playerIds }`. A typed detail `{ kind: "tile", tileId }` is
projected only when that tile is visible to the audience. Identity-specific event
details and view references never track a concealed tile. Clients receive only
their own events and admitted tile references.

Card sets contain their authored `cards`, `cardSchema`, and `defaultHome` directly.
Standard playing cards are game-owned definitions with ordinary suit/rank
properties; the SDK does not synthesize inventories or assign built-in rules.

The exported `createGestureRecognizer(down, callbacks, options)` defaults to
upward touch dragging so hands retain sideways scrolling. Pile controls can use
`{ dragDirection: "any" }` with `touch-action: none` to drag toward a hand below
or beside them. This classifies pointer intent only; submit an authored interaction
through the bound game to enforce its rules, without selecting a hidden card ID.

# Spike: authoring API inferred from the model

Status: proposal backed by a working prototype (SDK type helpers, a type-level
proof under `packages/sdk/type-tests/authoring-model-types.ts`, and the Hearts
and hex-network-trading reference games re-assembled on the proposed path).

## Proposal

One public authoring path. Types come from the model; nothing else is named.

| Surface                                                | Role                                                                                      |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `defineGame(model, (game) => …)`                       | The only entry point.                                                                     |
| `game.phase(name)`                                     | Bound helper for one declared phase; misspellings fail to typecheck.                      |
| `phase.define / .interaction / .inputs.* / .targets.*` | The only factories a phase file needs.                                                    |
| `game.views.shared / player / empty / static`          | The only view factories.                                                                  |
| `GameContractOf<typeof model>`                         | Type-only twin of `defineGameContract(model)`; the type leaf for rules, views, and tests. |
| `PhaseAuthoringOf<typeof model, "name">`               | Parameter type for a phase factory in another file.                                       |
| `GameAuthoringOf<typeof model>`                        | Parameter type for a views/setup factory in another file.                                 |

Modular shape (what both converted games now look like):

```text
app/game-model.ts   { manifest, state, phases, errors } + type GameState (no SDK call)
app/phases/x.ts     export function defineX(x: PhaseAuthoringOf<GameModel, "x">)
app/player-view.ts  export function defineViews(game: GameAuthoringOf<GameModel>)
app/game.ts         defineGame(gameModel, (game) => ({ phases: { x: defineX(game.phase("x")) }, views: defineViews(game) }))
```

No file imports `game.ts` except the test harness, so the import cycle the
original write-up worried about does not arise: factories import _types_ from
`game-model.ts`, and `game.ts` imports the factories.

## Answers to the spike questions

1. **Does `GameContractOf<typeof gameModel>` replace runtime `defineGameContract`?**
   Yes. The type test asserts strict equality between `GameContractOf<M>` and
   `typeof defineGameContract(model)`, and between the two `GameStateOf` results.
   Phase names stay literal (`flow.currentPhase` is the declared union), player
   and card ids stay branded, and `model.errors` keys stay literal. Hearts and
   hex rules, views, and tests now import `GameState` from the schema-only
   `game-model.ts`. `game-contract.ts` and `authoring.ts` are deleted in both.

2. **Do factories taking `game.phase("playing")` keep inference across a file
   boundary?** Yes. Inference happens at the `.interaction()` call inside the
   factory, where the parameter is fully typed; the factory's return type is the
   inferred `PhaseDefinition`, which `defineGame` reads back. The type test
   asserts `ClientParamsOfInteractionOfDefinition<typeof game, "playerTurn",
"chooseMood">` is `{ mood: "ready" | "wait"; cardId: TestCardId }` and that
   `state.phase.rolled` is `boolean` inside both `reduce` and a `.where` test.
   In hex, `phase.inputs.board.vertex({ target })` now infers `VertexId` with no
   explicit generic, because the bound `targets.board.vertex("frontier")`
   defaults its id to the manifest's tiled vertex union.

3. **Can `PhaseMapOf` be tightened so a missing or extra key fails at the
   `defineGame` return?** Missing keys already failed (`PhaseMapOf` is a mapped
   type over the declared names). Extra keys did **not** fail before this spike;
   they were caught only by the runtime validator. `defineGame` now intersects
   the callback's return with a `NoUndeclaredPhases` map, so an extra key
   produces, at the offending property:
   `Type 'PhaseDefinition<…>' is not assignable to type "Phase 'bonus' is not declared in model.phases"`.
   `phases/index.ts` with `satisfies PhaseMapOf<GameContract>` is gone from
   both games.

4. **Should `.define()` keep injecting `state: schema`?** Yes. Neither converted
   game repeats a Zod schema in a phase file, and `initialState` is typed from
   the injected schema.

5. **Are views the same story?** Yes. `game.views.player({ project })` and a
   `defineViews(game: GameAuthoringOf<GameModel>)` factory both infer state and
   manifest with no contract type argument. Hex's static board view moved to
   `game.views.static(…)` the same way.

6. **Can `/reducer` stop exporting `definePhase` / `defineInteraction` /
   `createContractAuthoring`?** The prototype does not remove anything; the
   export-surface snapshot is unchanged. The recommendation below is to keep
   them for one release behind `/reducer/advanced`, because SDK unit tests and
   the seven unconverted games still call them.

## Two things the prototype changed in the SDK

- `packages/sdk/src/reducer/authoring/contract.ts`: `GameContractOf<Model>`.
- `packages/sdk/src/reducer/authoring/contract-authoring.ts`: `phase.targets`
  (card/board/choice, same builders as `inputs.*Target`), `game.views`
  (shared/player/empty/static, same as the flat `game.*View` methods),
  `GameAuthoringOf<Model>`, `PhaseAuthoringOf<Model, Name>`, and
  manifest-typed id defaults on the bound board-target builders.
- `packages/sdk/src/reducer/authoring/game.ts`: the extra-phase-key check.

Runtime behaviour, wire format, and UI contracts are untouched. The flat
`game.playerView(...)`, `game.emptyView()`, `authoring.game(...)` methods and
every unbound helper still exist and still work.

## Suggested demotion

| Today                                                                            | Proposed                                                         |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `defineGame(model, implement)`                                                   | Public default                                                   |
| `game.phase().define / .interaction / .inputs / .targets`, `game.views.*`        | Public default                                                   |
| `GameContractOf`, `GameAuthoringOf`, `PhaseAuthoringOf`                          | Public default (types only)                                      |
| `defineGameContract`                                                             | `/reducer/advanced` after the other seven games convert          |
| `createContractAuthoring`, `defineGameDefinition`                                | Internal implementation of the callback argument                 |
| `definePhase` / `defineInteraction` / `defineCardAction` / `defineStepPhase`     | `/reducer/advanced` escape hatch for one release                 |
| `definePlayerView` / `defineEmptyView` / `defineStaticView` / `defineSharedView` | `/reducer/advanced`; prefer `game.views.*`                       |
| `game.playerView / emptyView / staticView / sharedView`, `authoring.game`        | Deprecate in favour of `game.views.*` and the callback return    |
| `boardInput` / `cardInput` / `cardTarget` / `boardTarget` as free functions      | `/reducer/advanced`; prefer `phase.inputs.*` / `phase.targets.*` |

## Rough edges found while converting

- A malformed model makes `GameContractOf<M>` resolve to `never`, and the
  downstream errors read as "property does not exist on type never". Worth a
  descriptive branded error type before this ships.
- The bound board-target builders still take `boardId: string`. Typing it as
  the manifest's board id union is a small follow-up.
- Target domains are state-bound, not phase-bound. Hex builds each target from
  the phase that collects it, which is exactly one phase per target today. If a
  game needs one target from several phases, add `game.targets` (same builders)
  rather than reaching for the free functions.
- `packages/sdk/src/reducer/authoring-inference.test.ts` carries `satisfies
Expect<Equal<…>>` assertions, but `*.test.ts` is excluded from every tsconfig,
  so those assertions are never checked. Its manifest fixture is already stale.
  The new proof lives in `type-tests/`, which `pnpm typecheck` does check.

## Next steps

1. Decide on Q6 (drop vs. `/reducer/advanced` for one release).
2. Convert the remaining seven games with the same mechanical recipe used
   here: rename `game-contract.ts` to `game-model.ts`, wrap each phase file in
   a factory, replace `phases/index.ts` and `authoring.ts` with `game.phase(…)`
   calls in `game.ts`.
3. Move the demoted names and update `export-surface.test.ts.snap` in the same
   change so the snapshot documents the intent.

## Spike 2: module-level game value, phantom types, fused inputs

Proven on Hearts and hex-network-trading (`pnpm reference` passes for both)
and in `packages/sdk/type-tests/authoring-model-types.ts`.

- `createGame(model)` returns the bound authoring object without assembling.
  Both games now export it from `app/game-model.ts` (`hearts`, `stormtrail`);
  phase files import the value and export their phase with
  `export default playing.define({...})`. `game.ts` calls `.assemble(...)`.
  `PhaseAuthoringOf`, `GameAuthoringOf`, `GameContractOf`, and every phase
  factory wrapper are gone from both games.
- `game.types.{State, ErrorCode, PlayerId, Queries, Manifest, Contract}` and
  `phase.types.{State, PhaseState}` are phantom carriers: `typeof hearts.types.State`
  is strictly equal to `GameStateOf<GameContractOf<typeof model>>`. Reading
  them at runtime throws. Note `state.phase` is the phase fields intersected
  with the cross-phase `PhaseAccessor`, so `phase.types.PhaseState` exists for
  the raw schema type.
- `phase.inputs.card({ from: ["hand"], where })` and
  `phase.inputs.board.vertex({ boardId, where })` replace
  `targets.*.zones(...).where(...).build()` plus a second `inputs.*({ target })`
  call. `where` accepts one predicate or a list. The bound `where` checks
  `errorCode` against the model; the unbound builder accepted any string, so
  this closes a real gap. `{ target }` remains as the escape hatch for a rule
  shared across interactions. Hex's `eligibility.ts` now exports plain
  predicate objects typed `BoundTargetPredicate<Contract, VertexId>`, and each
  phase composes them.
- `export-surface.test.ts.snap` gained `createGame`. Nothing was removed.
- The package README still shows the callback-plus-factory shape from spike 1
  and should follow whichever shape is chosen.

## Hard cut: the end state, verified on Hearts and hex

Compatibility is no longer a goal. The public `/reducer` facade now exports one
authoring entry point and the surface that hangs off it; everything else is
internal. Hearts and hex-network-trading are re-authored on the end state and
pass `pnpm reference`. The other seven games are unchanged on disk, listed in
`LEGACY_REFERENCE_GAMES`, and skipped by discovery until converted.

**Public authoring surface** (`@dreamboard-games/sdk/reducer`):

| Name                                                                                                                       | Role                                                |
| -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `createGame(model)`                                                                                                        | The only entry point. Returns the bound game value. |
| `game.types.{State, ErrorCode, PlayerId, Queries, Tx, Manifest, Contract}`                                                 | Phantom type carriers.                              |
| `game.phase(name)` → `phase.define / .interaction / .inputs.* / .types`                                                    | Phase authoring.                                    |
| `phase.inputs.card({ from, where })`, `.board.vertex/edge/space/tile/playerSpace({ boardId, where })`, `.form.*`, `.rng.*` | Fused inputs; no target builders, no `.build()`.    |
| `game.views.shared / player / empty / static`                                                                              | Views.                                              |
| `game.assemble({...})`                                                                                                     | Assembly; missing and extra phase keys fail here.   |
| `defineInputs`, `many`                                                                                                     | Combinators that were already model-independent.    |

**Mutation callbacks** (`enter`, `reduce`, `resolve`) receive
`{ tx, random, q, derived, state, ...context }`. `tx` is the open transaction;
`accept`, `endGame`, `reject`, `edit`, `fx`, and `ops` are gone from every
public argument type. A bare `return` accepts the transaction; `tx.transition`,
`tx.endGame(outcome, { transition })`, and `tx.reject(code)` are the other
outcomes; `tx.emit` records events; `tx.roll`, `tx.shuffle`, and `tx.deal` mutate the transaction directly.
Views, actor selectors, and interaction rules receive only `{ q, derived,
state, ...context }`.

Removed from the facade: `defineGame`, `defineGameContract`,
`createContractAuthoring`, `definePhase`, `defineStepPhase`,
`defineInteraction`, `defineInteractionRule`, `defineCardAction`,
`definePlayerView`, `defineSharedView`, `defineEmptyView`, `defineStaticView`,
`defineStage`, `definePhaseStage`, `boardInput`, `cardInput`, `boardTarget`,
`cardTarget`, `choiceTarget`, `formInput`, `rngInput`,
`createReducerEdit`, `createReducerTransaction`, `GameStateOf`,
`ErrorCodeOfContract`, `PhaseMapOf`, `GameContractOf`, `GameAuthoringOf`,
`PhaseAuthoringOf`, `phase.targets`, `game.game`, and the flat `game.*View`
methods. `defineGameDefinition` left `/reducer/advanced`.

**Things the cut surfaced**

- Phase `enter` and `resolve` never received the contract's error codes;
  `reject("TYPO")` typechecked. `PhaseDefinition` now carries `ErrorCode` and
  the bound `phase.define` threads it, so `tx.reject` is checked everywhere.
- The transaction's op methods were function-typed properties, so a
  phase-scoped `tx` was not assignable to a helper typed on the base state.
  They are method-typed now, and `StatePatch`'s updater is method-typed for
  the same reason. `patchPhaseState` was the only member that blocked it.
- `tx` is created lazily. Views, actor selectors, and rules never pay for the
  table clone; `resultStateOf(args)` returns the transaction state only if the
  callback opened one.
- The runtime still puts the legacy helpers on the args object (untyped) so
  the SDK's own test suite keeps running through `src/reducer/internal.ts`.
  Migrating those tests removes both.
- `testing-runtime.test.ts` compiled roll-and-write as its source-bound
  fixture; it now compiles Hearts.
- The workspace seed (`app/game.ts` for a new project) emits the
  `createGame` + `game.assemble` + `tx` shape.

**Next**: remove codegen (the external CLI is being removed, so
`manifest-static.json` and `shared/generated/` have no remaining consumer
outside this repo), convert or delete the seven legacy games, migrate the SDK
tests off `internal.ts`, and delete the unbound helpers.

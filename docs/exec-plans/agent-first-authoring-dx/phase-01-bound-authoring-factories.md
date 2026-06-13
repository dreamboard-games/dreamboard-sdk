# Phase 1: Contract-Bound Authoring Factories

## Objective

Make game code authorable with **zero type parameters and zero manual type
annotations** by introducing a contract-bound authoring object. The contract
returned by `defineGameContract` already carries, at runtime and in its type,
every fact the curried factories currently ask authors to repeat — the phase
name → phase-state-schema map (`contract.phases`), the manifest, and the state
schemas. This phase stops asking for that information twice.

This is the highest-leverage DX change in the plan. It is purely additive:
the existing curried `defineInteraction<C, S>()(...)` factories keep working
and remain the implementation substrate.

## Background

Today every interaction file repeats the contract type and the phase schema:

```ts
// frontier-trails app/phases/player-turn/build.ts (current)
export const buildTrail = defineInteraction<
  GameContract,
  typeof playerTurnPhaseStateSchema
>()({
  inputs: {
    edgeId: boardInput.edge<GameState, EdgeId>({ target: buildTrailTarget }),
  },
  rules: [
    /* ... */
  ],
  reduce({ state, input, accept, q }) {
    /* ... */
  },
});
```

Failure modes this creates for agents:

- The phase-state binding is positional and repeated per file. Passing
  `setupPhaseStateSchema` into a `playerTurn` interaction type-checks the
  _definition_ but binds the wrong `state.phase` shape — discovered only when
  the phase map rejects it (or worse, when both schemas are structurally
  compatible and it never surfaces).
- `defineGame` requires a manual annotation in practice
  (`const game: ReducerGameDefinition<GameContract, typeof phases, typeof views> = defineGame({...})`),
  which agents reproduce by pattern, not understanding.
- Input collectors take explicit type params
  (`boardInput.edge<GameState, EdgeId>`), re-deriving types the manifest
  already knows.

Precedent inside this codebase: the generated `test/testing-types.ts` already
ships workspace-narrowed `defineScenario`/`defineBase` with all generics
pre-bound — test authors never write a type parameter. This phase applies the
same idea to `app/`.

## Proposed Fix

### 1A. `createContractAuthoring` In The SDK

New module `packages/sdk/src/reducer/authoring/contract-authoring.ts`,
exported from `./reducer`:

```ts
import type {
  CardActionSpec,
  InputCollector,
  InteractionRule,
  InteractionSpec,
  PhaseNameOfContract,
  SchemaLike,
  ScopedPhaseState,
} from "../model";
import type {
  AnyReducerGameContract,
  ContractManifest,
  ContractState,
  InferPhaseState,
} from "./types";
import { defineGame } from "./game";
import { defineView, defineStaticView } from "./view-stage";
import { definePhase, defineStepPhase } from "./phase";
import {
  defineCardAction,
  defineInteraction,
  defineInteractionRule,
} from "./interaction";

/**
 * Contract with a runtime `phases` record (every contract produced by
 * `defineGameContract` has one — see authoring/contract.ts).
 */
type ContractWithPhases = AnyReducerGameContract & {
  phases: Record<string, SchemaLike<object>>;
};

export function createContractAuthoring<
  const Contract extends ContractWithPhases,
>(contract: Contract): ContractAuthoring<Contract> {
  const phaseCache = new Map<string, unknown>();
  return {
    contract,
    game: (definition) => defineGame({ contract, ...definition }),
    view: (definition) => defineView<Contract>()(definition),
    staticView: (definition) => defineStaticView<Contract>()(definition),
    phase: (name) => {
      const cached = phaseCache.get(name);
      if (cached) return cached as never;
      const schema = contract.phases[name];
      const bound = createPhaseAuthoring(contract, name, schema);
      phaseCache.set(name, bound);
      return bound as never;
    },
  };
}
```

The shape (types simplified; the implementation reuses the existing
`InteractionSpec` / `CardActionSpec` / `PhaseDefinition` model types and the
existing `validate*` authoring-time checks — no new validation logic):

```ts
export type ContractAuthoring<Contract extends ContractWithPhases> = {
  readonly contract: Contract;

  /** `defineGame` with `contract` pre-bound. */
  game<
    Definitions extends PhaseMapOf<Contract>,
    Views extends ViewMapOf<Contract> = Record<string, never>,
  >(
    definition: Omit<
      ReducerGameDefinition<Contract, Definitions, Views>,
      "contract"
    >,
  ): ReducerGameDefinition<Contract, Definitions, Views>;

  view<Projection>(
    definition: ReducerViewDefinition<Contract, Projection>,
  ): ReducerViewDefinition<Contract, Projection>;

  staticView(/* mirrors defineStaticView */): /* ... */;

  /** Returns factories bound to Contract + contract.phases[Name]. */
  phase<Name extends PhaseNameOfContract<Contract>>(
    name: Name,
  ): PhaseAuthoring<Contract, Contract["phases"][Name]>;
};

export type PhaseAuthoring<
  Contract extends ContractWithPhases,
  PhaseStateSchema extends SchemaLike<object>,
> = {
  interaction<Collectors extends Record<string, InputCollector>>(
    spec: InteractionSpec<
      Collectors,
      ScopedPhaseState<ContractState<Contract>, InferPhaseState<PhaseStateSchema>>,
      ContractManifest<Contract>
    >,
  ): InteractionSpec<
    Collectors,
    ScopedPhaseState<ContractState<Contract>, InferPhaseState<PhaseStateSchema>>,
    ContractManifest<Contract>
  >;

  cardAction<
    Collectors extends Record<string, InputCollector> = Record<string, never>,
    const PlayFrom extends PlayerZoneIdOfManifest<ContractManifest<Contract>> =
      PlayerZoneIdOfManifest<ContractManifest<Contract>>,
  >(
    spec: CardActionSpec<Collectors, /* scoped state */, ContractManifest<Contract>, PlayFrom>,
  ): /* same */;

  rule<Collectors extends Record<string, InputCollector> = Record<string, InputCollector>>(
    rule: InteractionRule</* bound */>,
  ): /* same */;

  /**
   * `definePhase` / `defineStepPhase` with `state` injected from
   * `contract.phases[name]` — the author no longer passes the schema at all.
   */
  define(definition: Omit<BoundPhaseDefinitionInput, "state">): /* PhaseDefinition */;
  stepPhase(definition: Omit<BoundStepPhaseDefinitionInput, "state">): /* PhaseDefinition */;

  /** Pre-bound input collector builders — see 1C. */
  readonly inputs: BoundInputBuilders<Contract>;
};
```

Implementation note: each method delegates to the existing curried factory —
`interaction: (spec) => defineInteraction<Contract, PhaseStateSchema>()(spec)`
— so behavior, runtime validation, and the model types stay single-sourced.
The phase factories additionally spread `state: schema` into the definition
before delegating to `definePhase` / `defineStepPhase`.

### 1B. Generated `app/authoring.ts` Seed

`packages/workspace-codegen/src/seeds.ts` gains a one-time seed (authored
file after generation, like the other seeds — ownership rules unchanged):

```ts
// app/authoring.ts (seeded into new workspaces)
import { createContractAuthoring } from "@dreamboard-games/sdk/reducer";
import { gameContract } from "./game-contract";

export const authoring = createContractAuthoring(gameContract);

// One named binding per phase keeps interaction files import-light.
export const setup = authoring.phase("setup");
export const playerTurn = authoring.phase("playerTurn");
export const checkGameEnd = authoring.phase("checkGameEnd");
export const gameOver = authoring.phase("gameOver");
```

Import-graph check (no cycles): `game-contract.ts` imports only the manifest
contract and zod; `authoring.ts` imports `game-contract.ts`; phase files
import `authoring.ts`; `game.ts` imports phases + `authoring.ts`.

The scaffold templates in the public CLI repo are regenerated to author new
games in the bound style (cross-repo touchpoint; the seed content lives here
in `workspace-codegen`, the CLI only invokes it).

### 1C. Bound Input Builders

`boardInput.edge<GameState, EdgeId>({...})` carries two type params the
contract already knows. The bound phase object exposes builders with both
pre-bound:

```ts
// before
inputs: {
  edgeId: boardInput.edge<GameState, EdgeId>({ target: buildTrailTarget }),
}

// after
inputs: {
  edgeId: playerTurn.inputs.board.edge({ target: buildTrailTarget }),
}
```

`BoundInputBuilders<Contract>` wraps the existing `boardInput` / `cardInput` /
`formInput` / `promptInput` / `rngInput` / `choiceTarget` namespaces, fixing
`State = ContractState<Contract>` and defaulting the value type from the
manifest (`TiledEdgeIdOfTable<...>` for `board.edge`, etc.). The unbound
namespaces remain exported for the rare case where an author needs to narrow
to a sub-union of ids — the bound builder's value type still accepts an
explicit narrowing parameter:

```ts
playerTurn.inputs.board.edge<RelayEdgeId>({ target: relayTarget });
```

### 1D. End-To-End Before/After (the handover demo)

`build.ts` after this phase:

```ts
import { playerTurn } from "../../authoring";
import { COST_ROUTE, edit, findDetachedPieces } from "../../reducer-support";
import { buildTrailTarget } from "../../eligibility";
import { diceRolledRule } from "./action-rules";

export const buildTrail = playerTurn.interaction({
  inputs: {
    edgeId: playerTurn.inputs.board.edge({ target: buildTrailTarget }),
  },
  rules: [
    diceRolledRule,
    {
      id: "can-afford-trail",
      errorCode: "INSUFFICIENT_RESOURCES",
      message: "Need 1 timber + 1 clay.",
      validate: ({ input, q }) =>
        q.player.canAfford(input.playerId, COST_ROUTE),
    },
  ],
  reduce({ state, input, accept }) {
    const [trailId] = findDetachedPieces(state, input.playerId, "trail", 1);
    const tx = edit(state);
    tx.spendResources({ playerId: input.playerId, amounts: COST_ROUTE });
    tx.moveComponentToEdge({
      componentId: trailId,
      boardId: "frontier",
      edgeId: input.params.edgeId,
    });
    return accept(tx.state);
  },
});
```

(The rule simplification — `validate` returning `boolean` and the message
living on the rule — is _already supported_ by
`InteractionRuleValidationResult`; phase 2 types the code, this phase updates
the examples/docs style.)

`game.ts` after this phase — note: no annotation, no `contract:` key:

```ts
import { authoring } from "./authoring";
import { phases } from "./phases";
import { playerView } from "./player-view";
// ...

const game = authoring.game({
  initial: {
    public: ({ playerIds, setup }) => ({
      /* ... */
    }),
    private: () => ({}),
    hidden: () => ({}),
  },
  initialPhase: "setup",
  setupProfiles,
  phases,
  views: { player: playerView },
  staticView: boardStatic,
});

export default game;
```

`phases/player-turn/index.ts` after this phase:

```ts
export const playerTurnPhase = playerTurn.stepPhase({
  kind: "player",
  steps: ["roll", "discard", "storm", "main"],
  // `state:` is gone — injected from contract.phases.playerTurn
  initialState: () => ({ ...FRESH_TURN }),
  enter({ state, accept, q }) {
    /* unchanged */
  },
  actor: ({ state }) => state.flow.activePlayers,
  zones: [zones.charterHand],
  cardActions: {
    /* unchanged */
  },
  interactions: {
    /* unchanged */
  },
});
```

### 1E. Inference Acceptance Gate For `authoring.game`

The current example needs
`const game: ReducerGameDefinition<GameContract, typeof phases, typeof views>`.
Part of this phase is determining _why_ (declaration-emit stability vs.
genuine inference failure) and making the bound form infer cleanly. Add a
type-level test in `packages/sdk/src/reducer/` (pattern:
`contract-id-branding.test.ts`):

```ts
// authoring-inference.test.ts (type assertions, bun test)
const game = authoring.game({
  /* fixture definition */
});
type PhaseNames = PhaseNamesOfDefinition<typeof game>;
type _AssertPhases = Expect<Equal<PhaseNames, "setup" | "playerTurn">>;
type Params = ClientParamsOfInteractionOfDefinition<
  typeof game,
  "playerTurn",
  "buildTrail"
>;
type _AssertParams = Expect<Equal<Params, { edgeId: EdgeIdFixture }>>;
```

If inference cannot be made to hold (e.g. variance in `initialState`), the
fallback is for `authoring.game` to require `phases`/`views` as prior
`const`-bound values (the current style) — but the annotation must not be
needed. This gate is the phase's hardest unknown; timebox it first.

## Files Touched

- `packages/sdk/src/reducer/authoring/contract-authoring.ts` (new)
- `packages/sdk/src/reducer/authoring.ts`, `packages/sdk/src/reducer.ts`
  (export `createContractAuthoring`, `ContractAuthoring`, `PhaseAuthoring`)
- `packages/sdk/src/reducer/inputs/*` (factor the bound builder wrappers;
  no behavior change to the unbound namespaces)
- `packages/workspace-codegen/src/seeds.ts` (+ seed tests)
- `packages/sdk/src/export-surface.test.ts` snapshots (additive)
- Example migration: frontier-trails `app/` in the private monorepo
  (`pnpm regen:examples` + manual authored-file migration as the reference
  diff for the migration guide)

## Verification

- New unit tests: bound factories produce definitions deep-equal to the
  curried equivalents for a fixture contract (runtime identity), plus the
  type-level inference tests in 1E.
- `workspace-codegen` integration tests: temp project scaffolded with the new
  seed compiles under `tsc` (existing temp-project pattern).
- Private monorepo: migrate frontier-trails to the bound style; run
  `pnpm --dir examples/published/frontier-trails typecheck`,
  `dreamboard test generate && dreamboard test run`, `pnpm verify:dev`.
- Grep gate for the scaffold: seeded workspaces contain no
  `defineInteraction<`, `definePhase<`, `defineStepPhase<`,
  `ReducerGameDefinition<` occurrences.

## Acceptance Criteria

- A scaffolded workspace's `app/` contains zero `<...>` type-argument lists
  and zero manual type annotations attributable to the SDK.
- Wrong-phase binding is structurally impossible in the bound style (the
  schema is looked up by phase name; there is nothing to pass incorrectly).
- The curried factories still pass their existing tests unchanged.
- Export-surface snapshot diff is additive only.

## Risks

- **Type instantiation cost**: binding at the contract level can widen
  inference work. Gate with `tsc --extendedDiagnostics` on the migrated
  example; budget: app project ≤ 3s / ≤ 600k instantiations (current: 1.97s /
  400k).
- **`Omit` over generic spec types** can break inference on the callback
  parameters; the implementation should prefer explicitly re-stated input
  types (as the model layer already does) over `Omit` if errors degrade.
- **Two documented styles** during transition. Mitigation: docs/scaffold
  switch entirely in this phase; the curried form survives only in the
  "advanced" reference page (phase 8 reinforces this).

# Phase 03: Guidance Projection And Explanation UI

Status: SDK contract/projection, controlled-component source/proof, SDK
anchor-game guidance/proof, and public-example lint/generation-rule slices
complete on 2026-06-18; internal monorepo pass-through remains.

Depends on Phase 02.

Primary repositories: `dreamboard-sdk` and the internal monorepo.

## Source Receipt: SDK Contract/Projection Slice

Completed in `dreamboard-sdk` on 2026-06-18:

- Added `SetupProfileSpec.guidance`, `PhaseDefinitionCommon.guidance`, and
  `InteractionSpec`/`CardActionSpec.presentation` authoring fields.
- Preserved setup guidance through manifest metadata/codegen analysis and
  added duplicate guidance-step ID validation.
- Projected `descriptor.label`/`descriptor.help` from authored presentation
  with the existing deterministic humanized interaction fallback.
- Projected current phase/setup guidance through trusted dynamic projection,
  the strict plugin runtime contract, materialized gameplay frames, runtime
  snapshot types, and semantic projection digests.
- Added controlled `GuidancePanel`, `SetupChecklist`, and `ActionHelp`
  components exported from the public UI component surface. Setup completion
  stays prop-driven from game view data, and unavailable reasons render from
  `descriptor.availability.reason`-shaped input without developer diagnostics.
- Added Storybook coverage for guidance overview, setup completion, blocked
  action reasons, and a phone-width guidance stack; registered the public
  guidance components in `ui:coverage:check`.
- Recompiled portable UI fixtures so fixture receipts include the new descriptor
  and digest shape.
- Added authored guidance to `roll-and-write-scorecard` and
  `multiplayer-ranking-and-ties`, including exact verifier assertions for phase
  guidance, setup guidance, interaction presentation, and the visible blocked
  roll-first reason.
- Preserved reference-reducer guidance and player-safe descriptor help/reason
  projection for portable reference scenarios.
- Added explicit authored phase guidance and interaction labels to the earlier
  public reference descriptors that still relied on fallback copy.
- Extended `reference-games:check` to validate required phase labels/summaries,
  interaction labels, unique setup guidance step IDs, bounded non-empty strings,
  no raw Markdown/HTML in player-facing descriptor fields, and exact source text
  preservation in generated UI fixture frames.
- Aligned reducer accept/event wire types, generated reducer-contract fixtures,
  and trusted-bundle readonly return types so the guidance fixture build and
  `typecheck` gates consume the same event-aware reducer result shape.
- Recompiled generated UI fixtures and scenario catalog after the anchor-game
  guidance updates.

Verification run:

```sh
mise exec node@24 -- pnpm --filter @dreamboard-games/plugin-runtime-contract test
mise exec node@24 -- pnpm --filter @dreamboard-games/sdk exec bun test src/reducer/interaction-decision.test.ts src/reducer/setup-profile-runtime.test.ts src/testing/ui-fixture/ui-fixture.test.ts src/testing/competition-characterization/phase-00-baseline.test.ts
mise exec node@24 -- pnpm typecheck
mise exec node@24 -- pnpm ui:fixtures:compile
mise exec node@24 -- pnpm ui:fixtures:check
mise exec node@24 -- pnpm ui:catalog:check
mise exec node@24 -- pnpm docs:check
mise exec node@24 -- pnpm --filter @dreamboard-games/sdk exec bun test src/ui/components/Guidance.test.tsx
mise exec node@24 -- pnpm exports:check
mise exec node@24 -- pnpm reference-games:check
mise exec node@24 -- pnpm ui:fixtures:check
mise exec node@24 -- pnpm ui:test --scenario roll-and-write-scorecard.mark-cell.mobile
mise exec node@24 -- pnpm ui:test --scenario multiplayer-ranking-and-ties.draft-stall.desktop
mise exec node@24 -- pnpm generate:check
mise exec node@24 -- pnpm --filter @dreamboard-games/reducer-contract build
mise exec node@24 -- pnpm --filter @dreamboard-games/reducer-contract test
mise exec node@24 -- pnpm --filter @dreamboard-games/sdk exec bun test src/ui/components/Guidance.test.tsx src/reducer/interaction-decision.test.ts src/reducer/setup-profile-runtime.test.ts src/testing/ui-fixture/ui-fixture.test.ts
mise exec node@24 -- pnpm ui:coverage:check
mise exec node@24 -- pnpm ui:test:stories
mise exec node@24 -- pnpm ui:test:visual
```

Workbench evidence receipts:

- `artifacts/ui/2026-06-18T13-29-08-213Z/receipt.json`:
  `roll-and-write-scorecard.mark-cell.mobile` passed on chromium desktop,
  chromium touch phone, and webkit phone with measured projection, semantic,
  submission, screenshot, and transcript evidence.
- `artifacts/ui/2026-06-18T13-29-48-028Z/receipt.json`:
  `multiplayer-ranking-and-ties.draft-stall.desktop` passed on chromium desktop
  with measured projection, semantic, submission, screenshot, and transcript
  evidence.
- `artifacts/ui-stories/2026-06-18T13-44-40-576Z/receipt.json`:
  Storybook interaction proof passed after building Storybook.
- `artifacts/ui-visual/2026-06-18T13-45-00-518Z/receipt.json`:
  Storybook visual proof passed after building Storybook.

`pnpm check` was not rerun for this slice because Phase 02 already records the
current clean-checkout blocker as the pre-existing repository `format:check`
backlog, not this guidance projection work.

Remaining Phase 03 work:

- Update strict internal monorepo consumers, host selectors/adapters, reconnect
  handling, and real-host parity proof.

Phase 00 brief jobs cited:

- `roll-and-write-scorecard-01`: `show why other squares are blocked`.
- `per-player-resource-track-01`: `block overheat actions`.
- `variable-setup-race-01`: `race to non-score objective`.

## Objective

Project concise, authored guidance for setup, the current phase, and available
interactions while preserving reducer rules as the only authority for whether
an action is legal.

This phase is for player-facing clarity. Developer diagnostics such as
`explainInteraction()` remain a separate test/dev surface.

## User Outcome

A designer or playtester can answer:

- What am I trying to do now?
- Which action should I choose?
- Why is this action disabled?
- What setup steps remain?

The coding agent declares this copy next to the rule or phase that owns it
instead of creating game-local help dictionaries.

## Authoring Contract

Reuse existing canonical fields where they exist.

### Setup Profiles

Extend `SetupProfileSpec`:

```ts
export type SetupGuidanceStep = {
  id: string;
  label: string;
  description?: string;
};

export type SetupProfileSpec = {
  id: string;
  name: string;
  description?: string;
  optionValues?: Record<string, string>;
  guidance?: {
    summary?: string;
    steps?: readonly SetupGuidanceStep[];
  };
};
```

The authored steps describe the setup. Completion state remains game/view data.
The framework must not guess that a step is complete from component locations.

### Phases

`PhaseDefinitionCommon.name` remains the phase label. Add:

```ts
type PhaseGuidance = {
  summary: string;
  objective?: string;
};

type PhaseDefinitionCommon = {
  name?: string;
  guidance?: PhaseGuidance;
  // existing fields
};
```

Do not add a second `label` field beside `name`.

### Interactions

Extend `InteractionSpec` and `CardActionSpec`:

```ts
type InteractionPresentation = {
  label: string;
  help?: string;
};

type InteractionSpec = {
  presentation?: InteractionPresentation;
  // existing inputs, rules, reduce, ...
};
```

Reference games, generated scaffolds, and new public examples must declare
`presentation.label`. Existing third-party games may use the current
humanized-ID fallback until they are regenerated; the fallback is not
documented as the preferred path.

## Projection Contract

Add player-safe presentation to interaction descriptors:

```ts
interface InteractionDescriptorBase {
  interactionId: string;
  label: string;
  help?: string;
  availability: InteractionAvailability;
  // existing fields
}
```

Add current guidance to plugin state:

```ts
export type GameGuidanceProjection = {
  phase: {
    id: string;
    label: string;
    summary?: string;
    objective?: string;
  };
  setup?: {
    profileId: string;
    name: string;
    summary?: string;
    steps: readonly SetupGuidanceStep[];
  };
};
```

The trusted bundle derives:

- phase ID from `state.flow.currentPhase`;
- phase label from `PhaseDefinitionCommon.name`, with the existing humanized
  fallback;
- phase summary/objective from the phase definition;
- interaction label/help from the interaction definition; and
- setup guidance from the selected manifest setup profile.

### Disabled Reasons

Player-facing disabled copy comes only from:

```ts
descriptor.availability.reason;
```

That value is already resolved from authorization, rule code/message, and
resource checks. The UI may format it, but must not replace it with a separate
reason map.

`descriptor.reasons` and `explainInteraction()` remain verbose developer
diagnostics. They must not be projected to ordinary player UI or used as the
primary player-facing message.

## UI Components

Add controlled components:

```tsx
<GuidancePanel phase={guidance.phase} actions={availableInteractions} />
```

```tsx
<SetupChecklist
  guidance={guidance.setup}
  completedStepIds={view.completedSetupStepIds}
/>
```

```tsx
<ActionHelp
  label={descriptor.label}
  help={descriptor.help}
  unavailableReason={
    descriptor.availability.status === "available"
      ? undefined
      : descriptor.availability.reason
  }
/>
```

Component responsibilities:

- render concise hierarchy and accessible descriptions;
- preserve authored text;
- expose unavailable reasons in visible text and assistive technology;
- support narrow/mobile layouts; and
- avoid rendering developer rule IDs or internal error codes unless no message
  exists.

Component non-responsibilities:

- selecting the active interaction;
- calculating legal actions;
- inferring setup completion;
- submitting reducer inputs; or
- rewriting game rules.

Update `PhaseIndicator` to accept the projected phase label/summary directly or
compose it inside `GuidancePanel`. Do not require each game to maintain a
`phaseLabels` record.

## Example Authoring

```ts
export const playRoute = playerTurn.interaction({
  presentation: {
    label: "Play route",
    help: "Choose a route card, then choose an open matching space.",
  },
  inputs: {
    cardId: playerTurn.inputs.card(/* ... */),
    spaceId: playerTurn.inputs.board.space<RouteSpaceId>({
      target: openRouteTarget,
    }),
  },
  rules: [
    playerTurn.rule({
      id: "space-open",
      errorCode: "SPACE_OCCUPIED",
      message: "That route space is already occupied.",
      available: ({ state }) => hasOpenRouteSpace(state),
    }),
  ],
  reduce: /* ... */,
});

export const playerTurnPhase = playerTurn.define({
  kind: "player",
  name: "Choose a route",
  guidance: {
    summary: "Play one card or reserve it for final scoring.",
    objective: "Build connected routes before the fourth round ends.",
  },
  initialState: () => ({}),
  actor: ({ state }) => state.flow.activePlayers,
  interactions: {
    playRoute,
  },
});
```

The same `SPACE_OCCUPIED` rule message appears in descriptor availability and
submit rejection.

## Exact Ownership

SDK source:

- `packages/sdk-types/src/contracts.ts` for setup metadata;
- generated manifest metadata and codegen;
- `packages/sdk/src/reducer/model/spec/phases.ts`;
- `packages/sdk/src/reducer/model/spec/interactions.ts`;
- trusted interaction descriptor projection;
- trusted bundle/plugin projection;
- `packages/sdk/src/runtime/types/plugin-state.ts`;
- workspace UI contract components/hooks;
- controlled UI components and stories;
- fixture compiler and semantic projection digest;
- reference-game authoring and tests.

Private product source:

- owning gameplay/plugin-frame API or schema source;
- generated API client and service types;
- gameplay projection pass-through if applicable;
- host runtime parsing and selectors;
- browser host adapters; and
- real-host parity fixtures.

If the plugin frame is SDK-owned and transported as opaque canonical JSON, the
internal change may be limited to strict parsers and digest fixtures. Verify
that from live code; do not assume fields pass through.

## Anchor Integration

Add guidance to both canonical games available by this phase:

`roll-and-write-scorecard`:

- setup steps for preparing dice and player scorecards;
- phase objective before and after the roll;
- mark interaction help;
- authoritative "roll first" and illegal-cell reasons.

`multiplayer-ranking-and-ties`:

- setup profile summary;
- phase objective for card selection and scoring;
- tie-break explanation in authored help;
- terminal reason and standings presentation.

Add one scenario where an action is visible but blocked and assert the exact
player-facing reason.

Phase 04's solo and automa examples must use these same guidance contracts when
they land; do not create example-local instruction panels.

## Lint And Generation Rules

Add repository checks for public examples:

- phase `name` present;
- phase guidance summary present for player phases;
- interaction presentation label present;
- setup guidance step IDs unique;
- strings non-empty and bounded;
- no raw Markdown/HTML in descriptor fields; and
- generated artifacts preserve exact text.

Do not make optional metadata a runtime crash for third-party packages. Emit
authoring diagnostics and preserve deterministic fallback behavior.

## Tests

SDK:

- phase and interaction metadata type inference;
- descriptor projection;
- setup-profile selection;
- fallback label behavior;
- unavailable reason preservation;
- semantic projection digest updates;
- Storybook visual states;
- screen-reader names/descriptions;
- mobile overflow;
- Workbench fixture round trip.

Internal:

- strict frame parsing;
- reconnect/state restore;
- host selector stability;
- API-client generated schemas; and
- real browser display of current guidance and blocked reason.

## Implementation Sequence

1. Add setup, phase, and interaction authoring types.
2. Update codegen and generated manifest metadata.
3. Project labels/help through trusted descriptors.
4. Add current phase/setup guidance to plugin state.
5. Update semantic digests and fixture schemas.
6. Add controlled UI components and Storybook states.
7. Update anchor reference games and runtime fixtures.
8. Publish a local SDK snapshot and update strict internal consumers.
9. Run real-host parity and packed consumer proof.
10. Generate reference documentation.

## Verification

SDK:

```bash
mise exec node@24 -- pnpm ui:fixtures:compile
mise exec node@24 -- pnpm ui:catalog:generate
mise exec node@24 -- pnpm ui:coverage:check
mise exec node@24 -- pnpm ui:fixtures:check
mise exec node@24 -- pnpm ui:runtime:test
mise exec node@24 -- pnpm ui:test
mise exec node@24 -- pnpm ui:test:runtime-visual
mise exec node@24 -- pnpm reference-games:check
mise exec node@24 -- pnpm docs:check
mise exec node@24 -- pnpm check
```

Internal:

```bash
pnpm verify:authoring
pnpm verify:embedded
pnpm verify:browser
pnpm fin
pnpm verify:dev
```

## Exit Criteria

- Published reference games no longer maintain game-local phase-label or
  action-help dictionaries.
- Interaction descriptors carry authored label/help.
- Plugin state carries current phase/setup guidance.
- UI displays descriptor availability reasons without recomputation.
- Setup completion remains controlled by the game view.
- Dev diagnostics remain separate from player-facing guidance.
- Mobile, accessibility, packed consumer, and real-host parity proofs pass.

## Stop Conditions

Stop and revise if:

- guidance must contain private information not safe for all projected players;
- host transport strips metadata and no source contract owns the frame;
- authors need rich rulebook documents rather than concise runtime guidance;
- UI requirements imply a second legality engine; or
- setup completion cannot be supplied by game view without framework inference.

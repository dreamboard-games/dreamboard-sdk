# Phase 05: Solo And Automa Runtime Model

Status: proposed.

## Goal

Support solo and solitaire game designs with first-class non-human actors and
deterministic automated action evidence.

BGG competition activity includes many solo and solitaire games. The framework
should not force authors to model automa behavior as a fake human player with
ad hoc UI and untestable side effects.

## In Scope

- Actor metadata distinguishing human seats from automa/bot actors.
- Solo setup profiles.
- Automa deck/table modeling helpers.
- Deterministic bot action transcripts.
- Runtime effects or reducer helpers for "resolve automated actor action".
- UI primitives for showing automated action summaries.
- Scenario assertions for automated turn transcripts.

## Out Of Scope

- AI opponents that make creative or model-generated choices.
- Online matchmaking bots.
- Product analytics for solo games.
- Full search/planning engines.

## Likely Touchpoints

- `packages/sdk-types/src/contracts.ts`
- `packages/sdk/src/reducer/authoring/*`
- `packages/sdk/src/reducer/core/*`
- `packages/sdk/src/runtime/types/plugin-state.ts`
- `packages/sdk/src/runtime/hooks/*`
- `packages/sdk/src/runtime/primitives/game.tsx`
- `packages/sdk/src/testing/reducer-scenario/*`
- Workbench fixture compiler and parity receipts.

## Design Requirements

- Automated actor behavior must be deterministic under scenario seeds.
- Bot/automa transcripts must be inspectable in tests and Workbench receipts.
- The model must not depend on external AI services.
- UI should explain automated actions as game events, not as host chrome.
- Human seat and automa identity must remain clear to generated UI and tests.

## Acceptance Criteria

- A solo reference game includes a non-human actor or automa process.
- Scenario evidence records at least one automated action transcript.
- The UI renders an automated action summary without custom framework glue.
- Replay with the same seed produces the same transcript and final projection.

## Suggested Verification

```bash
pnpm test
pnpm ui:runtime:test
pnpm ui:test --scenario <new-solo-automa-scenario-id>
pnpm ui:test:packed
```

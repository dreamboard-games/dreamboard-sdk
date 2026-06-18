# Phase 06: Microgame Reference Fixtures And Release Coverage

Status: proposed.

## Goal

Prove the framework capabilities with public-safe reference fixtures that match
the common competition game shapes surfaced by the capability ledger.

This phase turns the earlier API and primitive work into durable release
confidence. It should not introduce large new API surfaces unless gaps are
found while building the fixtures.

## Required Fixture Set

Add or promote public-safe reference fixtures for:

- A one-card or card-as-board game.
- A nine-card nanogame.
- An eighteen-card solo card game.
- A roll-and-write or flip-and-write game.
- A solo/automa game with deterministic automated action evidence.

Fixtures can be combined if one original game legitimately proves multiple
patterns, but the capability ledger must make that coverage explicit.

## In Scope

- Reference-game source under `examples/reference-games/`.
- Portable UI fixtures under `fixtures/ui/reference-games/`.
- Component-scenario index updates.
- Workbench scenario catalog updates.
- Runtime visual baselines where screenshots add confidence.
- Packed consumer proof updates.
- Release proof updates.
- Docs updates.

## Out Of Scope

- Public demo gallery registration.
- Marketing copy.
- Third-party game clones.
- Product submission flows.

## Acceptance Criteria

- Every required fixture is public-safe, mechanic-named, and not a commercial
  game clone.
- Each fixture installs the packed candidate SDK in consumer proof.
- `docs/ui-agent-iteration.md` and `docs/reference-games.md` reflect the new
  scenarios.
- The capability ledger marks the proven capabilities as supported or
  supported-but-limited with evidence links.
- Release proof includes the new fixture set or explicitly records which
  fixtures are optional follow-up and why.

## Suggested Verification

```bash
pnpm ui:fixtures:compile
pnpm ui:catalog:generate
pnpm docs:generate
pnpm reference-games:check
pnpm reference-games:test:packed --required
pnpm ui:check
pnpm ui:test:packed
pnpm ui:release-proof
```

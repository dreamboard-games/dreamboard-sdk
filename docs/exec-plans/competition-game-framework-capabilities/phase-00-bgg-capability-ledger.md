# Phase 00: BGG Capability Ledger And Scenario Taxonomy

Status: proposed.

## Goal

Create a repo-owned capability ledger that maps common BGG competition and WIP
game patterns to current SDK support, missing framework capability, Workbench
coverage, reference fixtures, and docs.

This phase is read-mostly and should not add new runtime behavior. It turns the
roadmap into an executable inventory so later agents can select work by
verified demand and coverage gaps.

## Inputs

- `docs/ui-agent-iteration.md`
- `docs/reference-games.md`
- `fixtures/ui/component-scenario-index.json`
- `packages/sdk/src/ui/components/index.ts`
- `packages/sdk-types/src/contracts.ts`
- Private Community Compass aggregate data when available

If the internal Community Compass database is unavailable, continue from the
snapshot summarized in this plan and mark the evidence as stale in the phase
closeout.

## Deliverables

- `docs/reference/competition-game-capability-ledger.md`
- A machine-readable companion, for example
  `docs/reference/competition-game-capability-ledger.json`
- Generated or manually checked links from the new ledger to current Workbench
  scenario IDs.
- A phase closeout artifact under
  `docs/exec-plans/competition-game-framework-capabilities/artifacts/`.

## Ledger Rows

Each row should include:

- Capability name.
- BGG signal category.
- Representative physical game shapes.
- Current SDK support.
- Missing SDK support.
- Current UI primitive(s).
- Required or optional Workbench scenario coverage.
- Reference fixture candidate.
- Verification lane.
- Release priority: P0, P1, P2, or deferred.

Minimum rows:

- Component inventory / physical constraints.
- Card-as-board / compact surface.
- Hidden/revealed/rotated/exhausted card state.
- Roll-and-write sheet.
- Markable grid.
- Track and counter sheet.
- Scoring breakdown.
- Tie-breaker metadata.
- Setup checklist.
- Phase-local rules guidance.
- Interaction help and disabled reasons.
- Solo/automa actor.
- Automa deck/table.
- Random seed replay.
- Area map / counter stack.
- Market / auction / trade proposal.
- Scenario golden final-score assertion.

## Acceptance Criteria

- The ledger can be read without access to prior conversations.
- Every P0/P1 gap has at least one proposed reference fixture or Workbench
  scenario.
- The ledger distinguishes "supported", "supported but unproven", and
  "missing".
- Product features such as BGG submission, sharing UX, and feedback dashboards
  are explicitly marked out of scope.

## Suggested Verification

```bash
pnpm docs:check
pnpm ui:catalog:check
```

# Competition Game Framework Capabilities

Status: proposed plan.

## Executive Decision

Dreamboard SDK should become capable of expressing the common game shapes that
BoardGameGeek competition and works-in-progress designers submit, without
turning this effort into a BGG submission product, judging workflow, CRM, or
playtester feedback application.

The framework goal is:

> A coding agent can implement most small BGG competition entries without
> inventing custom framework concepts for cards-as-boards, sheets, scoring,
> solo opponents, setup guidance, or compact mobile play surfaces.

This plan extends the existing UI Agent Iteration Workbench rather than
creating a second validation path. Every new capability must land with typed
authoring support, runtime descriptors where needed, SDK UI primitives,
Workbench scenarios, packed-consumer proof, and docs that are generated or
drift-gated where practical.

## Why Now

The current SDK already has a strong foundation for cards, hands, staging,
resources, costs, hex/square/track/network/slot boards, prompts, dice, shuffle
effects, runtime drafts, semantic browser interaction, and packed consumer
proof. The remaining release-readiness gap is not basic UI chrome. It is the
mechanic vocabulary needed by real competition designers.

The local Community Compass BGG snapshot in the internal monorepo currently
captures Board Game Creation forum activity across Works in Progress, Design
Contests, Seeking Playtesters, and related design subforums. A rough aggregate
of thread/post text signals from that snapshot showed:

| Signal                              | Threads |
| ----------------------------------- | ------- |
| Print-and-play / components         | 183     |
| Rules / rulebook clarity            | 125     |
| Contest / competition               | 122     |
| Map / board / area                  | 114     |
| Feedback / critique                 | 96      |
| Solo / solitaire / automa           | 55      |
| Online playable / digital prototype | 35      |
| Balance / math / probability        | 35      |

That evidence points at a framework roadmap centered on compact components,
rules clarity, score verification, sheet-style games, solo/automa behavior, and
mobile-friendly microgame layouts.

## Product Boundary

This is not a Contest Submission Kit product layer.

In scope:

- SDK authoring/runtime capability.
- Public SDK UI primitives.
- Generated UI contract and workspace-contract support.
- Reference games and Workbench scenarios.
- Deterministic tests, fixture receipts, packed consumer proof, and release
  proof.
- Docs that teach authors and coding agents the framework capability.

Out of scope:

- BGG-specific export, posting, submission, scraping, or judging workflows.
- Public sharing UX, playtester inboxes, or designer dashboards.
- CRM, community engagement, or private outreach features.
- Auto-generated forum replies.
- Product host chrome beyond what is required for parity proof.
- Reproducing third-party games, rulebooks, art, names, or trade dress.

## Relationship To Existing Plans

This plan builds on:

- [Agent-First Authoring DX And Runtime Consolidation](../agent-first-authoring-dx/README.md)
- [UI Agent Iteration Workbench And Reference Games](../ui-agent-iteration-workbench/README.md)

It must preserve the UI Workbench boundaries:

- Storybook owns pure presentation.
- The UI Workbench owns runtime-generated UI behavior.
- Browser semantic interaction stays in `@dreamboard-games/sdk/browser-interaction`.
- Packed consumer verification installs the candidate SDK artifact.
- Real-host parity remains owned by the internal repository.

## Target Capability Model

The SDK should expose one canonical path for each common competition-game need:

| Need                                              | Target framework capability                         |
| ------------------------------------------------- | --------------------------------------------------- |
| 1-card, 9-card, 18-card, mint-tin games           | Component inventory and microgame metadata          |
| A card that also acts as a board or state surface | Card-as-board and compact surface conventions       |
| Roll-and-write / flip-and-write games             | Sheet and markable-grid primitives                  |
| Clear scoring for contest judges and playtesters  | Scoring and end-condition contract                  |
| Rule clarity and valid-action explanation         | Phase guidance and interaction help metadata        |
| Solo and solitaire contests                       | Automa actor model and deterministic bot transcript |
| Agent implementation confidence                   | Reference fixtures and Workbench coverage matrix    |

## Phases

| Phase | Title                                                                                                              | Breaking?                  | Depends on            | Outcome                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------------------------ | -------------------------- | --------------------- | --------------------------------------------------------------------------------------------------- |
| 00    | [BGG capability ledger and scenario taxonomy](phase-00-bgg-capability-ledger.md)                                   | No                         | Existing UI Workbench | Repo-owned matrix mapping demand signals to SDK support and test coverage                           |
| 01    | [Component inventory and microgame metadata](phase-01-component-inventory-and-microgame-metadata.md)               | Additive                   | Phase 00              | Typed component inventory for cards, dice, tokens, sheets, tracks, and limited physical constraints |
| 02    | [Roll-and-write sheet primitives](phase-02-roll-and-write-sheet-primitives.md)                                     | Additive                   | Phases 00-01          | Sheet runtime/input/UI primitives for markable grids, tracks, and score sections                    |
| 03    | [Scoring and endgame contract](phase-03-scoring-and-endgame-contract.md)                                           | Additive                   | Phases 00-01          | Typed score breakdowns, tie-breakers, score previews, and final-score scenario assertions           |
| 04    | [Rules and phase guidance metadata](phase-04-rules-and-phase-guidance.md)                                          | Additive                   | Phases 00-03          | Framework-level setup, phase, interaction-help, and disabled-reason metadata                        |
| 05    | [Solo and automa runtime model](phase-05-solo-and-automa-runtime-model.md)                                         | Additive with runtime risk | Phases 00-04          | First-class non-human actor support, deterministic bot transcripts, and solo scenario proof         |
| 06    | [Microgame reference fixtures and release coverage](phase-06-microgame-reference-fixtures-and-release-coverage.md) | No public API break        | Phases 01-05          | Public-safe reference fixtures proving 1-card, 9-card, 18-card, roll-and-write, and solo patterns   |

Recommended execution order: **00 -> 01 -> 02 -> 03 -> 04 -> 05 -> 06**.

Phases 01-04 may be split further if implementation reveals cross-repo codegen
or private-contract changes. Phase 05 should not start until scoring and phase
guidance are usable enough to explain automated actions in scenario receipts.

## Capability Acceptance Bar

For a capability to count as release-ready, it must satisfy all of these:

- The authored API is typed and has one canonical path.
- Generated contracts carry any new runtime-facing fields.
- Host/API-client parsing does not strip the fields.
- Workspace-contract helpers expose ergonomic authoring/rendering hooks.
- SDK UI primitives render the capability without game-local wrappers.
- Storybook covers controlled presentation states.
- The UI Workbench covers at least one runtime scenario.
- Browser semantic interaction can resolve and perform the relevant input.
- Packed consumer proof installs the candidate SDK artifact.
- Docs explain when to use the capability and include a minimal example.

## Whole-Plan Definition Of Done

- `docs/exec-plans/competition-game-framework-capabilities/` has closeout
  artifacts for every completed phase.
- The capability ledger maps the top BGG competition patterns to explicit SDK
  support, Workbench scenarios, docs, and retained gaps.
- SDK authors can declare compact component inventories for microgames.
- SDK UI can render roll-and-write sheets, score breakdowns, setup guidance,
  interaction guidance, and solo/automa action summaries without game-local
  framework concepts.
- Workbench required or extended coverage includes public-safe fixtures for
  1-card, 9-card, 18-card, roll-and-write, and solo/automa patterns.
- Release proof can demonstrate the exact packed SDK artifact against those
  fixtures.
- No BGG-specific product feature, outreach workflow, or community automation
  is introduced by this plan.

## Default Verification Commands

Use the narrowest applicable lane during each phase, then close framework or UI
changes with the relevant aggregate gate.

```bash
pnpm check
pnpm ui:check
pnpm ui:runtime:test
pnpm ui:test:packed
pnpm reference-games:check
pnpm reference-games:test:packed --required
pnpm ui:release-proof
```

Cross-repo phases that add runtime fields consumed by the private host must also
run the matching internal repository verification lane documented in that
phase's closeout notes.

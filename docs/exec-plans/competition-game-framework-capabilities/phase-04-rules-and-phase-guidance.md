# Phase 04: Rules And Phase Guidance Metadata

Status: proposed.

## Goal

Add framework-level metadata for setup, phase guidance, interaction help, and
disabled-action explanations.

This addresses rules-clarity pain without building a product rules page. The
SDK should give authors a typed way to attach concise guidance to phases and
interactions, and give UI primitives a standard way to render "what can I do
now?" and "why can't I do this?"

## In Scope

- Setup checklist metadata.
- Phase summary metadata.
- Interaction help text.
- Disabled action reasons with stable error/rule identifiers.
- Runtime descriptors that carry guidance to generated UI.
- UI primitives for setup, phase help, and unavailable action explanation.
- Workbench scenarios proving guidance appears and remains accessible.

## Out Of Scope

- Full rulebook authoring or markdown CMS.
- AI rules explanation.
- BGG rule upload/export.
- Product onboarding flows.

## Likely Touchpoints

- `packages/sdk-types/src/contracts.ts`
- `packages/sdk/src/reducer/authoring/interaction.ts`
- `packages/sdk/src/reducer/authoring/phase.ts`
- `packages/sdk/src/runtime/types/plugin-state.ts`
- `packages/sdk/src/runtime/primitives/phase.tsx`
- `packages/sdk/src/runtime/primitives/interaction/*`
- `packages/sdk/src/ui/components/PhaseIndicator.tsx`
- `packages/sdk/src/browser-interaction/*`

## Design Requirements

- Guidance metadata must be short, structured, and optional.
- Disabled reasons should not be recomputed in the client.
- The API should integrate with typed error codes and interaction diagnostics
  from the Agent-First Authoring DX plan.
- Accessibility must be part of the Workbench proof, especially for disabled
  actions and phase guidance.

## Acceptance Criteria

- A reference game displays setup and phase guidance through SDK primitives.
- At least one unavailable interaction renders a stable reason and is covered
  by a Workbench semantic assertion.
- Guidance metadata survives generated contract, runtime frame, and host/API
  client parsing.
- Docs explain when to use guidance metadata versus ordinary authored UI text.

## Suggested Verification

```bash
pnpm generate:check
pnpm ui:test --scenario ui-scenarios.game-shell.desktop
pnpm ui:test --scenario ui-scenarios.prompts-choice.desktop
pnpm ui:check
```

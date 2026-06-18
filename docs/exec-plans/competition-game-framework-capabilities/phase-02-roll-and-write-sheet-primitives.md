# Phase 02: Roll-And-Write Sheet Primitives

Status: proposed.

## Goal

Add first-class framework support for sheet-style games: roll-and-write,
flip-and-write, markable maps, score sheets, and compact tracking boards.

This should be a framework capability, not a single game-local UI. Authors need
typed inputs, runtime descriptors, UI primitives, browser-interaction semantics,
and Workbench evidence.

## In Scope

- Sheet component and surface model.
- Markable grid primitives.
- Track and counter primitives for sheets.
- Mark states such as empty, checked, crossed, circled, numbered, and custom
  token-like marks.
- Draft-before-submit behavior for sheet edits.
- Dice-result-to-sheet-action examples.
- Runtime semantic effects for browser tests to resolve a sheet cell/track and
  apply a mark.
- Storybook and Workbench coverage.

## Out Of Scope

- Full drawing/canvas freehand input.
- PDF generation.
- OCR or image import from physical sheets.
- Product playtest feedback UX.

## Candidate Public UI Namespace

Exact naming should be decided during implementation, but the capability should
feel like a coherent namespace:

```tsx
<Sheet.Root>
  <Sheet.Section>
    <Sheet.Grid>
      <Sheet.Cell value="forest-1" />
    </Sheet.Grid>
    <Sheet.Track value="morale" />
    <Sheet.ScoreSection />
  </Sheet.Section>
</Sheet.Root>
```

## Likely Touchpoints

- `packages/sdk-types/src/contracts.ts`
- `packages/sdk/src/runtime/primitives/*`
- `packages/sdk/src/runtime/workspace-contract/*`
- `packages/sdk/src/ui/components/*`
- `packages/sdk/src/browser-interaction/*`
- `packages/sdk/src/testing/ui-scenario/*`
- `fixtures/ui/reference-games/*`
- `docs/ui-agent-iteration.md`

## Reference Fixture

Add a public-safe roll-and-write microgame fixture. It should include:

- A dice or random result.
- A markable grid.
- At least one track.
- A score section.
- Drafted marks before submit.
- Final score assertion.
- Mobile viewport proof.

## Acceptance Criteria

- Authors can define sheet targets without hand-writing custom DOM selectors.
- Browser interaction resolves a sheet mark semantically.
- Workbench evidence records draft, submit, projection, semantic, and visual
  results for the sheet scenario.
- The sheet primitive is usable in a packed consumer.

## Suggested Verification

```bash
pnpm ui:storybook:build
pnpm ui:test --capability runtime-draft
pnpm ui:test --scenario <new-roll-and-write-scenario-id>
pnpm ui:test:runtime-visual
pnpm ui:test:packed
pnpm ui:check
```

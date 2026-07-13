# UI Workbench Behavioral Proof

The UI Workbench is useful when it is treated as an executable behavioral proof
surface, not as a screenshot gallery. Screenshots support the evidence, but the
claim is earned by replay steps that resolve semantic browser requests, perform
physical browser actions, flush the host, and compare measured digests.

## What The Workbench Should Prove

- A scenario capability must come from an executable replay recipe. Do not add
  capability tags from descriptive metadata alone.
- A screenshot can show what changed visually, but it does not prove the user
  behavior by itself.
- Every claimed interaction should have a replay step that performs the
  physical browser action a user would perform.
- Expected projection, semantic, draft, and submission digests should be
  independently measured from the same path the browser replay uses.
- Runtime visual baselines may block on screenshots for a small set of stable
  composed states. They complement replay evidence; they do not replace
  semantic, projection, draft, or submission digest checks.

## Card Selection Scenarios

For card selection scenarios, model the behavior explicitly:

- one semantic replay step per selected card;
- a final commit or submit step;
- intermediate screenshots that show staged/selected state;
- final projection, semantic, and submission digests.

For example, `hearts.sealed-pass.mobile` must not prove a sealed pass by only
clicking its submit button. Its executable replay recipe selects three concrete
card actuators before committing. Treat the generated step IDs as local
materialized output, not a second authored scenario API.

## Mobile Touch Targets

Mobile and touch scenarios must use non-overlapping physical targets. A replay
step that says it selected one card must not depend on a dense fan or docked
tray where a single tap can hit multiple interaction layers.

When a card is rendered as an `Interaction.CardInput` inside a hand/grid cell,
watch for two independent gesture paths:

- the semantic button's own click handler;
- the parent hand cell's pointer gesture handler.

A single physical tap must produce one semantic mutation. If the nested button
is the semantic actuator the replay resolves, prevent its pointer/click/key
events from also bubbling into the parent hand gesture layer.

## Expected Evidence Path

Generated fixture expectations should be produced through the same actuator
path the browser replay uses. Do not generate expected commit evidence with a
shortcut runtime submit if the Workbench will click a DOM submit actuator.

When replay behavior looks surprising, inspect the semantic browser snapshot
before changing digests:

- duplicate interaction roots;
- duplicate actuators for the same interaction;
- stale draft state after submit;
- actuator identity mismatches;
- missing or over-broad semantic effects.

The Workbench is most valuable when it catches these differences before they
become product UI bugs.

## Runtime Visual Baselines

Use `pnpm ui:test:runtime-visual` when a change affects composed runtime layout
that a semantic digest cannot judge visually. The baseline set is intentionally
small and pinned to stable projects:

- Hearts phone layout after three cards are selected;
- Hex route placement after the route draft interaction;
- Worker placement after the form draft interaction;
- one prompt validation composition;
- one board targeting composition.

Update snapshots only with `pnpm ui:test:runtime-visual:update`. If a visual
baseline fails, keep the replay receipt separate from the screenshot review:
the replay tells you whether behavior still matches the fixture, while the
baseline tells you whether the composed runtime surface still looks intentional.

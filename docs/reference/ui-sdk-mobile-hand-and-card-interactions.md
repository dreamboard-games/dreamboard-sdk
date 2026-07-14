# Mobile Hand And Card Interactions

The SDK keeps hand layout, pointer recognition, drag lifecycle, and runtime
submission as separate responsibilities. This preserves usable touch targets
without making a presentational component depend on Dreamboard runtime state.

## Ownership

- `HandView` is controlled presentation. Callers provide cards, visual state,
  card rendering, layout policy, and an intent handler.
- `CardDragSurface` owns drag lifecycle, overlays, drop-target registration,
  and the final opaque `drop` intent.
- The runtime adapter translates `activate` or `drop` intents into Dreamboard
  submissions. `HandView` does not submit commands itself.
- Generated `UI.Root` composition provides the mobile hand tray context. Games
  should use the generated hand surface rather than creating a parallel tray.

## Layout Selection

`HandView` supports `fan`, `compressed-fan`, `strip`, and `tray`. Selection is
based on measured target exposure, not a device-name breakpoint:

1. Use the desktop preference when every card retains a comfortable visible
   slice.
2. Use `compressed-fan` when a fan still exposes at least the compressed slice.
3. Fall back to the caller's mobile mode when targets would become too dense.

The default fan geometry is:

| Mode             | Minimum visible slice | Maximum angle | Arc depth |
| ---------------- | --------------------: | ------------: | --------: |
| `fan`            |                  64px |            5° |      12px |
| `compressed-fan` |                  44px |            4° |       8px |

These values are exported through the hand layout helpers and covered by unit
tests. Change the implementation and this reference together.

## Interaction Policies

`direct-activate` treats a clean tap or keyboard activation as one `activate`
intent. `drag-to-target` uses pointer or keyboard lift to enter the surrounding
`CardDragSurface`; a tap only enters inspection and does not commit a command.

The deterministic pointer recognizer uses these defaults:

| Threshold           | Default |
| ------------------- | ------: |
| Press preview delay |   220ms |
| Movement slop       |     8px |
| Axis bias           |    1.25 |
| Drag lift distance  |    28px |

Horizontal movement yields to hand browsing. An eligible upward gesture that
crosses the lift distance begins dragging. Disabled cards do not start pointer
recognition. Cancellation must release pointer capture, scroll locking, preview
state, and any active drag.

## Nested Gesture Invariant

One physical action must produce one semantic mutation. When an interactive
card is nested inside a hand cell, the card actuator must prevent its pointer,
click, and keyboard events from also activating the parent hand gesture path.
Browser evidence must resolve the semantic actuator before performing the
physical action and compare the measured result afterward.

## Motion And Accessibility

Animations must use the theme motion contract and must not change projection,
semantic, draft, or submission digests. Preserve focus visibility, keyboard
activation, readable card labels, safe-area tray padding, and non-overlapping
touch targets. Runtime fixture compilation forces reduced motion; visual motion
belongs in Storybook and deterministic visual tests.

## Verification

Use the narrowest relevant checks while iterating:

```sh
pnpm ui:test --component HandView
pnpm ui:test:visual
pnpm ui:test:changed --base origin/main
```

Changes to pointer semantics, browser interaction, or digest evidence require
the full UI suite documented in `AGENTS.md`.

# Mobile hand and card interactions

The SDK separates hand layout, pointer recognition, drag lifecycle, and runtime
submission. This keeps touch targets usable without coupling presentation to
runtime state.

## Ownership

- `HandView` is controlled presentation. Callers provide cards, visual state,
  rendering, layout policy, and an intent handler.
- `CardDragSurface` owns drag lifecycle, overlays, drop-target registration,
  and the final opaque `drop` intent.
- The runtime adapter translates `activate` and `drop` intents into
  submissions. `HandView` does not submit commands.
- Generated `UI.Root` composition provides the mobile hand tray context. Games
  should use that surface instead of creating another tray protocol.

## Layout selection

`HandView` supports `fan`, `compressed-fan`, `strip`, and `tray`. Selection is
based on measured target exposure rather than a device-name breakpoint:

1. Use the desktop preference while every card has a comfortable visible slice.
2. Use `compressed-fan` while the compressed slice remains available.
3. Fall back to the configured mobile mode when targets would be too dense.

| Mode             | Minimum visible slice | Maximum angle | Arc depth |
| ---------------- | --------------------: | ------------: | --------: |
| `fan`            |                  64px |     5 degrees |      12px |
| `compressed-fan` |                  44px |     4 degrees |       8px |

These values are exported by the hand-layout helpers and covered by unit tests.
Update this reference with intentional implementation changes.

## Interaction policies

`direct-activate` treats a clean tap, click, or keyboard activation as one
`activate` intent. `drag-to-target` uses pointer or keyboard lift to enter the
surrounding `CardDragSurface`; a tap enters inspection without committing a
command.

| Threshold           | Default |
| ------------------- | ------: |
| Press preview delay |   220ms |
| Movement slop       |     8px |
| Axis bias           |    1.25 |
| Drag lift distance  |    28px |

Horizontal movement yields to hand browsing. An eligible upward gesture that
crosses the lift distance begins dragging. Disabled cards do not begin pointer
recognition. Cancellation releases pointer capture, scroll locking, preview
state, and active drag state.

## One-action invariant

One physical action must produce one semantic mutation. An interactive card
nested inside a hand cell prevents its pointer, click, and keyboard events from
also activating the parent gesture path. Browser tests resolve the semantic
actuator, perform the physical action, and compare measured state afterward.

Touch-capable Playwright projects use `tap()`; desktop projects use `click()`.
The browser-driver suite covers pointer and touch drag, while the keyboard suite
covers lift, traversal, commit, and cancellation.

## Motion and accessibility

Animations use the theme motion contract and must not change projection,
semantic, draft, or submission state. Preserve visible focus, keyboard
activation, readable labels, safe-area padding, and non-overlapping touch
targets. Reduced-motion and Axe assertions run in the behavioral tests;
Storybook owns tracked visual baselines.

## Verification

Use one scenario while iterating, then the aggregate UI gate:

```sh
pnpm ui test --scenario roll-and-write-scorecard.mark-cell.mobile
pnpm ui test
```

Run `pnpm ui test --all` after shared pointer, semantic, fixture, or interaction
changes. Use `pnpm ui snapshots update` only when intentionally changing
Storybook visuals.

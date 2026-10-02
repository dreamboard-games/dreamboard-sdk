# interaction-form

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/interaction-form
```

An interaction's current step with readable labels, steppers and choice chips.

Workspace-bound headless UI; copied source owned by the game.

Hosted-safe control; the game binding imports reducer types only.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`InteractionForm` requires a typed interaction key and renders that interaction's current step, then its [actions](actions.md).

- Labels read as words: `targetPlayerId` becomes "Target player". `labels` replaces any of them by input key.
- Numbers and resource amounts use steppers: − and + around a field that can also be typed, each at least 44 px. A resource shows its icon and label.
- Choices are chips that show whether they are picked.
- A later step shows "Step 2 of 3" and the choices the server saved, in words rather than raw values.
- `renderInput` replaces one input, such as a board field with a board hint; return `undefined` to keep the default.

Resource maps keep partial edits; Continue submits only the current step. Cancel clears the server's saved choices; Reset selection clears local ones.

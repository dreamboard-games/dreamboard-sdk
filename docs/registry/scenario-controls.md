# scenario-controls

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/scenario-controls
```

Local-only scenario source controls.

Local development helper; do not import executable game code in the hosted entry.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`ScenarioControls` requires scenarios, players, me and onSeatChange/onCheckpoint/onRestore callbacks. It selects a local scenario via URL, switches selected seats, and saves/restores JSON. Checkpoint data may contain hidden state: mount only in the local developer entry.

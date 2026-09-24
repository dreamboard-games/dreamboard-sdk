# interaction-form

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/interaction-form
```

Workspace-bound headless UI; copied source owned by the game.

Local development helper; do not import executable game code in the hosted entry.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`InteractionForm` requires a typed interaction key. renderInput may override a current input, returning undefined for the default renderer. Saved server choices render separately. Resource maps preserve partial local edits; Continue submits only the current step. It composes Actions, including authoritative cancel and local reset.

# dice

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/dice
```

Pure, composable dice presentation. No SDK dependency.

Pure display item; no SDK runtime or provider dependency.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`Dice` takes entries with id/value/label. It only displays supplied outcomes; rolling and optional animation belong to the application.

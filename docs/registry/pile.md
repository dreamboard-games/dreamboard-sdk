# pile

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/pile
```

Pure, composable pile presentation. No SDK dependency.

Pure display item; no SDK runtime or provider dependency.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`Pile` takes `count`, `label` and optional top-card children. It shows an explicit empty state at zero and keeps the count in a figure caption.

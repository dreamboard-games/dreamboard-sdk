# standings

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/standings
```

Pure, composable standings presentation. No SDK dependency.

Pure display item; no SDK runtime or provider dependency.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`Standings` requires caption and supplied id/rank/name/score entries; scoreLabel is optional. It preserves supplied ordering and tied ranks instead of inferring a winner.

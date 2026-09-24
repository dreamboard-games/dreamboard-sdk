# players

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/players
```

Pure, composable players presentation. No SDK dependency.

Pure display item; no SDK runtime or provider dependency.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`Players` takes display entries with id/name/seat and optional status/detail. Seat is a display token from1 through6; map authoritative roster order explicitly.

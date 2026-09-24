# event-log

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/event-log
```

Pure, composable event log presentation. No SDK dependency.

Pure display item; no SDK runtime or provider dependency.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`EventLog` takes id/summary/detail entries and an optional emptyMessage. It does not accumulate events or announce historical items automatically. The headless events.recent value is one public batch, so choose explicitly whether the app keeps display history.

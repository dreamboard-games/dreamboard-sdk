# resources

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/resources
```

Pure, composable resources presentation. No SDK dependency.

Pure display item; no SDK runtime or provider dependency.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`Resources` takes entries with id/label/count and optional icon. It displays a description list; editing and affordability rules belong elsewhere.

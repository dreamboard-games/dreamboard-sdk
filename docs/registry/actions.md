# actions

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/actions
```

Workspace-bound headless UI; copied source owned by the game.

Hosted-safe control; the game binding imports reducer types only.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`Actions` requires a typed interaction key and optional className. It renders current Submit/Continue, server Cancel when canCancel, and local Reset selection. Global request/connection state disables handlers consistently. Rejected cancel results and transport failures go to the instance onError callback.

# card-table

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/card-table
```

Wrap the game table in `CardTable`, inside its `GameProvider`. Include its hands,
draw piles and table card destinations. The wrapper uses `display: contents`, so
the game keeps ownership of layout.

`CardTable` applies the user's reduced-motion preference to every card destination,
preview and portal. It coordinates a draw's release position with the card that
arrives in the confirmed frame. This hint contains zone IDs and a rectangle, never
a concealed card ID. Hints expire after the next frame commit.

```tsx
<GameProvider source={source}>
  <CardTable>
    <GameTable />
  </CardTable>
</GameProvider>
```

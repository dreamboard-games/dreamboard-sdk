# tokens

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/tokens
```

Dreamboard visual tokens and component styles.

Pure display item; no SDK runtime or provider dependency.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

The stylesheet defines the game's visual tokens and scoped `db-*` classes; components import it where needed. Override the variables in your application stylesheet:

- Table: `--table` (terracotta `#a34f36`), `--table-foreground` (ivory, 5.4:1 on the table) and `--brand` for accents. `.db-table` paints a surface with them, and its buttons turn ivory with dark text, or ivory-outlined.
- Cards: one width per place, `--card-w-hand`, `--card-w-table`, `--card-w-opponent`, `--card-w-pile` and `--card-w-preview`, sized by the viewport's shorter side. Each place sets `--card-w` for the cards inside it. `--card-aspect` matches your card art.
- States: `--playable`, `--selected` and the `--dimmed` filter.
- Elevation: `--elevation-rest`, `--elevation-lift` and `--elevation-drag`.
- Motion: `--duration-quick`, `--duration-base`, `--duration-shake` and `--ease-out`; `cardSpring` in `card.tsx` is the matching Motion spring.
- Type: `--text-caption` to `--text-display`.
- Seats: `--seat-1` to `--seat-6`, each at least 3:1 against the table, selected with `data-seat`.

State styling uses the separate `translate`, `rotate` and `scale` properties, so it never fights a Motion transform. With reduced motion, shakes and transitions stop.

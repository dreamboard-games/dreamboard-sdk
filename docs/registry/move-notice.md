# move-notice

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/move-notice
```

Short notices of other players' moves, marked with their seat colour. No SDK dependency.

Pure display item; no SDK runtime or provider dependency.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

Render `MoveNotices` once in the game, then call `showMoveNotice(text, { seat })` when another player's move should be noticed, such as "Mina played the 7 of clubs". Up to three notices stack at the top of the screen and each leaves after two and a half seconds. They are announced politely to screen readers in a region named "Moves". `MoveNotices` accepts [Sonner](https://sonner.emilkowal.ski/) `Toaster` props to change position, duration or count.

The game decides what to announce, because only it knows what a move means. Compare the view before and after a move, or use a card's `getOrigin()` to name the player a card came from. Announce other players' moves only; the player already sees their own.

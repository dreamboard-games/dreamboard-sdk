# Automa River Rival

River Guild is a compact cooperative market game that demonstrates a
deterministic rival without adding a fake player, seat, actor, or session
identity.

Players claim cargo from a public river. After the last human acts, the reducer
reveals a rival instruction, resolves it against ordinary game state, emits
system-action events, refills the river, and advances the round.

Smallest proof:

```sh
node examples/reference-games/automa-river-rival/scenarios/verify.mjs
```

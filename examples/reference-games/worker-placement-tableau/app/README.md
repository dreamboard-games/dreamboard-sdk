# Mosaic Workshop reducer

`game-contract.ts` owns the compact public state. `phases/placement/index.ts`
owns the two canonical interactions: atomic `placeWorker` and
`passPlacement`. Rule helpers under `rules/` own worker occupancy, craft
domains, adjacency, and scoring. Cleanup and scoring are automatic phases and
never invent a system player.

The exchange `give` and `receive` maps are validated together by the
interaction. The current SDK cannot use a resource-map collector as another
collector's progressive dependency, so the receive field is bounded to the
exchange total range and final action discovery filters complete assignments
through authoritative validation.

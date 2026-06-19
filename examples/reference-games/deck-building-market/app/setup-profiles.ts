import { dealToPlayerZone, setupProfiles } from "../shared/manifest-contract";

// The default `setup` phase's `enter` reducer does the normal starter dealing
// imperatively so per-player operations can use the reducer transaction directly. The
// regression profile below uses bootstrap only to materialize a depleted supply
// pile before setup enters.
export default setupProfiles({
  "default-setup": {},
  "empty-masterpiece-regression": {
    bootstrap: [
      dealToPlayerZone({
        from: { type: "sharedZone", zoneId: "supply-masterpiece" },
        zoneId: "discard",
        count: 4,
      }),
    ],
  },
});

# Phase 07 Workbench, Demo, And Cross-Repository Cutover Receipt

Recorded: 2026-07-13 (Australia/Sydney)

Status: **complete for local and packed-public scope**. The derived-free SDK,
local demo, landing, browser, replacement perf, immutable public authoring
tuple, internal repin, and internal package gate pass. Staging and production
were not run and are not implied by this receipt.

## Source And Package Identity

| Input                           | Identity                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| SDK public package source       | `a4b575437bbe79ecc95735c54cda51e197db7d60`                                                        |
| SDK integrated reference source | `006467423597b5ef9d883201013b2ca90bf1b5bd`                                                        |
| Public Dreamboard source        | `1b30dd40c94a25fc74a798b94e69532861084f2c`                                                        |
| Internal integration source     | `628095d71b0c88f9eae19a173b789c1cf55b508b`                                                        |
| SDK package                     | `@dreamboard-games/sdk@0.4.0-alpha.9`                                                             |
| SDK tarball SHA-256             | `cb962b14d5e4efdd6309a5fbd8d016b2f23dc9b815730c5e2aa3eb19a44bbf30`                                |
| npm integrity                   | `sha512-VD198fMcKQEKLP5Sn8Sc1Jcnj+9HRerusWPkqSEH3i0dIj0MATY06GUOB0Ll7ZeoNHxE6PYMvsCJWwBOe+rofg==` |
| npm shasum                      | `f80fdcc34c4166eab01b014ad6498ab90e2455d7`                                                        |

All nine isolated package/lock pairs resolve that exact SDK version and npm
integrity. No workspace or sibling-checkout dependency was accepted.

## Derived-Free Source And Admission

Commit `2288f89` deletes exactly 229 derived paths: 76 workspace-codegen
outputs, 76 generated test outputs, 12 bases, 11 obsolete screenshots, 53
checked Workbench fixture files, and one checked Workbench catalog. The strict
integrated inventory is:

| Category  | Paths |  Lines |     Bytes |
| --------- | ----: | -----: | --------: |
| Total     |   526 | 47,475 | 1,612,766 |
| Authored  |   517 | 33,794 | 1,099,273 |
| Locks     |     9 | 13,681 |   513,493 |
| Forbidden |     0 |      0 |         0 |

Inventory digest:
`sha256:51f68cd46857ed906b579cd23682e777755de1412b6302c6e89b3239014dcf2b`.

The disposable candidate retained the canonical Git origin and applied the
same 229-path deletion before integration. The internal compiler then admitted
the ordinary integrated Git archive, verified the strict source manifest,
materialized SDK-owned outputs in isolation, and compiled all nine bundles.
`sourceFingerprint` remained the admitted authored-source identity while each
`bundleFingerprint` also bound the exact SDK, compiler, generated outputs, app,
and UI inputs.

## Local Release And Browser Proof

Local publication passed with:

- release digest
  `sha256:54f6d64aea4181560db0fadf5288cfaae659837ea74941a83420e156837ce3b0`;
- manifest SHA-256
  `e54ee2c6ebb12def8010102187255f7800cc41b45ec0710a7c3b2bdd40ba90f8`;
- input digest
  `sha256:a4a21f5aece599e0c7a0b7514216a3378e059d6cd082f5b755d402eb9472a156`;
- nine demos, 45 objects, and 20,672,095 published bytes; and
- common source fingerprint
  `8f7b177dee1d9dfef884c77515e5d25af005f3762bce8d2acf48d5e10feb26cb`.

The post-retirement `demo-release verify-browser --all-active` run passed at
`2026-07-13T05:52:15.245Z`. Exactly nine active slugs reached the authored
`given` developed checkpoint, produced identical reconnect projections, and
then reached a terminal outcome with no available interactions. The run also
exercised every declared desktop/mobile surface and verified the immutable
release-backed thumbnail for every game.

| Stable slug                    | Bundle fingerprint                                                 | Thumbnail SHA-256                                                  |
| ------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `automa-river-rival`           | `7d7e7ea45dfddbcd6e6805a2d3686f52f8afdca64739f094bd592cdcf0a9147c` | `5aa0ea05ba64ed140b963a38bef190a695c4506f62d115331dd33571bff382b9` |
| `deck-building-market`         | `0c3a7d4b4765d2cfc81e6e9782ab8d1eab4302e1dfd4ee8bcee15bb2e171f64c` | `5e3abd33250456be10667963bc41be68295f2b2904f96afbbef55f4cb423cd1d` |
| `hearts`                       | `2dcc3f175424e11dd355ddb2c5969c52eb1232e05b3a8ff6c1ee037abc4780be` | `e020aa6ed01986c611c783f843442544888c94edf96b5e33fd4656687bb22891` |
| `hex-network-trading`          | `b1647486c257f8a90a55e771f139085273af7ceed2d438efb7dd76d059b76a54` | `33d15c74da1397f830864eb85478ef7d41c32427df616eaee77facd07a311d80` |
| `multiplayer-ranking-and-ties` | `7d44e7ef3a81c14a119d02400336f70d1cd10ebc8a501af6f283e86434134bd2` | `448dbbb5268586400d898dfffe8367895022edbf7b3688aeeb5635fa2cf4664b` |
| `roll-and-write-scorecard`     | `eef630da32c20f928fc82952d564d6e01b8e3ae7e07d8d97f5191905adce4f06` | `0fa513a7012efbbe66588c559ab12252d52c22b2a029b7e3d7f12db5d2584380` |
| `simultaneous-card-drafting`   | `ac37df5a9493f993d8bcd9c66bdea9d2310ec5dce30e1d8e39710043899fcc6e` | `640541998bb270d48c17401883134eb290ac5947cdc5565fec1473b9a55d130c` |
| `solo-countdown-puzzle`        | `01df0ce184e3d24ee647f7b08a616ec9f80a12e6cd6bdb8c2f7fa28e5c703b5e` | `1a7e43545bd4f4041b544e196c2f05f11867fcbeca994d57a3d6c75a979d6e77` |
| `worker-placement-tableau`     | `b2da0b464ce8d733578c24c70a360518fa8e71c280cba3e51dcca4ea1acc8eac` | `16d06286fc5b804eb45d8b61cc431a73dfbb3a56ae9bf10c50aa26be47876b66` |

The product-owned landing order also passed independently:

1. `hex-network-trading`
2. `hearts`
3. `deck-building-market`
4. `worker-placement-tableau`
5. `simultaneous-card-drafting`

## Private Authoring Retirement And Successor Perf Proof

Internal commit `c33931f94` removes the private scenario-author package,
scenario-runtime, authored browser-demo scenario contract, checked internal
golden fixtures, and private perf regeneration branches. The retained perf
surface consumes SDK-compiled scenarios or normalized websocket replays.

Post-retirement proof passed:

- scenario-author hard-cut, dependency-state, and dev-lane guards;
- perf typecheck after generating ignored private-contract build output;
- 298 perf tests with zero failures;
- perf lint with zero errors (218 pre-existing warnings); and
- one-VU local-AWS `stormtrail-trade-reject` replay: 11 accepted commands, one
  measured sample, zero failed VUs, zero Artillery errors, zero backpressure
  retries, and p50/p95/p99 of 16.6 ms.

The narrow internal SDK alpha.9 frame adapter is intentionally temporary. It
adds the alpha.9-required `sharedView` only after the current host frame passes
its own strict validation and immediately before the iframe postMessage. Plan
002 replaces the duplicate host contracts with the SDK subpath and removes the
field in protocol v4. Local-AWS-only actor/deadline allowances are likewise
marked with explicit removal conditions; staging and production profiles were
not changed.

## Packed Public Authoring Release Proof

The immutable public authoring tuple is:

| Package                        | Version           | Tarball SHA-256                                                    | npm integrity                                                                                     |
| ------------------------------ | ----------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `@dreamboard-games/cli`        | `0.1.30-alpha.44` | `6d7d8cbdad7db4935c1818464248cd39eb07f8e01921a5fcb06f6a59a52a231b` | `sha512-wk5AApMDE7OS9lHyPzMCJbUwm6/7xFd7ofHzYyeDGZVmDEw3Uyuxt1TSSc+eVmfz2HAMezsQ41iswJ/OqP9zwQ==` |
| `@dreamboard-games/sdk`        | `0.4.0-alpha.9`   | `cb962b14d5e4efdd6309a5fbd8d016b2f23dc9b815730c5e2aa3eb19a44bbf30` | `sha512-VD198fMcKQEKLP5Sn8Sc1Jcnj+9HRerusWPkqSEH3i0dIj0MATY06GUOB0Ll7ZeoNHxE6PYMvsCJWwBOe+rofg==` |
| `@dreamboard-games/api-client` | `0.3.0-alpha.4`   | `81808ca92eb66bde8aef52e93452efa3ef066ebb57232cb7a8a903488172ea4c` | `sha512-krDow9P1hFcsnl4fa8ptM+iwMjwcGSI/gxP2FhVn8LIUfPGovLhERvmeIFboJUA9jFImWEnT3cEinikuVagUUA==` |
| `@dreamboard-games/dev-host`   | `0.1.30-alpha.28` | `83d8722a791f72a5e51d9e47324f60a456d604623cd2eb3aa894b0de58452277` | `sha512-yad4pzk4XcXzpQjqxxqG9oVIbdnUUKDEoaExhDk5I/VOQ/wNbU4LwJUMgmFgMthslT8mLa0PB9IUMMlFTyIV3A==` |

The tuple's release-set ID is
`sha256:b772236f87619a0cd1f215cc50ff372ebbff39a686361736ec88eefa6198b3c4`.
The packed compatibility receipt is retained at
`/Users/mac/code/dreamboard/build/authoring-compatibility/2026-07-13T07-07-21-3NZ/receipt.json`
with SHA-256
`d50e7b58f38de52d1e6829b59e7e633ae6d23a194715ac66f0194ddbc90ada6d`.
All nine checks passed: public registry metadata and tarball bytes, release-set
identity, pre-install scaffold, frozen install and integrity, project-local
adapter, manifest conformance, deterministic generation, generated workspace
typecheck, and packed reducer scenarios.

Internal `pnpm repin authoring <receipt>` accepted that exact release set. The
subsequent `pnpm verify:package` gate passed and retained
`build/verification/2026-07-13T07-33-46-445Z-cd6c5bfb/package/receipt.json`
(SHA-256
`552cc35b247a6825bd85dbb5135b236ee36ad87cae713ba1120d6b58d46ac2a1`).
The internal integration source closes at
`628095d71b0c88f9eae19a173b789c1cf55b508b`.

Registry metadata marks `@dreamboard-games/api-client@0.3.0-alpha.4` as
deprecated because its generated API surface was mismatched. That immutable
artifact is nevertheless the exact byte-proven member of this passing tuple;
the deprecation is a release-hygiene follow-up requiring a coordinated
successor tuple, not a reason to rewrite or invalidate this receipt.

## Environment Boundary

All runtime evidence in this receipt is local or packed-public-artifact proof.
Staging and production publication, mutation, and browser proof were **not
run** and are not implied by this receipt.

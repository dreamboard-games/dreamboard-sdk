# Headless delivery receipt

The accepted design in [README](README.md) is the implementation authority.
The historical design sketch is not a compatibility contract.

## SDK

The 21-layer SDK stack (PRs #26, #27, and #29–47) landed at
`1d193929897aa0103c90313211b41a6b91579dd3`. The protected
[release workflow](https://github.com/dreamboard-games/dreamboard-sdk/actions/runs/36010411446)
published [SDK 0.5.0-alpha.3](https://github.com/dreamboard-games/dreamboard-sdk/releases/tag/v0.5.0-alpha.3),
with reducer ABI `0.6.0`. Registry integrity matched the workflow's own verified
candidate, rather than a separately rebuilt local artifact:

```text
sha512-JRpfYTmjA89ctiM9YdKwL6BHAJPXpF9uB+BHK519Hc6rwGVf0SmgHG7qPbtake29PzXpGfmAwTN5cwBuieqkOw==
```

Verification included 560 SDK tests; positive and negative declaration proofs;
one packed artifact installed through all four facades and into Hearts, Hex,
and the template; real shadcn installation of pure and bound registry items;
62 Storybook renders; four Hearts and 18 Hex browser cases across desktop,
keyboard, touch, and accessibility; API documentation checks; and type-performance
budgets. Every implementation PR's exact head had successful hosted checks and
no unresolved review threads before the stack merge.

The final review also closed two concrete gaps: the Hex trail log is keyboard
scrollable, and candidate scenarios execute the exact production reducer bundle
whose bytes were admitted, rather than rebuilding another executable from the
authored definition. A deliberately wrong compiled reducer is rejected by the
verification proof.

## Public tools

Public PRs #26–27 migrated retry admission, workers, UI sources, initialization,
checkpoints, examples, and authoring guides. PR #29 fixed hydration of image URLs
inside encoded visible-card data and proved image loading and seat privacy in
both browser engines. PR #30 regenerated the public API snapshot from the
internal owning export pipeline. PR #32 supplied the repository metadata required
by npm provenance verification. API-client source was synchronized in PR #30;
that package was not published as part of the runtime/dev-host cohort.

The public cohort uses SDK `0.5.0-alpha.3`, browser runtime `0.1.0-alpha.2`, and
dev-host `0.2.0-alpha.2`, with exact transitive versions. The
[publication workflow](https://github.com/dreamboard-games/dreamboard/actions/runs/36015408513)
built and verified its candidate from
`d8adbdac779b1e2148af6ac3b5fbe1f70f71c2dd`. Both packages are visible on npm;
their registry integrity matches the original workflow candidate exactly:

```text
browser-gameplay-runtime@0.1.0-alpha.2
sha512-wf4LodP50p4W186U5s2IAj7aD6uOS8CAK3nh0mohw5olhCWDwzYxYdhEQN4qLjz4/YtzqN1eLU7klTm2w/xHlA==

dev-host@0.2.0-alpha.2
sha512-umm8cSynTJ59PhmJTDowhUrL6tysVG0GwK8pWZMg1dSmjyHmIZMPYPk74tk8QFE2dIlIcSAxLBo/CTJWPZfE2Q==
```

The initial post-publication check ran before npm's scanning made the versions
readable. The successful recovery reused the original verified artifacts, never a rebuilt
candidate. Merged PR #33 adds a bounded wait for missing registry metadata; a visible
hash mismatch remains immediately fatal.

The public package gate covers 26 runtime browser cases, three dev-host cases,
release-candidate validation, generated API checks, and installation of the exact
candidate into a clean consumer in Chromium and WebKit. The publication path
retains provenance, source identity, and tarball integrity checks.

## Internal adoption

[Internal PR #531](https://github.com/dreamboard-games/dreamboard-internal/pull/531)
removes dead Kotlin reducer contracts. Its dependent
[PR #545](https://github.com/dreamboard-games/dreamboard-internal/pull/545)
migrates canonical schemas, gameplay transport, compiler/scaffold sources, host
state, initialization options, performance tooling, installed package pins, and
active authoring guidance. Both landed through stack #546 at
`35476cc9ee24017968afe51b4a48ddda1e161edf`. The landed tree matches reviewed
head `b6608674378b98d0faa5eb9f7df3f0c081351345` exactly. Both PRs were mergeable
and had no unresolved review threads. Internal hosted CI runs on main or manual
dispatch; no pre-merge hosted-check result is claimed. The post-merge
[CI run](https://github.com/dreamboard-games/dreamboard-internal/actions/runs/36020318649)
could not start any job because GitHub reported failed account payments or an
exhausted spending limit. This is an account prerequisite; the complete local
check and integration receipts above remain the execution evidence.

The options migration preserves existing option values while removing setup
profiles. Disposable PostgreSQL validation and preservation checks passed.
The real Kotlin scaffold compiles against the published SDK, and the compiler's
dependency-closure gate passes.

The committed-step integration test uses an actual compiled SDK game through
S3, JWT admission, a Deno worker, PostgreSQL, and the websocket service. It proves
private seat selections, prefix persistence through process death, exact retry
deduplication, complete state/RNG rollback after final rejection, cancellation,
checkpoint restoration with a fresh revision, stale-intent rejection, and fresh
completion. The isolated stack also proves initialization options through the
lobby, durable row, and serialized reducer runtime.

Verification receipts in the internal adoption checkout:

- Browser host: `build/verification/2026-09-24T14-44-44-664Z-43d8d9b8/browser/receipt.json`.
- Isolated stack: `build/verification/2026-09-24T14-49-37-737Z-f1b85664/stack/receipt.json`.
- All 31 unit-test tasks passed, including 3,537 Gamepiece tests.
- The complete ten-stage `pnpm check` passed on final head `b6608674378b98d0faa5eb9f7df3f0c081351345` in 5m 7.1s.
- Installed-cohort integration: `build/verification/2026-09-24T15-18-33-044Z-ab3993d4/integration/receipt.json` passed in 62.0s. It includes real npm installation, authored TypeScript/Vitest and deliberate type-error rejection, Tailwind, both browser engines, persistence/restore/reset, owned backend stack and the real iframe host.

The exact installed cohort is SDK `0.5.0-alpha.3`, browser runtime
`0.1.0-alpha.2`, and dev-host `0.2.0-alpha.2`. Gamepiece's focused Chromium and
WebKit tests pass for saved-game restoration, seat switching, terminal reload,
embedded card assets and exclusion of a second tab. Chromium uses actual browser
offline emulation. WebKit blocks non-navigation HTTP(S) and requires every later
navigation response to come from the service worker, because its offline
emulation rejects navigation before service-worker handling.

The focused Gamepiece run completed both browser cases in 6.8s. The final
aggregate check includes the consumer CSS declaration and browser-lane fixes
found during integration. There are no remaining implementation slices in the
accepted delivery checklist.

## Deployment boundary

This delivery changes source, published packages, and their consumers. It does
not deploy staging or production infrastructure. Registry build/install checks
and the manual Pages workflow are prepared; enabling Pages and configuring
`registry.dreamboard.games` remain the separate operator milestone described in
[registry hosting](../docs/registry-hosting.md).

Animation remains optional, owned by app or copied registry source. The SDK does
not promise that external-store mutations become React transitions.

// Private workspace entry point for @dreamboard-games/reducer-contract.
//
// SDK internals must import from THIS root entry (not the sub-entries):
// the SDK bundles this package's declarations into its published .d.ts, and
// the declaration bundler can only resolve the package root (its `types`
// field), not `exports`-map subpaths. Subpath imports would leak private
// package specifiers into the published SDK tarball — caught by
// scripts/assert-sdk-tarball-self-contained.mjs.
//
// The sub-entries ("./wire", "./zod", "./builders", "./bundle", "./version",
// "./fixtures") remain for this package's own tests and tooling.
//
// Public consumers should use @dreamboard-games/sdk/reducer-contract.
export * as Wire from "../generated/wire";
export * as Zod from "../generated/zod";
export * as Builders from "../generated/builders";
export { REDUCER_CONTRACT_VERSION } from "../generated/version";
export type { MaybePromise, ReducerBundleContract } from "./bundle";

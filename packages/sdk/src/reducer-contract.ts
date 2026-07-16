/**
 * Public reducer-bundle ABI surface: the wire-contract version, the erased
 * `ReducerBundleContract` boundary and runtime assertion, wire DTO types, their
 * Zod schemas, and the manifest-table materializer hosts use to seed a session.
 *
 * Imports stay on the private packages' ROOT entries so the declaration
 * bundler can inline them into the published .d.ts (subpath exports are not
 * resolvable by the dts bundler).
 */
export {
  assertReducerBundleContract,
  REDUCER_CONTRACT_VERSION,
} from "@dreamboard-games/reducer-contract";
export type {
  MaybePromise,
  ReducerBundleContract,
  Wire as ReducerWire,
} from "@dreamboard-games/reducer-contract";
export { Zod as ReducerWireZod } from "@dreamboard-games/reducer-contract";
export { materializeManifestTable } from "@dreamboard-games/workspace-codegen";

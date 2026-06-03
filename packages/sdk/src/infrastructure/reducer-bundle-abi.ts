export { REDUCER_CONTRACT_VERSION } from "../generated/reducer-contract/version.js";
export type {
  MaybePromise,
  ReducerBundleContract,
} from "./reducer-contract/bundle.js";
export { materializeManifestTable } from "./workspace-codegen/index.js";
export type * as ReducerWire from "../generated/reducer-contract/wire.js";
export * as ReducerWireZod from "../generated/reducer-contract/zod.js";

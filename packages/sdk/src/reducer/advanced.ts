/**
 * Advanced type-extraction and infrastructure surface.
 *
 * Everything here is consumed by generated workspace files and SDK-internal
 * code. Authored game code should not need these names -- prefer the
 * workspace's generated `manifest-contract` types and the bound authoring
 * object from `createContractAuthoring`. This subpath has weaker stability
 * guarantees than `/reducer`: names may move or change between minor
 * releases alongside codegen updates, because its consumers regenerate.
 */

export * from "./model";
export {
  createClientParamSchemasByPhase,
  type ClientParamSchema,
  type ClientParamSchemasByPhase,
} from "./client-param-schemas";
export { applySetupBootstrap } from "./setup-bootstrap";
export {
  dealToPlayerBoardContainer,
  dealToPlayerZone,
  seedSharedBoardContainer,
  seedSharedBoardSpace,
  shuffle,
} from "./setup-bootstrap-helpers";

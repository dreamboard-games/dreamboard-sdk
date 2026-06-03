// Private workspace entry point for @dreamboard-games/reducer-contract.
//
// SDK internals should import from the specific sub-entry that matches their need:
//   - "@dreamboard-games/reducer-contract/wire"     — TS types only
//   - "@dreamboard-games/reducer-contract/zod"      — runtime validators
//   - "@dreamboard-games/reducer-contract/builders" — typed effect constructors
//   - "@dreamboard-games/reducer-contract/bundle"   — erased callable bundle boundary
//   - "@dreamboard-games/reducer-contract/version"  — protocol version constant
//   - "@dreamboard-games/reducer-contract/fixtures" — canonical wire fixtures for tests
//
// Public consumers should use @dreamboard-games/sdk/infrastructure/reducer-bundle-abi.
//
// Keep the callable reducer bundle boundary on the dedicated `./bundle`
// sub-entry so SDK internals converge on one explicit import path.
export * as Wire from "../generated/wire";
export * as Zod from "../generated/zod";
export * as Builders from "../generated/builders";
export { REDUCER_CONTRACT_VERSION } from "../generated/version";

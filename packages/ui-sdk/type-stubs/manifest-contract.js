/**
 * manifest-contract.ts - Dynamically generated types
 *
 * This file will be generated based on the game's topology manifest.
 * The ui-sdk references these types but does not bundle them.
 *
 * Note: Shared card collection types such as ViewCard and CardCollection live in
 * @dreamboard-games/sdk-types, not in this generated manifest contract.
 */
export const AllActivePlayerStateNames = [];
export const ActionsByPhase = {};
export const boardHelpers = {
    boardIdsForLayout: ((_) => []),
    boardBaseIdsForLayout: ((_) => []),
    boardIdsForBase: ((_) => []),
    boardBaseIdsForTemplate: ((_) => []),
    boardIdsForType: ((_) => []),
    boardLayout: ((_) => "generic"),
    boardTemplateLayout: ((_) => "generic"),
    spaceIds: ((_) => []),
    spaceKinds: ((_) => ({})),
    spaceIdsForType: ((_) => []),
    containerIds: ((_) => []),
    containerHost: ((_, __) => ({ type: "board" })),
    relationTypeIds: ((_) => []),
    edgeIdsForType: ((_) => []),
    edgeIds: ((_, __) => []),
    authoredHexEdges: ((_) => []),
    resolveHexEdgeId: ((_, __) => ""),
    vertexIdsForType: ((_) => []),
    vertexIds: ((_, __) => []),
    authoredHexVertices: ((_) => []),
    resolveHexVertexId: ((_, __) => ""),
    boardRefForPlayer: ((baseId, seat) => ({ baseId, seat })),
    sharedBoardRef: ((baseId) => ({ baseId })),
};
export function createInitialTable(_options) {
    return {};
}
export function setupProfiles(profiles) {
    return profiles;
}
export function shuffle(container) {
    return {
        type: "shuffle",
        container,
    };
}
export function dealToPlayerZone(options) {
    return {
        type: "deal",
        ...options,
    };
}
export function dealToPlayerBoardContainer(options) {
    return {
        type: "deal",
        ...options,
    };
}
export function seedSharedBoardContainer(options) {
    return {
        type: "move",
        ...options,
    };
}
export function seedSharedBoardSpace(options) {
    return {
        type: "move",
        ...options,
    };
}

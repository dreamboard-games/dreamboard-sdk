import type {
  CardIdOfManifest,
  DieIdOfManifest,
  ReducerManifestContractLike,
  PieceIdOfManifest,
  PlayerIdOfManifest,
  SetupBootstrapContainerRef,
  SetupBootstrapPerPlayerContainerTemplateRef,
  SetupBootstrapStep,
  SetupBootstrapDestinationRef,
} from "./model";

export function shuffle<
  Manifest extends ReducerManifestContractLike = ReducerManifestContractLike,
>(
  container: SetupBootstrapContainerRef<Manifest>,
): SetupBootstrapStep<Manifest> {
  return {
    type: "shuffle",
    container,
  };
}

export function dealToPlayerZone<
  Manifest extends ReducerManifestContractLike = ReducerManifestContractLike,
>({
  from,
  zoneId,
  count,
  playerIds,
}: {
  from: Extract<
    SetupBootstrapContainerRef<Manifest>,
    { type: "sharedZone" | "sharedBoardContainer" }
  >;
  zoneId: Extract<
    SetupBootstrapPerPlayerContainerTemplateRef<Manifest>,
    { type: "playerZone" }
  >["zoneId"];
  count: number;
  playerIds?: readonly PlayerIdOfManifest<Manifest>[];
}): SetupBootstrapStep<Manifest> {
  return {
    type: "deal",
    from,
    to: {
      type: "playerZone",
      zoneId,
    } as SetupBootstrapPerPlayerContainerTemplateRef<Manifest>,
    count,
    playerIds,
  };
}

export function dealToPlayerBoardContainer<
  Manifest extends ReducerManifestContractLike = ReducerManifestContractLike,
>({
  from,
  boardId,
  containerId,
  count,
  playerIds,
}: {
  from: Extract<
    SetupBootstrapContainerRef<Manifest>,
    { type: "sharedZone" | "sharedBoardContainer" }
  >;
  boardId: Extract<
    SetupBootstrapPerPlayerContainerTemplateRef<Manifest>,
    { type: "playerBoardContainer" }
  >["boardId"];
  containerId: Extract<
    SetupBootstrapPerPlayerContainerTemplateRef<Manifest>,
    { type: "playerBoardContainer" }
  >["containerId"];
  count: number;
  playerIds?: readonly PlayerIdOfManifest<Manifest>[];
}): SetupBootstrapStep<Manifest> {
  return {
    type: "deal",
    from,
    to: {
      type: "playerBoardContainer",
      boardId,
      containerId,
    } as SetupBootstrapPerPlayerContainerTemplateRef<Manifest>,
    count,
    playerIds,
  };
}

export function seedSharedBoardContainer<
  Manifest extends ReducerManifestContractLike = ReducerManifestContractLike,
>({
  from,
  boardId,
  containerId,
  count,
  componentIds,
}: {
  from: SetupBootstrapContainerRef<Manifest>;
  boardId: Extract<
    SetupBootstrapDestinationRef<Manifest>,
    { type: "sharedBoardContainer" }
  >["boardId"];
  containerId: Extract<
    SetupBootstrapDestinationRef<Manifest>,
    { type: "sharedBoardContainer" }
  >["containerId"];
  count?: number;
  componentIds?: readonly (
    | CardIdOfManifest<Manifest>
    | PieceIdOfManifest<Manifest>
    | DieIdOfManifest<Manifest>
  )[];
}): SetupBootstrapStep<Manifest> {
  return {
    type: "move",
    from,
    to: {
      type: "sharedBoardContainer",
      boardId,
      containerId,
    } as SetupBootstrapDestinationRef<Manifest>,
    count,
    componentIds,
  };
}

export function seedSharedBoardSpace<
  Manifest extends ReducerManifestContractLike = ReducerManifestContractLike,
>({
  from,
  boardId,
  spaceId,
  count,
  componentIds,
}: {
  from: SetupBootstrapContainerRef<Manifest>;
  boardId: Extract<
    SetupBootstrapDestinationRef<Manifest>,
    { type: "sharedBoardSpace" }
  >["boardId"];
  spaceId: Extract<
    SetupBootstrapDestinationRef<Manifest>,
    { type: "sharedBoardSpace" }
  >["spaceId"];
  count?: number;
  componentIds?: readonly (
    | CardIdOfManifest<Manifest>
    | PieceIdOfManifest<Manifest>
    | DieIdOfManifest<Manifest>
  )[];
}): SetupBootstrapStep<Manifest> {
  return {
    type: "move",
    from,
    to: {
      type: "sharedBoardSpace",
      boardId,
      spaceId,
    } as SetupBootstrapDestinationRef<Manifest>,
    count,
    componentIds,
  };
}

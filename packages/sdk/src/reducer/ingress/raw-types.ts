import type * as Wire from "../../generated/reducer-contract/wire";
import type {
  ManifestContract,
  PlayerIdOfState,
  ReducerSessionForConfig,
  ReducerStateForConfig,
  RuntimeSetupSelection,
  RuntimeTableRecord,
  SchemaLike,
} from "../model";

export type RawReducerFlowState = Wire.ReducerFlowState;
export type RawReducerRuntimeState = Wire.ReducerRuntimeState;
export type RawReducerSessionState = Wire.ReducerSessionState;
export type RawRuntimeInput = Wire.GameInput;

export type IngressRuntimeCodec<
  Table extends RuntimeTableRecord,
  Manifest extends ManifestContract<Table>,
  PublicSchema extends SchemaLike<object>,
  PrivateSchema extends SchemaLike<object>,
  HiddenSchema extends SchemaLike<object>,
  PhaseName extends string,
> = {
  defaultRuntimeState: (
    seed?: number | null,
    setup?: RuntimeSetupSelection<Manifest> | null,
  ) => ReducerSessionForConfig<
    Table,
    PublicSchema,
    PrivateSchema,
    HiddenSchema,
    PhaseName,
    RuntimeSetupSelection<Manifest>
  >["runtime"];
  parseInitialTable: (
    rawTable: ReducerStateForConfig<
      Table,
      PublicSchema,
      PrivateSchema,
      HiddenSchema,
      PhaseName
    >["table"],
    playerIds?: readonly string[],
  ) => {
    playerIds: PlayerIdOfState<
      ReducerStateForConfig<
        Table,
        PublicSchema,
        PrivateSchema,
        HiddenSchema,
        PhaseName
      >
    >[];
    table: ReducerStateForConfig<
      Table,
      PublicSchema,
      PrivateSchema,
      HiddenSchema,
      PhaseName
    >["table"];
  };
  parseState: (
    rawState: RawReducerSessionState,
  ) => ReducerSessionForConfig<
    Table,
    PublicSchema,
    PrivateSchema,
    HiddenSchema,
    PhaseName
  >;
  serializeState: (
    state: ReducerSessionForConfig<
      Table,
      PublicSchema,
      PrivateSchema,
      HiddenSchema,
      PhaseName
    >,
  ) => RawReducerSessionState;
  parsePlayerId: (
    rawPlayerId: string,
  ) => PlayerIdOfState<
    ReducerStateForConfig<
      Table,
      PublicSchema,
      PrivateSchema,
      HiddenSchema,
      PhaseName
    >
  >;
  /**
   * Validate the raw wire input against the unified `interaction` schema.
   * Returns the schema-validated shape unchanged; downstream layers (the
   * ingress bundle) are responsible for routing it onto the engine-internal
   * action/continuation discriminator.
   */
  parseInput: (rawInput: RawRuntimeInput) => RawRuntimeInput;
};

export type UntrustedRuntimeTable = RuntimeTableRecord;
export type UntrustedReducerSessionState = RawReducerSessionState;
export type UntrustedRuntimeInput = RawRuntimeInput;
export type DecodedReducerSession<State> = {
  state: State;
  template?: UntrustedRuntimeTable;
};

import type {
  DieTypeSpec as ApiDieTypeSpec,
  GameTopologyManifest as ApiGameTopologyManifest,
} from "./contracts.js";
export type DieTypeSpec = Omit<ApiDieTypeSpec, "sides"> & {
  sides?: ApiDieTypeSpec["sides"];
};
export type GameTopologyManifest = Omit<ApiGameTopologyManifest, "dieTypes"> & {
  dieTypes?: Array<DieTypeSpec>;
};

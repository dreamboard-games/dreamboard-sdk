export const requiredWorkbenchScenarioIds = Object.freeze([
  "hearts.pass-three.mobile",
  "hex-network-trading.place-route.desktop",
  "worker-placement-tableau.place-worker.desktop",
]);

export const requiredParityScenarioIds = Object.freeze([
  "hearts.pass-three.mobile",
]);

export const requiredReferenceGameIds = Object.freeze([
  ...new Set(requiredWorkbenchScenarioIds.map((id) => id.split(".")[0])),
]);

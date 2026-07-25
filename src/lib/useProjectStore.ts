import { useSyncExternalStore } from "react";
import { projectStore } from "./projectStore";

export function useProjectStore() {
  return useSyncExternalStore(
    (cb) => projectStore.subscribe(cb),
    () => projectStore.getRules(),
  );
}

export function useProjectFlowStatus() {
  return useSyncExternalStore(
    (cb) => projectStore.subscribe(cb),
    () => projectStore.getFlowStatus(),
  );
}

export function useProjectClusters() {
  return useSyncExternalStore(
    (cb) => projectStore.subscribe(cb),
    () => projectStore.getClusters(),
  );
}

export function useProjectFeatures() {
  return useSyncExternalStore(
    (cb) => projectStore.subscribe(cb),
    () => projectStore.getFeatures(),
  );
}

export function useProjectStats() {
  return useSyncExternalStore(
    (cb) => projectStore.subscribe(cb),
    () => projectStore.getStats(),
  );
}

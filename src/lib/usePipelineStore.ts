import { useSyncExternalStore } from "react";
import { pipelineStore } from "./pipelineStore";

export function usePipelineStore() {
  return useSyncExternalStore(
    pipelineStore.subscribe,
    () => pipelineStore.list(),
    () => pipelineStore.list(),
  );
}

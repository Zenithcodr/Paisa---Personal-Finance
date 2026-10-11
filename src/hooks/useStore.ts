import { useSyncExternalStore } from "react";
import { subscribe, getState } from "../core/store";
import { selectDerived } from "../core/selectors";
import type { AppState } from "../types/state";
import type { DerivedMetrics } from "../types/metrics";

/**
 * Bridges the framework-free reactive store into React. Any store mutation
 * replaces state with a new object, so React re-renders every subscriber.
 */
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

/** Pure derived metrics for the current state (recomputed each render). */
export function useDerived(): DerivedMetrics {
  return selectDerived(useAppState());
}

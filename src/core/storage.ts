import { makeInitialState } from "./seed";
import { APP_VERSION } from "./constants";
import type { AppState } from "../types/state";

const KEY = "paisa_state_v1";

export function isValidAppState(data: unknown): data is AppState {
  if (!data || typeof data !== "object") return false;
  const d = data as Partial<AppState>;
  if (d.version !== APP_VERSION) return false;
  if (typeof d.day !== "number" || d.day < 1 || d.day > 30) return false;
  if (typeof d.budget !== "number" || d.budget <= 0) return false;
  if (typeof d.allowanceBuffer !== "number") return false;
  if (!Array.isArray(d.transactions)) return false;
  if (!Array.isArray(d.subscriptions)) return false;
  if (!Array.isArray(d.commitments)) return false;
  if (!Array.isArray(d.goals)) return false;
  if (!Array.isArray(d.unexpected)) return false;
  if (!Array.isArray(d.debts)) return false;
  if (!d.income || typeof d.income !== "object") return false;
  if (!Array.isArray(d.income.recurring) || !Array.isArray(d.income.oneTime)) return false;
  if (!d.appliedLog || typeof d.appliedLog !== "object") return false;
  return true;
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return makeInitialState();
    const parsed: unknown = JSON.parse(raw);
    if (isValidAppState(parsed)) {
      return parsed;
    }
    return makeInitialState();
  } catch {
    return makeInitialState();
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // quota exceeded or private mode
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

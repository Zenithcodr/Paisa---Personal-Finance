import { makeInitialState } from "./seed.js";
import { APP_VERSION } from "./constants.js";

const KEY = "paisa_state_v1";

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return makeInitialState();
    const data = JSON.parse(raw);
    if (!data || data.version !== APP_VERSION) return makeInitialState();
    return data;
  } catch {
    return makeInitialState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

export function clearState() {
  try { localStorage.removeItem(KEY); } catch {}
}

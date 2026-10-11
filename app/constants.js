export const BUDGET = 10000;
export const PERIOD_DAYS = 30;
export const APP_VERSION = "1";

export function uid() {
  return "id_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function inr(n) {
  if (!Number.isFinite(n)) n = 0;
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n));
  return sign + "₹" + abs.toLocaleString("en-IN");
}

export function inrPlain(n) {
  if (!Number.isFinite(n)) n = 0;
  return Math.round(n).toLocaleString("en-IN");
}

export function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

export function safeDiv(a, b) {
  if (!b) return 0;
  return a / b;
}

export function today() { return new Date(); }

export function formatDayShort(d) { return "Day " + d; }

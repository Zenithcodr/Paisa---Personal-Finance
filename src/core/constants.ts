import type { Category } from "../types/state";

export const BUDGET = 10000;
export const PERIOD_DAYS = 30;
export const APP_VERSION = "1";

export const CATEGORY_ICONS: Record<Category, string> = {
  Food: "🍜",
  Transport: "🚌",
  Shopping: "🛍️",
  Entertainment: "🎬",
  Bills: "🧾",
  Health: "💊",
  Misc: "✨",
  Income: "💰",
  Subscriptions: "📺",
  Savings: "🎯",
  Loan: "💳",
  Unexpected: "⚡"
};

export function uid(): string {
  return "id_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function inr(n: number): string {
  if (!Number.isFinite(n)) n = 0;
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n));
  return sign + "₹" + abs.toLocaleString("en-IN");
}

export function inrPlain(n: number): string {
  if (!Number.isFinite(n)) n = 0;
  return Math.round(n).toLocaleString("en-IN");
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function safeDiv(a: number, b: number): number {
  if (!b) return 0;
  return a / b;
}

export function formatDayShort(d: number): string {
  return "Day " + d;
}

export function escapeHtml(s: string | number | null | undefined): string {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[c] || c
  );
}

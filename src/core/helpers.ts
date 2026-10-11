import { selectDerived } from "./selectors";
import { PERIOD_DAYS } from "./constants";
import type { AppState } from "../types/state";

export function categorySpending(state: AppState): Record<string, number> {
  const map: Record<string, number> = {};
  for (const t of state.transactions) {
    if (t.amount <= 0 || t.category === "Savings") continue;
    const cur = map[t.category] ?? 0;
    map[t.category] = cur + t.amount;
  }
  return map;
}

export function dailySpend(state: AppState): number[] {
  const arr = new Array<number>(30).fill(0);
  for (const t of state.transactions) {
    if (t.amount <= 0 || t.category === "Savings") continue;
    if (t.day >= 1 && t.day <= 30) {
      const idx = t.day - 1;
      const cur = arr[idx] ?? 0;
      arr[idx] = cur + t.amount;
    }
  }
  return arr;
}

export function buildCategoryLegend(map: Record<string, number>): Array<[string, number]> {
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

export function historicalBalance(state: AppState): number[] {
  const arr = new Array<number>(PERIOD_DAYS + 1).fill(0);
  const touched = new Array<boolean>(PERIOD_DAYS + 1).fill(false);
  arr[0] = state.budget;
  touched[0] = true;
  const sorted = state.transactions.slice().sort((a, b) => {
    return a.day !== b.day ? a.day - b.day : (a.ts || 0) - (b.ts || 0);
  });
  let bal = state.budget;
  for (const t of sorted) {
    if (t.day < 1 || t.day > state.day) continue;
    bal -= t.amount;
    arr[t.day] = bal;
    touched[t.day] = true;
  }
  let lastBal = state.budget;
  for (let d = 1; d <= state.day; d++) {
    if (!touched[d]) {
      arr[d] = lastBal;
    } else {
      lastBal = arr[d] ?? lastBal;
    }
  }
  return arr;
}

export function forecastBands(state: AppState): {
  expectedLine: number[];
  bestLine: number[];
  worstLine: number[];
} {
  const probe = buildLineWithDrift(state, 0);
  const lastVal = probe[probe.length - 1] ?? 0;
  const dayVal = probe[state.day] ?? 0;
  const lastDelta = lastVal - dayVal;
  const sign = lastDelta >= 0 ? 1 : -1;
  return {
    expectedLine: expectedTrajectory(state),
    bestLine: buildLineWithDrift(state, sign * 0.2),
    worstLine: buildLineWithDrift(state, -sign * 0.2)
  };
}

function buildLineWithDrift(state: AppState, drift: number): number[] {
  const arr = new Array<number>(PERIOD_DAYS + 1).fill(0);
  const startBalance =
    state.budget +
    state.transactions.filter((t) => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0) -
    state.transactions
      .filter((t) => t.amount > 0 && t.category !== "Savings")
      .reduce((a, t) => a + t.amount, 0);
  arr[state.day] = startBalance;
  const sim = structuredClone(state);
  const d = selectDerived(sim);
  const dailyNet = d.dailyAllowance - d.expectedSpendPerDay;
  let bal = startBalance;
  for (let i = state.day + 1; i <= PERIOD_DAYS; i++) {
    bal += dailyNet * (1 + drift);
    arr[i] = bal;
  }
  for (let i = 1; i < state.day; i++) {
    arr[i] = state.budget - (state.budget - startBalance) * (i / state.day);
  }
  if (state.day === 1) arr[1] = startBalance;
  return arr;
}

export function expectedTrajectory(state: AppState): number[] {
  const arr = new Array<number>(PERIOD_DAYS + 1).fill(0);
  const sim = structuredClone(state);
  const startBalance =
    sim.budget +
    sim.transactions.filter((t) => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0) -
    sim.transactions
      .filter((t) => t.amount > 0 && t.category !== "Savings")
      .reduce((a, t) => a + t.amount, 0);
  arr[sim.day] = startBalance;
  const d = selectDerived(sim);
  const dailyNet = d.dailyAllowance - d.expectedSpendPerDay;
  let bal = startBalance;
  for (let i = sim.day + 1; i <= PERIOD_DAYS; i++) {
    bal += dailyNet;
    arr[i] = bal;
  }
  for (let i = 1; i < sim.day; i++) {
    arr[i] = sim.budget - (sim.budget - startBalance) * (i / sim.day);
  }
  if (sim.day === 1) arr[1] = startBalance;
  return arr;
}
